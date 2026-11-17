"""Construit le paquet de contenu de l'application : public/content/pack.json + audio.

Étapes : chargement et validation structurelle → gradation du vocabulaire → rythme →
composition des unités → accentuation (OpenRussian) → transcription → audio (Piper,
Lingua Libre pour les exceptions) → écriture du paquet versionné.

Usage :
  python -I -X utf8 tools/build_content.py            # build complet
  python -I -X utf8 tools/build_content.py --no-audio # validation + paquet, sans synthèse
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterator

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I n'ajoute pas le dossier du script

import yaml  # noqa: E402

from shag import text as T  # noqa: E402
from shag.grading import check_program, item_lemmas, lemmas, pace_report  # noqa: E402
from shag.model import ContentError, Item, Program, load_program  # noqa: E402
from shag.paths import AUDIO_OUT, CONTENT, PUBLIC_CONTENT  # noqa: E402
from shag.stress import Problem, accentuate, load_dictionary  # noqa: E402
from shag.translit import transliterate  # noqa: E402
from shag.units import build_units  # noqa: E402

TRANSLIT_LAST_DAY = 30
CYRILLIC = re.compile(r"[А-Яа-яЁё]")
NO_ACCENT_KEYS = {"id", "items", "letters", "translit", "from", "type", "t", "mode", "audio"}
CREDITS = [
    {"name": "OpenRussian", "url": "https://en.openrussian.org", "license": "CC BY-SA 4.0",
     "use": "dictionnaire et accents toniques"},
    {"name": "Tatoeba", "url": "https://tatoeba.org", "license": "CC BY 2.0 FR", "use": "phrases d'exemple"},
    {"name": "Piper (voix ru_RU-irina)", "url": "https://github.com/rhasspy/piper", "license": "MIT / voix libre",
     "use": "synthèse vocale"},
    {"name": "Noto Sans", "url": "https://fonts.google.com/noto", "license": "SIL Open Font License",
     "use": "police"},
]


class BuildError(Exception):
    pass


# --- accentuation -------------------------------------------------------------------------

def accent_tree(node: Any, d, problems: list[tuple[str, Problem]], where: str = "") -> Any:
    """Accentue toutes les chaînes contenant du cyrillique dans une structure JSON."""
    if isinstance(node, dict):
        # « items » est à la fois le dictionnaire des éléments (à accentuer) et, dans un jour,
        # une liste d'identifiants (à laisser tel quel).
        return {k: (v if k in NO_ACCENT_KEYS and not isinstance(v, dict)
                    else accent_tree(v, d, problems, f"{where}.{k}"))
                for k, v in node.items()}
    if isinstance(node, list):
        return [accent_tree(v, d, problems, f"{where}[{i}]") for i, v in enumerate(node)]
    if isinstance(node, str) and CYRILLIC.search(node):
        out, probs = accentuate(node, d)
        problems.extend((where, p) for p in probs)
        return out
    return node


# --- textes à sonoriser --------------------------------------------------------------------

def audio_texts(pack: dict) -> Iterator[str]:
    for it in pack["items"].values():
        if it["kind"] != "letter":
            yield it["ru"]
        if it.get("example"):
            yield it["example"]["ru"]
    for day in pack["days"]:
        for m in (day.get("dialogue") or {}).get("messages", []):
            yield m["ru"]
        grammar = day.get("grammar") or {}
        for ex in grammar.get("examples", []):
            yield ex["ru"]
        exercises = list(grammar.get("exercises", []))
        for u in day["units"]:
            exercises += u.get("exercises", [])
        for ex in exercises:
            yield from exercise_audio(ex)


def exercise_audio(ex: dict) -> Iterator[str]:
    t = ex["t"]
    if t == "cloze":
        yield ex["ru"].replace("___", ex["answers"][0])
    elif ex.get("ru"):
        yield ex["ru"]
    if t == "translate":
        yield ex["answers"][0]
    if t == "reply":
        for m in ex["thread"]:
            yield m["ru"]
        yield ex["options"][ex["answer"]]
    if t == "listen" and ex.get("mode") == "pick":
        yield from ex["options"]


# --- éléments ------------------------------------------------------------------------------

def make_cloze(item_ru: str, example: str) -> dict | None:
    """Phrase à trou pour la production en contexte : le mot de l'élément est masqué."""
    target = item_lemmas(Item(id="_", day=0, kind="word", ru=T.strip_accents(item_ru), fr=""))
    for m in T.tokens(example):
        if lemmas(m.group(0)) & target:
            return {"ru": example[: m.start()] + "___" + example[m.end():], "answer": m.group(0)}
    return None


def item_json(it: Item) -> dict:
    out: dict[str, Any] = {"id": it.id, "day": it.day, "kind": it.kind, "ru": it.ru, "fr": it.fr}
    for key in ("note", "sound", "hint", "warning"):
        if getattr(it, key):
            out[key] = getattr(it, key)
    if it.answers:
        out["answers"] = it.answers
    if it.example_ru:
        out["example"] = {"ru": it.example_ru, "fr": it.example_fr}
    if it.translit:
        out["translit"] = it.translit
    return out


# --- paquet --------------------------------------------------------------------------------

def build_pack(program: Program) -> tuple[dict, list[tuple[str, Problem]]]:
    items: dict[str, dict] = {}
    days_out = []
    known: list[Item] = []
    for n in sorted(program.days):
        day = program.days[n]
        plan = program.plans[n]
        known += day.letters + day.items
        for it in day.letters + day.items:
            items[it.id] = item_json(it)
        raw = day.raw
        entry: dict[str, Any] = {
            "day": n, "phase": program.phase_of(n).id, "theme": plan.theme, "kind": plan.kind,
            "items": [it.id for it in day.items], "letters": [it.id for it in day.letters],
        }
        if raw.get("dialogue"):
            entry["dialogue"] = {"messages": [
                {"from": m["from"], "ru": m["ru"], "fr": m["fr"]} for m in raw["dialogue"]["messages"]]}
        if raw.get("grammar"):
            g = raw["grammar"]
            entry["grammar"] = {
                "title": g["title"], "explanation": g["explanation"].strip(),
                "examples": [{"ru": e["ru"], "fr": e["fr"]} for e in g.get("examples", [])],
                "exercises": [{"t": e["type"], **{k: v for k, v in e.items() if k != "type"}}
                              for e in g.get("exercises", [])],
            }
        entry["units"] = build_units(program, day, known)
        days_out.append(entry)

    pack = {
        "phases": [{"id": p.id, "title": p.title, "goals": p.goals, "firstDay": p.first_day,
                    "lastDay": p.last_day} for p in program.phases],
        "plan": [{"day": p.day, "theme": p.theme, "kind": p.kind} for p in program.plans.values()],
        "characters": {cid: {"name": c["name"]} for cid, c in program.characters.items()},
        "lastDay": program.last_day,
        "items": items,
        "days": days_out,
    }
    problems: list[tuple[str, Problem]] = []
    d = load_dictionary()
    pack = accent_tree(pack, d, problems)
    pack["characters"] = {cid: {"name": c["name"]} for cid, c in program.characters.items()}

    for it in pack["items"].values():
        if it["kind"] != "letter" and it.get("example") and not it.get("answers"):
            cloze = make_cloze(it["ru"].split(" / ")[0], it["example"]["ru"])
            if cloze:
                it["cloze"] = cloze
        if it["day"] <= TRANSLIT_LAST_DAY and it["kind"] != "letter" and "translit" not in it:
            it["translit"] = transliterate(it["ru"])
        if it["kind"] == "letter" and it.get("example") and "translit" not in it:
            it["example"]["translit"] = transliterate(it["example"]["ru"])
    return pack, problems


def load_exceptions() -> set[str]:
    path = CONTENT / "audio_exceptions.yaml"
    if not path.exists():
        return set()
    return {T.key(w) for w in (yaml.safe_load(path.read_text(encoding="utf-8")) or [])}


def generate_audio(pack: dict, enabled: bool) -> tuple[dict[str, str], list[dict], int]:
    from shag.tts import audio_name, synthesize

    exceptions = load_exceptions()
    audio: dict[str, str] = {}
    credits: list[dict] = []
    created = 0
    texts = list(dict.fromkeys(audio_texts(pack)))
    for i, text in enumerate(texts):
        k = T.key(text)
        if k in exceptions and len(T.words(text)) == 1:
            from shag.lingualibre import fetch_as_opus, find_recording

            rec = find_recording(text)
            if rec is None:
                raise BuildError(f"exception audio « {text} » : aucun enregistrement Lingua Libre trouvé")
            name = "ll-" + audio_name(text, "lingualibre")
            if enabled:
                fetch_as_opus(rec, name)
            credits.append({"name": f"Lingua Libre — {rec.author}", "url": "https://commons.wikimedia.org/wiki/"
                            + rec.file_title.replace(" ", "_"), "license": rec.license, "use": f"prononciation de « {text} »"})
            audio[text] = name
            continue
        if enabled:
            name, new = synthesize(text)
            created += new
            if new and created % 25 == 0:
                print(f"  audio : {i + 1}/{len(texts)}", flush=True)
        else:
            name = audio_name(text)
        audio[text] = name
    return audio, credits, created


def audio_by_phase(pack: dict, audio: dict[str, str]) -> dict[str, list[str]]:
    """Fichiers audio de chaque phase, pour la mise en cache progressive (phase courante + suivante)."""
    out: dict[str, set[str]] = {}
    by_day: dict[int, set[str]] = {}
    for it in pack["items"].values():
        texts = [it["ru"]] + ([it["example"]["ru"]] if it.get("example") else [])
        by_day.setdefault(it["day"], set()).update(audio[t] for t in texts if t in audio)
    for day in pack["days"]:
        sub = {**pack, "items": {}, "days": [day]}
        by_day.setdefault(day["day"], set()).update(audio[t] for t in audio_texts(sub) if t in audio)
        out.setdefault(str(day["phase"]), set()).update(by_day[day["day"]])
    return {k: sorted(v) for k, v in out.items()}


def main() -> int:
    parser = argparse.ArgumentParser(description="Construit public/content/pack.json")
    parser.add_argument("--no-audio", action="store_true", help="ne pas synthétiser l'audio")
    args = parser.parse_args()

    try:
        program = load_program()
    except ContentError as e:
        print(f"ERREUR de structure : {e}")
        return 1
    print(f"{len(program.days)} jours publiés (dernier : {program.last_day}) sur {len(program.plans)}")

    violations = check_program(program)
    for v in violations:
        print(f"ERREUR de gradation : {v}")
    pace = pace_report(program)
    for w in pace:
        print(w)

    pack, problems = build_pack(program)
    for where, p in problems:
        detail = f" (choix : {' / '.join(p.options)})" if p.options else ""
        print(f"ERREUR d'accent : « {p.word} » {p.reason}{detail} — {where}")
    if violations or problems or any(w.startswith("ERREUR") for w in pace):
        print("Build interrompu. Voir content/README.md pour corriger.")
        return 1

    try:
        audio, ll_credits, created = generate_audio(pack, enabled=not args.no_audio)
    except (BuildError, FileNotFoundError) as e:
        print(f"ERREUR audio : {e}")
        return 1
    pack["audio"] = audio
    pack["audioByPhase"] = audio_by_phase(pack, audio)
    pack["credits"] = CREDITS + ll_credits

    body = json.dumps(pack, ensure_ascii=False, sort_keys=True)
    pack = {"version": hashlib.sha1(body.encode("utf-8")).hexdigest()[:12], **pack}
    PUBLIC_CONTENT.mkdir(parents=True, exist_ok=True)
    # write_bytes : pas de conversion des fins de ligne sous Windows
    (PUBLIC_CONTENT / "pack.json").write_bytes(json.dumps(pack, ensure_ascii=False, indent=1).encode("utf-8"))

    if not args.no_audio:
        used = set(audio.values())
        stale = [p for p in AUDIO_OUT.glob("*.opus") if p.name not in used]
        for p in stale:
            p.unlink()
        print(f"audio : {len(used)} fichiers ({created} nouveaux, {len(stale)} supprimés)")
    print(f"ok — paquet {pack['version']} : {len(pack['items'])} éléments, {len(pack['days'])} jours")
    return 0


if __name__ == "__main__":
    sys.exit(main())

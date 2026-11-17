"""Composition des unités de chaque jour et génération des exercices automatiques.

Gabarits (spec daily-plan, « Jour de programme composé d'unités ») :
- normal        : révision, nouveaux, leçon, révision, grammaire|fluidité, écoute 🔊, révision, écriture|oral
- consolidation : révision, fluidité, révision, écriture, écoute 🔊, révision, oral 🔊, fluidité
- alphabet      : révision, lettres, lecture, révision, écoute 🔊, clavier, révision, répétition 🔊
- survival      : révision, nouveaux, révision, écoute 🔊, écriture, révision, oral 🔊
- bilan         : révision, bilan, révision
Les textes russes renvoyés ici ne sont pas encore accentués (fait à l'étape suivante).
"""

from __future__ import annotations

import hashlib
import random
from typing import Any

from . import text as T
from .model import Day, Item, Program

AUDIO_UNITS = {"listen", "speak", "speak-words"}
MAX_PER_NEW_UNIT = 9


def _rng(*seed: Any) -> random.Random:
    return random.Random(hashlib.sha1(repr(seed).encode()).hexdigest())


def _distractors(pool: list[str], correct: str, n: int, seed: Any) -> tuple[list[str], int]:
    others = sorted({p for p in pool if p != correct})
    rng = _rng(seed)
    picks = rng.sample(others, min(n, len(others)))
    options = picks + [correct]
    rng.shuffle(options)
    return options, options.index(correct)


def _unit(kind: str, **payload: Any) -> dict:
    return {"type": kind, "audio": kind in AUDIO_UNITS, **payload}


def _messages(day: Day) -> list[dict]:
    return list((day.raw.get("dialogue") or {}).get("messages", []))


def _authored(day: Day, section: str) -> list[dict]:
    return [dict(e) for e in day.raw.get(section, [])]


def _earlier_dialogue_day(program: Program, day: int, back: int) -> int | None:
    candidates = [d for d in sorted(program.days) if d < day and _messages(program.days[d])]
    if not candidates:
        return None
    target = day - back
    before = [d for d in candidates if d <= target]
    return before[-1] if before else candidates[0]


def _listen_exercises(day: Day, known_fr: list[str]) -> list[dict]:
    msgs = _messages(day)
    pool = [m["fr"] for m in msgs] + known_fr
    out = []
    for i, m in enumerate(msgs[:5]):
        options, answer = _distractors(pool, m["fr"], 3, (day.day, "listen", i))
        out.append({"t": "listen", "mode": "meaning", "ru": m["ru"], "options": options, "answer": answer})
    for i, m in enumerate(msgs[:3]):
        out.append({"t": "shadow", "ru": m["ru"], "fr": m["fr"]})
    out += [_normalize(e) for e in _authored(day, "exercises") if e["type"] in {"listen", "shadow"}]
    return out


def _speak_exercises(day: Day) -> list[dict]:
    msgs = [m for m in _messages(day) if 1 <= len(T.words(m["ru"])) <= 7]
    out = [{"t": "speak", "ru": m["ru"], "fr": m["fr"]} for m in msgs[:5]]
    out += [_normalize(e) for e in _authored(day, "exercises") if e["type"] == "speak"]
    return out


def _write_exercises(day: Day) -> list[dict]:
    out = [_normalize(e) for e in _authored(day, "write")]
    for m in [m for m in _messages(day) if 3 <= len(T.words(m["ru"])) <= 7][:2]:
        out.append({"t": "order", "ru": m["ru"], "fr": m["fr"]})
    for it in day.items:
        if it.example_ru and len(out) < 10:
            out.append({"t": "translate", "fr": it.example_fr, "answers": [it.example_ru]})
    return out


def _normalize(ex: dict) -> dict:
    """Exercice rédigé (YAML) → forme du paquet (`t` au lieu de `type`)."""
    ex = dict(ex)
    out = {"t": ex.pop("type")}
    if out["t"] == "listen":
        out["mode"] = "choice"
    out.update(ex)
    return out


def build_units(program: Program, day: Day, known_items: list[Item]) -> list[dict]:
    plan = program.plans[day.day]
    kind = plan.kind
    review = _unit("review")
    known_fr = [it.fr for it in known_items if it.kind != "letter"]
    known_ru = [it.ru for it in known_items if it.kind != "letter"]
    first_day = day.day == 1

    def new_units() -> list[dict]:
        ids = [it.id for it in day.items]
        chunks = [ids[i : i + MAX_PER_NEW_UNIT] for i in range(0, len(ids), MAX_PER_NEW_UNIT)]
        return [_unit("new", items=c) for c in chunks]

    if kind == "alphabet":
        items = day.items
        read = []
        for i, it in enumerate(items):
            options, answer = _distractors(known_fr, it.fr, 3, (day.day, "read", i))
            read.append({"t": "read", "ru": it.ru, "options": options, "answer": answer})
        listen = []
        for i, it in enumerate(items):
            options, answer = _distractors(known_ru, it.ru, 3, (day.day, "pick", i))
            listen.append({"t": "listen", "mode": "pick", "ru": it.ru, "options": options, "answer": answer})
        listen += [_normalize(e) for e in _authored(day, "exercises") if e["type"] == "listen"]
        units = [review] if not first_day else []
        if day.letters:
            units.append(_unit("letters", letters=[l.id for l in day.letters]))
        if day.raw.get("grammar"):
            units.append(_unit("grammar"))
        if items:
            units.append(_unit("read", exercises=read))
        units += [] if first_day else [review]
        if listen:
            units.append(_unit("listen", exercises=listen))
        if items:
            units.append(_unit("keyboard", exercises=[{"t": "copy", "ru": it.ru, "fr": it.fr} for it in items]))
        units += [] if first_day else [review]
        if items:
            units.append(_unit("speak-words", exercises=[{"t": "speak", "ru": it.ru, "fr": it.fr} for it in items]))
        return units

    if kind == "bilan":
        phase0 = [it for it in known_items if it.kind != "letter" and it.day < day.day][:20]
        letters = [it.id for it in known_items if it.kind == "letter"]
        return [review, _unit("bilan", items=[it.id for it in phase0], letters=letters), review]

    if kind == "survival":
        return [review, *new_units(), review,
                _unit("listen", exercises=_listen_exercises(day, known_fr) or [
                    {"t": "listen", "mode": "pick", "ru": it.ru,
                     **dict(zip(("options", "answer"), _distractors(known_ru, it.ru, 3, (day.day, i))))}
                    for i, it in enumerate(day.items)]),
                _unit("write", exercises=_write_exercises(day)), review,
                _unit("speak", exercises=_speak_exercises(day) or [
                    {"t": "speak", "ru": it.ru, "fr": it.fr} for it in day.items])]

    if kind == "consolidation":
        a = _earlier_dialogue_day(program, day.day, 3)
        b = _earlier_dialogue_day(program, day.day, 6)
        sources = [program.days[d] for d in sorted({x for x in (a, b) if x})]
        write = [e for s in sources for e in _write_exercises(s)][:8]
        listen = [e for s in sources for e in _listen_exercises(s, known_fr)][:8]
        speak = [e for s in sources for e in _speak_exercises(s)][:6]
        return [review, _unit("fluency", dialogueDay=a), review, _unit("write", exercises=write),
                _unit("listen", exercises=listen), review, _unit("speak", exercises=speak),
                _unit("fluency", dialogueDay=b or a)]

    # jour normal
    slot5 = _unit("grammar") if plan.grammar_or_fluency == "grammar" else _unit(
        "fluency", dialogueDay=_earlier_dialogue_day(program, day.day, 7) or day.day)
    slot8 = _unit("write", exercises=_write_exercises(day)) if plan.write_or_speak == "write" else _unit(
        "speak", exercises=_speak_exercises(day))
    news = new_units()
    units = [review, *news, _unit("lesson"), review, slot5,
             _unit("listen", exercises=_listen_exercises(day, known_fr))]
    if len(news) < 2:
        units.append(review)
    units.append(slot8)
    return units

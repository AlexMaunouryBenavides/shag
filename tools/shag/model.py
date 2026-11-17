"""Chargement et validation structurelle des sources YAML du contenu."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from . import text as T
from .paths import CONTENT

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
DAY_KINDS = {"alphabet", "survival", "bilan", "normal", "consolidation"}
EXERCISE_TYPES = {"translate", "cloze", "order", "reply", "listen", "speak", "shadow"}
MAX_NEW_ITEMS = 12


class ContentError(Exception):
    pass


@dataclass
class Phase:
    id: int
    title: str
    goals: list[str]
    first_day: int
    last_day: int


@dataclass
class DayPlan:
    day: int
    theme: str
    kind: str
    grammar_or_fluency: str  # "grammar" | "fluency" (jours normaux)
    write_or_speak: str  # "write" | "speak" (jours normaux)


@dataclass
class Item:
    id: str
    day: int
    kind: str  # letter | word | phrase
    ru: str
    fr: str
    note: str | None = None
    answers: list[str] = field(default_factory=list)
    example_ru: str | None = None
    example_fr: str | None = None
    translit: str | None = None
    # lettres uniquement
    sound: str | None = None
    hint: str | None = None
    warning: str | None = None


@dataclass
class Day:
    day: int
    path: Path
    raw: dict[str, Any]
    items: list[Item]
    letters: list[Item]


@dataclass
class Program:
    phases: list[Phase]
    plans: dict[int, DayPlan]
    proper_nouns: list[str]
    characters: dict[str, dict[str, Any]]
    days: dict[int, Day]

    @property
    def last_day(self) -> int:
        return max(self.days) if self.days else 0

    def phase_of(self, day: int) -> Phase:
        return next(p for p in self.phases if p.first_day <= day <= p.last_day)


def _load_yaml(path: Path) -> Any:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        raise ContentError(f"{path.name} : YAML invalide — {e}") from e


def _require(obj: dict, key: str, where: str, typ: type | tuple = str) -> Any:
    if key not in obj or obj[key] in (None, ""):
        raise ContentError(f"{where} : champ « {key} » manquant")
    if not isinstance(obj[key], typ):
        raise ContentError(f"{where} : « {key} » doit être de type {typ}")
    return obj[key]


def _check_id(value: str, where: str) -> None:
    if not ID_RE.match(value):
        raise ContentError(f"{where} : identifiant invalide « {value} » (minuscules, chiffres, -)")


def load_program(root: Path = CONTENT) -> Program:
    prog = _load_yaml(root / "program.yaml") or {}
    phases = [
        Phase(p["id"], p["title"], list(p.get("goals", [])), p["days"][0], p["days"][1])
        for p in _require(prog, "phases", "program.yaml", list)
    ]
    plans: dict[int, DayPlan] = {}
    for entry in _require(prog, "days", "program.yaml", list):
        where = f"program.yaml jour {entry.get('day')}"
        day = _require(entry, "day", where, int)
        kind = entry.get("kind", "normal")
        if kind not in DAY_KINDS:
            raise ContentError(f"{where} : type de jour inconnu « {kind} »")
        if day in plans:
            raise ContentError(f"{where} : jour en double")
        plans[day] = DayPlan(
            day=day,
            theme=_require(entry, "theme", where),
            kind=kind,
            grammar_or_fluency=entry.get("slot5", "grammar"),
            write_or_speak=entry.get("slot8", "write"),
        )
    expected = list(range(1, max(plans) + 1)) if plans else []
    if sorted(plans) != expected:
        raise ContentError("program.yaml : les jours doivent être numérotés sans trou à partir de 1")
    for p in phases:
        if p.first_day not in plans or p.last_day not in plans:
            raise ContentError(f"program.yaml : la phase {p.id} référence des jours absents")
    for d in plans:
        if not any(p.first_day <= d <= p.last_day for p in phases):
            raise ContentError(f"program.yaml : le jour {d} n'appartient à aucune phase")

    characters = (_load_yaml(root / "characters.yaml") or {}) if (root / "characters.yaml").exists() else {}
    for cid, c in characters.items():
        _check_id(cid, "characters.yaml")
        _require(c, "name", f"characters.yaml {cid}")

    days: dict[int, Day] = {}
    for path in sorted((root / "days").glob("d*.yaml")):
        day = load_day(path, plans)
        days[day.day] = day
    if days and sorted(days) != list(range(1, max(days) + 1)):
        raise ContentError("days/ : les jours publiés doivent être contigus à partir du jour 1")

    proper = list(prog.get("proper_nouns", [])) + [c["name"] for c in characters.values()]
    program = Program(phases, plans, proper, characters, days)
    _check_ids_unique(program)
    return program


def _item(raw: dict, day: int, where: str, kind: str | None = None) -> Item:
    iid = _require(raw, "id", where)
    _check_id(iid, where)
    ru = _require(raw, "ru", f"{where} {iid}")
    fr = _require(raw, "fr", f"{where} {iid}")
    ex = raw.get("example") or {}
    if ex and not (ex.get("ru") and ex.get("fr")):
        raise ContentError(f"{where} {iid} : l'exemple doit avoir « ru » et « fr »")
    if kind is None:
        kind = raw.get("kind") or ("word" if len(T.words(ru)) == 1 else "phrase")
    return Item(
        id=iid, day=day, kind=kind, ru=str(ru), fr=str(fr), note=raw.get("note"),
        answers=[str(a) for a in raw.get("answers", [])],
        example_ru=ex.get("ru"), example_fr=ex.get("fr"), translit=raw.get("translit"),
        sound=raw.get("sound"), hint=raw.get("hint"), warning=raw.get("warning"),
    )


def load_day(path: Path, plans: dict[int, DayPlan]) -> Day:
    raw = _load_yaml(path) or {}
    where = path.name
    day = _require(raw, "day", where, int)
    if path.stem != f"d{day:03d}":
        raise ContentError(f"{where} : le nom du fichier doit être d{day:03d}.yaml")
    if day not in plans:
        raise ContentError(f"{where} : jour absent de program.yaml")
    plan = plans[day]

    items = [_item(r, day, f"{where} items") for r in raw.get("items", [])]
    letters = []
    for r in raw.get("letters", []):
        r = dict(r)
        r.setdefault("ru", f"{r.get('upper', '')} {r.get('lower', '')}".strip())
        r.setdefault("fr", r.get("sound", ""))
        if isinstance(r.get("example"), str):  # lettre : mot exemple + traduction facultative
            r["example"] = {"ru": r["example"], "fr": r.get("example_fr") or "—"}
        letters.append(_item(r, day, f"{where} letters", kind="letter"))

    if plan.kind == "consolidation" and items:
        raise ContentError(f"{where} : un jour de consolidation n'introduit aucun élément")
    if len(items) > MAX_NEW_ITEMS:
        raise ContentError(f"{where} : {len(items)} nouveaux éléments (maximum {MAX_NEW_ITEMS})")
    if plan.kind == "alphabet" and not letters and day <= 7:
        raise ContentError(f"{where} : un jour d'alphabet doit introduire des lettres")
    if plan.kind in {"normal"} and not raw.get("dialogue"):
        raise ContentError(f"{where} : un jour normal doit avoir un dialogue")
    if plan.kind == "normal" and plan.grammar_or_fluency == "grammar" and not raw.get("grammar"):
        raise ContentError(f"{where} : ce jour prévoit une unité de grammaire (slot5: grammar)")

    dialogue = raw.get("dialogue")
    if dialogue:
        for i, m in enumerate(_require(dialogue, "messages", f"{where} dialogue", list)):
            w = f"{where} dialogue message {i + 1}"
            _require(m, "from", w)
            _require(m, "ru", w)
            _require(m, "fr", w)
    grammar = raw.get("grammar")
    if grammar:
        _require(grammar, "title", f"{where} grammar")
        _require(grammar, "explanation", f"{where} grammar")
        for ex in grammar.get("exercises", []):
            check_exercise(ex, f"{where} grammar")
    for ex in raw.get("write", []):
        check_exercise(ex, f"{where} write")
    for ex in raw.get("exercises", []):
        check_exercise(ex, f"{where} exercises")
    return Day(day, path, raw, items, letters)


def check_exercise(ex: dict, where: str) -> None:
    t = _require(ex, "type", where)
    if t not in EXERCISE_TYPES:
        raise ContentError(f"{where} : type d'exercice inconnu « {t} »")
    w = f"{where} ({t})"
    if t == "translate":
        _require(ex, "fr", w)
        _require(ex, "answers", w, list)
    elif t == "cloze":
        ru = _require(ex, "ru", w)
        if "___" not in ru:
            raise ContentError(f"{w} : la phrase doit contenir « ___ »")
        _require(ex, "answers", w, list)
    elif t in {"order", "speak", "shadow"}:
        _require(ex, "ru", w)
    elif t in {"reply", "listen"}:
        options = _require(ex, "options", w, list)
        answer = _require(ex, "answer", w, int)
        if not 0 <= answer < len(options):
            raise ContentError(f"{w} : « answer » hors des options")
        if t == "reply":
            _require(ex, "thread", w, list)
        else:
            _require(ex, "ru", w)


def _check_ids_unique(program: Program) -> None:
    seen: dict[str, int] = {}
    for d in program.days.values():
        for it in d.items + d.letters:
            if it.id in seen:
                raise ContentError(f"identifiant « {it.id} » en double (jours {seen[it.id]} et {d.day})")
            seen[it.id] = d.day

"""Vérification de la gradation du vocabulaire (spec content-pipeline, « Validation du vocabulaire »).

Règle : tout mot russe affiché un jour D doit appartenir à un élément introduit au plus tard le
jour D (les nouveaux éléments du jour sont présentés avant le dialogue), être un nom propre déclaré,
ou figurer dans la liste `glossed` du dialogue — elle-même limitée à 5 % des mots du dialogue.
Un mot est reconnu si l'une de ses analyses morphologiques (pymorphy3) a un lemme connu.
En phase 0, les mots des éléments ne doivent utiliser que des lettres déjà vues.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Iterator

import pymorphy3

from . import text as T
from .model import Day, Item, Program

MAX_GLOSSED_RATIO = 0.05


@lru_cache(maxsize=1)
def _morph() -> pymorphy3.MorphAnalyzer:
    return pymorphy3.MorphAnalyzer()


@lru_cache(maxsize=100_000)
def lemmas(word: str) -> frozenset[str]:
    k = T.key(word)
    return frozenset({k} | {T.key(p.normal_form) for p in _morph().parse(k)})


def item_lemmas(item: Item) -> set[str]:
    if item.kind == "letter":
        return set()
    out: set[str] = set()
    for w in T.words(item.ru):
        out |= lemmas(w)
    return out


@dataclass
class Violation:
    day: int
    where: str
    sentence: str
    word: str
    detail: str

    def __str__(self) -> str:
        return f"jour {self.day} · {self.where} · « {self.sentence} » → {self.word} : {self.detail}"


def russian_texts(day: Day) -> Iterator[tuple[str, str]]:
    """Tous les textes russes d'un jour, avec leur emplacement (hors éléments eux-mêmes)."""
    raw = day.raw
    for it in day.items:
        if it.example_ru:
            yield f"exemple de {it.id}", it.example_ru
    dialogue = raw.get("dialogue") or {}
    for i, m in enumerate(dialogue.get("messages", [])):
        yield f"dialogue message {i + 1}", m["ru"]
    grammar = raw.get("grammar") or {}
    for i, ex in enumerate(grammar.get("examples", [])):
        yield f"grammaire exemple {i + 1}", ex["ru"]
    for section in ("write", "exercises"):
        for i, ex in enumerate(raw.get(section, [])):
            yield from _exercise_texts(ex, f"{section} {i + 1}")
    for i, ex in enumerate(grammar.get("exercises", [])):
        yield from _exercise_texts(ex, f"grammaire exercice {i + 1}")


def _exercise_texts(ex: dict, where: str) -> Iterator[tuple[str, str]]:
    if ex.get("ru"):
        yield where, ex["ru"].replace("___", " ")
    for a in ex.get("answers", []):
        yield f"{where} réponse", a
    if ex["type"] == "reply":
        for m in ex.get("thread", []):
            yield f"{where} fil", m["ru"]
        for o in ex.get("options", []):
            yield f"{where} option", o


def check_program(program: Program) -> list[Violation]:
    violations: list[Violation] = []
    proper = set()
    for name in program.proper_nouns:
        for w in T.words(name):
            proper |= lemmas(w)
    known: set[str] = set()
    known_letters: set[str] = set()

    for d in sorted(program.days):
        day = program.days[d]
        for letter in day.letters:
            known_letters |= {c.lower() for c in letter.ru if c.isalpha()}
        for letter in day.letters:
            if letter.example_ru:
                missing = {c for c in T.strip_accents(letter.example_ru).lower() if c.isalpha()} - known_letters
                if missing:
                    violations.append(Violation(d, f"exemple de la lettre {letter.id}", letter.example_ru,
                                                "".join(sorted(missing)), "lettre(s) pas encore vue(s)"))
        if program.plans[d].kind == "alphabet":
            for it in day.items:
                missing = {c for c in T.strip_accents(it.ru).lower() if c.isalpha()} - known_letters
                if missing:
                    violations.append(Violation(d, f"élément {it.id}", it.ru, "".join(sorted(missing)),
                                                "lettre(s) pas encore vue(s)"))
        for it in day.items:
            known |= item_lemmas(it)

        glossed = set()
        dialogue = day.raw.get("dialogue") or {}
        for g in dialogue.get("glossed", []):
            glossed |= lemmas(g)
        dialogue_words = [w for m in dialogue.get("messages", []) for w in T.words(m["ru"])]
        glossed_used = 0
        for where, sentence in russian_texts(day):
            for w in T.words(sentence):
                lem = lemmas(w)
                if lem & known or lem & proper:
                    continue
                if where.startswith("dialogue") and lem & glossed:
                    glossed_used += 1
                    continue
                violations.append(Violation(d, where, sentence, w, "mot pas encore introduit"))
        if dialogue_words and glossed_used / len(dialogue_words) > MAX_GLOSSED_RATIO:
            violations.append(Violation(
                d, "dialogue", "", ", ".join(dialogue.get("glossed", [])),
                f"mots glosés = {glossed_used}/{len(dialogue_words)} (> 5 %)"))
    return violations


def pace_report(program: Program) -> list[str]:
    """Avertissements sur le rythme d'acquisition (moyenne par phase entre 7 et 10)."""
    warnings = []
    for phase in program.phases:
        if phase.id == 0:
            continue
        days = [d for d in program.days if phase.first_day <= d <= phase.last_day]
        teaching = [d for d in days if program.plans[d].kind != "consolidation"]
        if not teaching:
            continue
        total = sum(len(program.days[d].items) for d in days)
        avg = total / len(teaching)
        complete = len(days) == phase.last_day - phase.first_day + 1
        if not 7 <= avg <= 10:
            level = "ERREUR" if complete else "avertissement (phase incomplète)"
            warnings.append(f"{level} : phase {phase.id} — {avg:.1f} nouveaux éléments/jour (attendu 7–10)")
    return warnings

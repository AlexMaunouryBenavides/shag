"""Accentuation des textes russes à partir du dictionnaire OpenRussian.

Règles (spec content-pipeline, « Accents toniques depuis un dictionnaire ») :
- un mot qui porte déjà un accent (´ ou ё) dans la source est conservé tel quel ;
- un mot d'une seule voyelle ne reçoit pas d'accent ;
- sinon l'accent vient du dictionnaire (OpenRussian + `content/stress.yaml`) ;
- forme ambiguë (plusieurs accentuations) ou inconnue → problème signalé, jamais d'accent au hasard.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from . import text as T
from .paths import CACHE, CONTENT, DATA

FORM_COLUMNS_SKIP = {"bare", "translations_en", "translations_de", "gender", "partner", "animate",
                     "indeclinable", "sg_only", "pl_only", "aspect", "comparative", "superlative"}


@dataclass
class StressInfo:
    """Pour une clé (forme sans accent, ё→е) : positions d'accent possibles et formes avec ё."""
    positions: set[int] = field(default_factory=set)
    yo_forms: set[str] = field(default_factory=set)
    plain: bool = False  # existe-t-il une variante sans ё (ex. все / всё) ?


Dictionary = dict[str, StressInfo]


def _add(d: Dictionary, accented: str) -> None:
    accented = T.from_openrussian(accented.strip())
    if not accented or " " in accented or not T.WORD_RE.fullmatch(accented):
        return
    k = T.key(accented)
    info = d.setdefault(k, StressInfo())
    idx = T.stressed_vowel_index(accented)
    if idx is not None:
        info.positions.add(idx)
    if "ё" in accented.lower():
        info.yo_forms.add(T.strip_accents(accented).lower())
    else:
        info.plain = True


def build_dictionary(data_dir: Path = DATA / "openrussian") -> Dictionary:
    d: Dictionary = {}
    for name in ("nouns", "verbs", "adjectives", "others"):
        with open(data_dir / f"{name}.csv", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f, delimiter="\t"):
                for col, value in row.items():
                    if col is None or col in FORM_COLUMNS_SKIP or not isinstance(value, str) or not value:
                        continue
                    for variant in value.split(","):
                        _add(d, variant)
    return d


def load_dictionary() -> Dictionary:
    """Charge le dictionnaire (mis en cache) puis applique les ajouts manuels de content/stress.yaml.

    content/stress.yaml : liste de formes accentuées faisant autorité, par ex. `- меня́`.
    Une forme listée remplace toute information du dictionnaire pour sa clé.
    """
    cache = CACHE / "stress_dict.json"
    sources = list((DATA / "openrussian").glob("*.csv"))
    if cache.exists() and all(cache.stat().st_mtime > s.stat().st_mtime for s in sources):
        raw = json.loads(cache.read_text(encoding="utf-8"))
        d: Dictionary = {k: StressInfo(set(p), set(y), bool(pl)) for k, (p, y, pl) in raw.items()}
    else:
        d = build_dictionary()
        cache.parent.mkdir(parents=True, exist_ok=True)
        raw = {k: [sorted(v.positions), sorted(v.yo_forms), v.plain] for k, v in d.items()}
        cache.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    apply_overrides(d, load_overrides())
    return d


def load_overrides(path: Path = CONTENT / "stress.yaml") -> list[str]:
    if not path.exists():
        return []
    return list(yaml.safe_load(path.read_text(encoding="utf-8")) or [])


def apply_overrides(d: Dictionary, forms: list[str]) -> None:
    for form in forms:
        k = T.key(form)
        info = StressInfo()
        idx = T.stressed_vowel_index(form)
        if idx is not None:
            info.positions.add(idx)
        if "ё" in form.lower():
            info.yo_forms.add(T.strip_accents(form).lower())
        else:
            info.plain = True
        d[k] = info


@dataclass
class Problem:
    word: str
    reason: str  # "ambigu" | "inconnu"
    options: list[str] = field(default_factory=list)


def accentuate_word(word: str, d: Dictionary) -> tuple[str, Problem | None]:
    if T.has_stress_mark(word):
        return word, None
    if "-" in word:
        parts = [accentuate_word(p, d) for p in word.split("-")]
        problem = next((p for _, p in parts if p), None)
        return "-".join(w for w, _ in parts), problem
    monosyllable = T.vowel_count(word) <= 1
    info = d.get(T.key(word))
    if info is None or not info.positions:
        return word, (None if monosyllable else Problem(word, "inconnu"))
    if info.yo_forms and info.plain and ("е" in word or "Е" in word):
        # е ou ё selon le sens (все / всё) : la source doit trancher.
        plain = word if monosyllable else None
        options = sorted(info.yo_forms) + ([plain] if plain else
                                           [T.apply_stress(word, i) for i in sorted(info.positions)])
        return word, Problem(word, "ambigu", options)
    # ё du dictionnaire : la source a écrit е à la place, on rétablit ё (toujours accentué).
    if len(info.yo_forms) == 1 and (monosyllable or len(info.positions) == 1):
        yo = next(iter(info.yo_forms))
        if len(yo) == len(word):
            restored = "".join(
                ("Ё" if c.isupper() else "ё") if y == "ё" and c in "еЕ" else c
                for c, y in zip(word, yo)
            )
            if "ё" in restored.lower():
                return restored, None
    if monosyllable:
        return word, None
    if len(info.positions) > 1:
        options = [T.apply_stress(word, i) for i in sorted(info.positions)]
        return word, Problem(word, "ambigu", options)
    return T.apply_stress(word, next(iter(info.positions))), None


def accentuate(text: str, d: Dictionary) -> tuple[str, list[Problem]]:
    """Accentue tous les mots d'un texte, en conservant la ponctuation et la casse."""
    out: list[str] = []
    problems: list[Problem] = []
    last = 0
    for m in T.tokens(text):
        out.append(text[last : m.start()])
        word, problem = accentuate_word(m.group(0), d)
        out.append(word)
        if problem:
            problems.append(problem)
        last = m.end()
    out.append(text[last:])
    return "".join(out), problems

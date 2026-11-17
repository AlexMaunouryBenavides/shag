"""Outils de texte russe : accents, découpage en mots, normalisation."""

from __future__ import annotations

import re
import unicodedata

ACUTE = "́"
VOWELS = set("аеёиоуыэюяАЕЁИОУЫЭЮЯ")

# Un « mot » russe : lettres cyrilliques, accents combinants, trait d'union interne.
WORD_RE = re.compile(r"[А-Яа-яЁё́]+(?:-[А-Яа-яЁё́]+)*")


def strip_accents(s: str) -> str:
    return s.replace(ACUTE, "")


def vowel_count(word: str) -> int:
    return sum(1 for c in word if c in VOWELS)


def has_stress_mark(word: str) -> bool:
    return ACUTE in word or "ё" in word or "Ё" in word


def stressed_vowel_index(accented: str) -> int | None:
    """Rang (0-based) de la voyelle accentuée dans un mot accentué, ou None."""
    n = -1
    for i, c in enumerate(accented):
        if c in VOWELS:
            n += 1
            if c in "ёЁ" and ACUTE not in accented:
                return n
        elif c == ACUTE and n >= 0:
            return n
    return None


def apply_stress(word: str, vowel_index: int) -> str:
    """Place l'accent sur la n-ième voyelle de `word` (qui ne doit pas déjà en porter)."""
    n = -1
    for i, c in enumerate(word):
        if c in VOWELS:
            n += 1
            if n == vowel_index:
                if c in "ёЁ":
                    return word  # ё porte déjà l'accent
                return word[: i + 1] + ACUTE + word[i + 1 :]
    raise ValueError(f"le mot {word!r} n'a pas de voyelle n°{vowel_index}")


def tokens(text: str) -> list[re.Match[str]]:
    return list(WORD_RE.finditer(text))


def words(text: str) -> list[str]:
    return [m.group(0) for m in tokens(text)]


def key(word: str) -> str:
    """Clé de recherche dictionnaire : minuscules, sans accent, ё → е."""
    return unicodedata.normalize("NFC", strip_accents(word)).lower().replace("ё", "е")


def from_openrussian(accented: str) -> str:
    """OpenRussian note l'accent par une apostrophe après la voyelle : молоко' → молоко́."""
    return accented.replace("'", ACUTE)

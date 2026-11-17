"""Transcription phonétique approximative pour un francophone (phase 0 → jour 30).

Volontairement simple : elle aide à lire au début, ce n'est pas de l'API.
- voyelle accentuée marquée d'un accent aigu (mots de plus d'une syllabe) : молоко́ → [malakó]
- réduction des voyelles non accentuées : о → a, е/я → i ; я final → ia
Une transcription manuelle (`translit:` dans la source) a toujours priorité.
"""

from __future__ import annotations

from . import text as T

CONS = {
    "б": "b", "в": "v", "г": "g", "д": "d", "ж": "j", "з": "z", "й": "ï", "к": "k", "л": "l",
    "м": "m", "н": "n", "п": "p", "р": "r", "с": "s", "т": "t", "ф": "f", "х": "kh", "ц": "ts",
    "ч": "tch", "ш": "ch", "щ": "chtch", "ь": "", "ъ": "",
}
# son de base de chaque voyelle ; les voyelles « molles » prennent un i/y initial
BASE = {"а": "a", "о": "o", "у": "ou", "ы": "y", "э": "è", "и": "i",
        "е": "é", "ё": "o", "я": "a", "ю": "ou"}
SOFT = set("еёяю")
REDUCED = {"о": "a", "е": "i", "я": "i"}
ACCENTED = {"a": "á", "o": "ó", "ou": "oú", "y": "ý", "è": "è", "i": "í", "é": "é"}


def _vowel(c: str, stressed: bool, mark: bool, after_vowel: bool, final: bool) -> str:
    if stressed:
        core = BASE[c]
        core = ACCENTED[core] if mark else core
    elif c == "я" and final:
        core = "a"
    else:
        core = REDUCED.get(c, BASE[c])
    if after_vowel and c in SOFT:
        return "y" + core  # début de mot ou après voyelle : е → yé, я → ya…
    if c in "ёю" or (c == "я" and (stressed or final)):
        return "i" + core  # consonne molle : тебя́ → tibiá, люблю́ → lioubliou
    return core


def transliterate(accented: str) -> str:
    out_words = []
    for word in accented.split():
        w = [c for c in word.lower() if c != T.ACUTE or True]
        stressed_idx = T.stressed_vowel_index(word.lower())
        letters = [c for c in w if c != T.ACUTE]
        n_vowels = sum(1 for c in letters if c in BASE)
        mark = n_vowels > 1
        out, vi, after_vowel = [], -1, True
        for i, c in enumerate(letters):
            if c in BASE:
                vi += 1
                stressed = vi == stressed_idx or n_vowels == 1 or c == "ё"
                final = i == len(letters) - 1
                out.append(_vowel(c, stressed, mark and stressed, after_vowel, final))
                after_vowel = True
            elif c in CONS:
                out.append(CONS[c])
                after_vowel = False
            elif c.isalpha():
                out.append(c)
                after_vowel = False
        if out:
            out_words.append("".join(out))
    return "[" + " ".join(out_words) + "]"

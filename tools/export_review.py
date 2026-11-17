"""Exporte une plage de jours dans un document lisible pour une relecture par un locuteur natif.

Le document contient, pour chaque jour, les éléments, le dialogue, les exemples de grammaire et
les exercices rédigés, en russe accentué avec la traduction française. Il est écrit en
Markdown (lisible tel quel, ou à coller dans un document partagé).

Usage : python -I -X utf8 tools/export_review.py 1 20 [--out exports/relecture_j1-20.md]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "public" / "content" / "pack.json"


def render(pack: dict, first: int, last: int) -> str:
    items = pack["items"]
    names = {cid: c["name"] for cid, c in pack["characters"].items()}
    lines = [
        f"# Шаг — relecture des jours {first} à {last}",
        "",
        "Merci de signaler toute phrase peu naturelle, faute ou mauvais accent tonique (´).",
        "Спасибо за помощь! Отметьте, пожалуйста, неестественные фразы, ошибки или неправильные ударения.",
        "",
    ]
    for day in pack["days"]:
        if not first <= day["day"] <= last:
            continue
        lines += [f"## Jour {day['day']} — {day['theme']}", ""]
        day_items = [items[i] for i in day.get("letters", []) + day.get("items", [])]
        if day_items:
            lines.append("**Mots et expressions**")
            lines.append("")
            for it in day_items:
                ex = it.get("example")
                extra = f" — *{ex['ru']}* ({ex['fr']})" if ex and it["kind"] != "letter" else ""
                lines.append(f"- {it['ru']} — {it['fr']}{extra}")
            lines.append("")
        dialogue = day.get("dialogue")
        if dialogue:
            lines += ["**Dialogue**", ""]
            for m in dialogue["messages"]:
                lines.append(f"- **{names.get(m['from'], m['from'])}** : {m['ru']} — *{m['fr']}*")
            lines.append("")
        grammar = day.get("grammar")
        if grammar:
            lines += [f"**Grammaire : {grammar['title']}**", ""]
            for ex in grammar.get("examples", []):
                lines.append(f"- {ex['ru']} — *{ex['fr']}*")
            lines.append("")
        exercises = list((grammar or {}).get("exercises", []))
        for u in day["units"]:
            if u["type"] in {"write", "grammar"}:
                exercises += u.get("exercises", [])
        written = [e for e in exercises if e["t"] in {"translate", "cloze", "reply"}]
        if written:
            lines += ["**Exercices (réponses attendues)**", ""]
            for e in written:
                if e["t"] == "translate":
                    lines.append(f"- {e['fr']} → {' / '.join(e['answers'])}")
                elif e["t"] == "cloze":
                    lines.append(f"- {e['ru']} → {' / '.join(e['answers'])}")
                else:
                    thread = " / ".join(m["ru"] for m in e["thread"])
                    lines.append(f"- {thread} → {e['options'][e['answer']]}")
            lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Export pour relecture native")
    parser.add_argument("first", type=int)
    parser.add_argument("last", type=int)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    pack = json.loads(PACK.read_text(encoding="utf-8"))
    out = args.out or ROOT / "exports" / f"relecture_j{args.first}-{args.last}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(pack, args.first, args.last), encoding="utf-8")
    print(f"écrit : {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Liste les éléments signalés ⚑ dans un fichier de sauvegarde exporté par l'application.

La sauvegarde est la base SQLite de l'app ; les signalements sont dans la table `flags`
(item_id, day, created_at, context). Le fichier est ouvert en lecture seule.

Usage : python -I -X utf8 tools/read_flags.py chemin/vers/shag-sauvegarde.sqlite3
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "public" / "content" / "pack.json"


def read_flags(db_path: Path) -> list[dict]:
    uri = f"file:{db_path.resolve().as_posix()}?mode=ro"
    with sqlite3.connect(uri, uri=True) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute(
            "SELECT item_id, day, created_at, context FROM flags ORDER BY created_at").fetchall()
    return [dict(r) for r in rows]


def describe(flag: dict, pack: dict) -> str:
    item = pack["items"].get(flag["item_id"])
    source = f"content/days/d{item['day']:03d}.yaml" if item else "?"
    text = f"{item['ru']} — {item['fr']}" if item else "(élément inconnu du paquet actuel)"
    context = f"\n    contexte : {flag['context']}" if flag.get("context") else ""
    return (f"⚑ {flag['item_id']} · jour {flag['day']} · {flag['created_at']}\n"
            f"    {text}\n    à corriger dans : {source}{context}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Lecture des signalements ⚑")
    parser.add_argument("backup", type=Path)
    args = parser.parse_args()
    pack = json.loads(PACK.read_text(encoding="utf-8"))
    flags = read_flags(args.backup)
    if not flags:
        print("Aucun signalement.")
    for f in flags:
        print(describe(f, pack))
    return 0


if __name__ == "__main__":
    sys.exit(main())

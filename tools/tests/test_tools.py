import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from export_review import render  # noqa: E402
from read_flags import describe, read_flags  # noqa: E402

PACK = {
    "characters": {"masha": {"name": "Ма́ша"}},
    "items": {"chai": {"id": "chai", "day": 15, "kind": "word", "ru": "чай", "fr": "thé"}},
    "days": [{
        "day": 15, "theme": "Au café", "items": ["chai"], "letters": [],
        "dialogue": {"messages": [{"from": "masha", "ru": "Я хочу́ чай.", "fr": "Je veux du thé."}]},
        "units": [{"type": "write", "exercises": [
            {"t": "translate", "fr": "Je veux du thé.", "answers": ["Я хочу́ чай."]}]}],
    }],
}


def test_render_contains_dialogue_and_answers():
    md = render(PACK, 1, 20)
    assert "## Jour 15 — Au café" in md
    assert "**Ма́ша** : Я хочу́ чай." in md
    assert "Je veux du thé. → Я хочу́ чай." in md


def test_render_respects_range():
    assert "Jour 15" not in render(PACK, 1, 10)


def test_read_flags(tmp_path):
    db = tmp_path / "backup.sqlite3"
    with sqlite3.connect(db) as con:
        con.execute("CREATE TABLE flags(id INTEGER PRIMARY KEY, item_id TEXT, day INTEGER, "
                    "created_at TEXT, context TEXT)")
        con.execute("INSERT INTO flags(item_id, day, created_at, context) VALUES "
                    "('chai', 15, '2026-11-20T08:00:00Z', 'correction')")
    flags = read_flags(db)
    assert flags == [{"item_id": "chai", "day": 15, "created_at": "2026-11-20T08:00:00Z",
                      "context": "correction"}]
    text = describe(flags[0], PACK)
    assert "чай — thé" in text and "content/days/d015.yaml" in text

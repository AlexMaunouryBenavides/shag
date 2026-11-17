from pathlib import Path

import pytest
import yaml

from shag.grading import check_program, lemmas
from shag.model import ContentError, load_program

PROGRAM = {
    "phases": [
        {"id": 0, "title": "Alphabet", "days": [1, 2]},
        {"id": 1, "title": "Fondations", "days": [3, 5]},
    ],
    "proper_nouns": ["Москва"],
    "days": [
        {"day": 1, "theme": "Lettres 1", "kind": "alphabet"},
        {"day": 2, "theme": "Lettres 2", "kind": "alphabet"},
        {"day": 3, "theme": "Salut", "kind": "normal", "slot5": "fluency"},
        {"day": 4, "theme": "Au café", "kind": "normal", "slot5": "fluency"},
        {"day": 5, "theme": "Consolidation", "kind": "consolidation"},
    ],
}
CHARACTERS = {"masha": {"name": "Маша"}, "anton": {"name": "Антон"}}


def write(root: Path, days: dict[int, dict], program: dict = PROGRAM) -> Path:
    (root / "days").mkdir(parents=True)
    (root / "program.yaml").write_text(yaml.safe_dump(program, allow_unicode=True), encoding="utf-8")
    (root / "characters.yaml").write_text(yaml.safe_dump(CHARACTERS, allow_unicode=True), encoding="utf-8")
    for n, content in days.items():
        (root / "days" / f"d{n:03d}.yaml").write_text(
            yaml.safe_dump({"day": n, **content}, allow_unicode=True), encoding="utf-8")
    return root


def letters(*pairs):
    return [{"id": f"l-{i}", "upper": u, "lower": u.lower(), "sound": "[?]"} for i, u in pairs]


BASE_DAYS = {
    1: {"letters": letters(("a", "А"), ("k", "К"), ("m", "М"), ("o", "О"), ("t", "Т")),
        "items": [{"id": "kot", "ru": "кот", "fr": "chat"}]},
    2: {"letters": letters(("r", "Р"), ("n", "Н"), ("v", "В"), ("s", "С"), ("i", "И"), ("p", "П"),
                           ("e", "Е"), ("ch", "Ч"), ("u", "У"), ("ya", "Я"), ("y", "Ы"), ("g", "Г"),
                           ("d", "Д"), ("l", "Л"), ("kh", "Х"), ("sh", "Ш"), ("ts", "Ц")),
        "items": [{"id": "privet", "ru": "привет", "fr": "salut"}]},
    3: {"items": [{"id": "kak-dela", "ru": "Как дела?", "fr": "Ça va ?"},
                  {"id": "ty", "ru": "ты", "fr": "tu"},
                  {"id": "gde", "ru": "где", "fr": "où"},
                  {"id": "ya", "ru": "я", "fr": "je"}],
        "dialogue": {"messages": [
            {"from": "masha", "ru": "Привет! Как дела?", "fr": "Salut ! Ça va ?"},
            {"from": "anton", "ru": "Привет, Маша! Ты где?", "fr": "Salut Macha ! Tu es où ?"}]}},
}


def test_valid_program_has_no_violation(tmp_path):
    program = load_program(write(tmp_path, BASE_DAYS))
    assert program.last_day == 3
    assert check_program(program) == []


def test_word_from_a_future_day_is_rejected(tmp_path):
    days = dict(BASE_DAYS)
    days[3] = {**BASE_DAYS[3], "dialogue": {"messages": [
        {"from": "masha", "ru": "Я хочу воду.", "fr": "Je veux de l'eau."}]}}
    violations = check_program(load_program(write(tmp_path, days)))
    words = {v.word for v in violations}
    assert {"хочу", "воду"} <= words
    assert all(v.day == 3 for v in violations)


def test_inflected_form_of_known_lemma_is_accepted(tmp_path):
    days = dict(BASE_DAYS)
    days[3] = {**BASE_DAYS[3],
               "items": BASE_DAYS[3]["items"] + [{"id": "voda", "ru": "вода", "fr": "eau"},
                                                {"id": "hotet", "ru": "хотеть", "fr": "vouloir"}],
               "dialogue": {"messages": [{"from": "masha", "ru": "Я хочу воду.", "fr": "Je veux de l'eau."}]}}
    assert check_program(load_program(write(tmp_path, days))) == []


def test_glossed_words_are_limited(tmp_path):
    days = dict(BASE_DAYS)
    days[3] = {**BASE_DAYS[3], "dialogue": {
        "glossed": ["метро"],
        "messages": [{"from": "masha", "ru": "Я где метро?", "fr": "..."}]}}
    violations = check_program(load_program(write(tmp_path, days)))
    assert any("5 %" in v.detail for v in violations)


def test_alphabet_items_use_only_known_letters(tmp_path):
    days = dict(BASE_DAYS)
    days[1] = {**BASE_DAYS[1], "items": [{"id": "nos", "ru": "нос", "fr": "nez"}]}
    violations = check_program(load_program(write(tmp_path, days)))
    assert violations and violations[0].detail == "lettre(s) pas encore vue(s)"
    assert violations[0].word == "нс"


def test_consolidation_day_cannot_introduce_items(tmp_path):
    days = dict(BASE_DAYS)
    days[4] = {"items": [], "dialogue": {"messages": [{"from": "masha", "ru": "Привет!", "fr": "Salut !"}]}}
    days[5] = {"items": [{"id": "chai", "ru": "чай", "fr": "thé"}]}
    with pytest.raises(ContentError, match="consolidation"):
        load_program(write(tmp_path, days))


def test_too_many_items_is_rejected(tmp_path):
    days = dict(BASE_DAYS)
    days[3] = {**BASE_DAYS[3], "items": [{"id": f"w{i}", "ru": "да", "fr": "oui"} for i in range(13)]}
    with pytest.raises(ContentError, match="maximum 12"):
        load_program(write(tmp_path, days))


def test_published_days_must_be_contiguous(tmp_path):
    days = {1: BASE_DAYS[1], 3: BASE_DAYS[3]}
    with pytest.raises(ContentError, match="contigus"):
        load_program(write(tmp_path, days))


def test_duplicate_ids_are_rejected(tmp_path):
    days = dict(BASE_DAYS)
    days[2] = {**BASE_DAYS[2], "items": [{"id": "kot", "ru": "привет", "fr": "salut"}]}
    with pytest.raises(ContentError, match="double"):
        load_program(write(tmp_path, days))


def test_lemmas_cover_inflections():
    assert "вода" in lemmas("воду")
    assert "хотеть" in lemmas("хочешь")

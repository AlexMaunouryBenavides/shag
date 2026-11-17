from shag import text as T
from shag.stress import StressInfo, accentuate, apply_overrides

A = T.ACUTE


def make_dict(*forms: str):
    """Petit dictionnaire de test construit à partir de formes accentuées."""
    d: dict[str, StressInfo] = {}
    for form in forms:
        info = d.setdefault(T.key(form), StressInfo())
        info.positions.add(T.stressed_vowel_index(form))
        if "ё" in form:
            info.yo_forms.add(T.strip_accents(form).lower())
    return d


def test_stressed_vowel_index():
    assert T.stressed_vowel_index("молоко" + A) == 2
    assert T.stressed_vowel_index("ко" + A + "фе") == 0
    assert T.stressed_vowel_index("ёж") == 0
    assert T.stressed_vowel_index("кот") is None


def test_accentuate_simple_sentence():
    d = make_dict("приве" + A + "т", "дела" + A, "хочу" + A, "ко" + A + "фе")
    out, problems = accentuate("Привет! Как дела? Я хочу кофе.", d)
    assert out == f"Приве{A}т! Как дела{A}? Я хочу{A} ко{A}фе."
    assert problems == []


def test_monosyllables_are_left_alone():
    out, problems = accentuate("Я в кафе и ты там.", make_dict("кафе" + A))
    assert out == f"Я в кафе{A} и ты там."
    assert problems == []


def test_existing_accent_in_source_is_kept():
    d = make_dict("за" + A + "мок", "замо" + A + "к")
    out, problems = accentuate(f"Это замо{A}к.", d)
    assert out == f"Это замо{A}к." or problems  # "Это" absent du dictionnaire de test
    assert all(p.word != f"замо{A}к" for p in problems)


def test_ambiguous_word_is_reported_not_guessed():
    d = make_dict("за" + A + "мок", "замо" + A + "к")
    out, problems = accentuate("замок", d)
    assert out == "замок"
    assert problems[0].reason == "ambigu"
    assert set(problems[0].options) == {f"за{A}мок", f"замо{A}к"}


def test_unknown_word_is_reported():
    out, problems = accentuate("бармаглот", make_dict())
    assert out == "бармаглот"
    assert problems[0].reason == "inconnu"


def test_yo_is_restored_from_dictionary():
    out, problems = accentuate("Еще чай?", make_dict("ещё"))
    assert out == "Ещё чай?"
    assert problems == []


def test_overrides_take_precedence():
    d = make_dict("ру" + A + "ки", "руки" + A)
    apply_overrides(d, ["ру" + A + "ки"])
    out, problems = accentuate("руки", d)
    assert out == f"ру{A}ки" and problems == []


def test_case_is_preserved():
    out, _ = accentuate("Москва", make_dict("Москва" + A))
    assert out == f"Москва{A}"


def test_e_yo_ambiguity_is_reported():
    d = make_dict("все", "всё")
    d[T.key("все")].plain = True
    out, problems = accentuate("все", d)
    assert out == "все"
    assert problems and problems[0].reason == "ambigu"

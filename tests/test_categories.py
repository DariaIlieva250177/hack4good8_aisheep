from pathlib import Path

import pandas as pd

from synthetic_data import CATEGORIES, classify_categories, load_category_overrides

ROOT = Path(__file__).resolve().parent.parent
OVERRIDES = ROOT / "data" / "risk_category_overrides.csv"
ID = {c[1]: c[0] for c in CATEGORIES}


def test_dam_matches_a_dam_but_not_damage():
    assert ID["Infrastructure failure"] in classify_categories("drone attacks hit the Merowe Dam")
    assert ID["Infrastructure failure"] not in classify_categories("storm damage to homes")


def test_war_does_not_match_inside_other_words():
    assert ID["Armed conflict"] not in classify_categories("early warning for the harvest")


def test_food_insecurity_is_not_armed_conflict():
    assert classify_categories("trade limits deepen food insecurity")[0] == ID["Economic crisis / prices"]
    assert ID["Armed conflict"] not in classify_categories("deepen food insecurity")


def test_drought_wins_over_flood():
    assert classify_categories("El Nino drought and floods in the north")[0] == ID["Drought"]


def test_no_keyword_falls_back_to_zero():
    assert classify_categories("nothing relevant here") == [0]


def test_overrides_give_main_category_first():
    overrides = load_category_overrides(OVERRIDES)
    assert overrides["R1054"] == [ID["Infrastructure failure"], ID["Armed conflict"]]
    assert overrides["R1071"] == [0]


def test_overrides_cover_every_active_risk():
    export = pd.read_csv(ROOT / "data" / "risk-radar-export.csv")
    active = set(export.loc[export["Status"] == "Active", "Risk ID"])
    assert active == set(load_category_overrides(OVERRIDES))


def test_missing_overrides_file_means_no_overrides(tmp_path):
    assert load_category_overrides(tmp_path / "missing.csv") == {}
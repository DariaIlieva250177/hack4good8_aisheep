import json
import re

import pytest

from build_demo_data import SPOT_ON_EXAMPLE, build
from points import SPOT_ON_BONUS


@pytest.fixture(scope="module")
def built():
    return build()


def test_every_approved_expert_is_ranked(built):
    tables, _, ranks, _ = built
    assert set(ranks.expert_id) == set(tables["experts"].query("status == 'approved'").expert_id)


def test_ranks_hold_no_simulation_values(built):
    assert not [c for c in built[2].columns if c.startswith("sim_")]


def test_demo_expert_has_a_track_record_and_matching_rank(built):
    _, _, ranks, bundle = built
    rank = bundle["expert"]["rank"]
    row = ranks.set_index("expert_id").loc[bundle["expert"]["expert_id"]]
    assert row.forecasts > 0
    assert rank["points"] == row.points == row.forecast_points + SPOT_ON_BONUS
    assert rank["out_of"] == len(ranks)


def test_demo_points_add_up_from_the_results(built):
    bundle = built[3]
    total = sum(r["points"] + r["bonus_points"] for r in bundle["results"])
    assert total == bundle["expert"]["rank"]["points"]


def test_deck_opens_on_the_demo_risk(built):
    assert built[3]["deck"][0]["risk_id"] == "R1043"


def test_the_spot_on_example_comes_first_in_the_results(built):
    first = built[3]["results"][0]
    assert first["risk_id"] == SPOT_ON_EXAMPLE["risk_id"]
    assert first["comment"]["example"] is True


def test_the_app_file_shows_no_other_expert(built):
    bundle = built[3]
    ids = set(re.findall(r"\bE\d{3}\b", json.dumps(bundle)))
    assert ids == {bundle["expert"]["expert_id"]}


def test_active_risks_use_the_checked_categories(built):
    risks = built[0]["risks"].set_index("risk_id")
    assert risks.loc["R1054", "category"] == "Infrastructure failure"
    assert risks.loc["R1045", "category"] == "Drought"

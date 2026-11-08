import json
import re

import pytest

from build_demo_data import EXPORT, SPOT_ON_EXAMPLE, build
from points import SPOT_ON_BONUS
from synthetic_data import CONFIG, build_all


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
    assert rank["position"] == row.position
    assert rank["out_of"] == ranks.position.notna().sum()


def test_the_demo_expert_holds_a_top_place(built):
    rank = built[3]["expert"]["rank"]
    chad = next(g for g in rank["groups"] if g["name"] == "Chad")
    assert rank["position"] <= 10
    assert chad["position"] == 1


def test_a_stronger_demo_expert_changes_only_their_own_forecasts(built):
    tables, _, _, bundle = built
    demo = bundle["expert"]["expert_id"]
    weaker, _ = build_all(EXPORT, {**CONFIG, "demo_skill": None})
    assert tables["stances"].equals(weaker["stances"])
    assert tables["comments"].equals(weaker["comments"])
    now, before = tables["forecasts"], weaker["forecasts"]
    assert now[now.expert_id != demo].equals(before[before.expert_id != demo])
    mine, mine_before = now[now.expert_id == demo], before[before.expert_id == demo]
    assert len(mine) == len(mine_before)
    assert (mine.answer_level.values != mine_before.answer_level.values).any()


def test_experts_under_the_minimum_have_no_position(built):
    ranks = built[2]
    assert ranks[ranks.forecasts < 5].position.isna().all()
    assert ranks[ranks.forecasts >= 5].position.notna().all()


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


def test_the_demo_risk_shows_the_weighted_total_and_the_country_line(built):
    group = built[3]["details"]["R1043"]["community"]
    assert 0 <= group["weighted_agree"] <= 100
    assert group["country_answers"] >= 3
    assert group["country_agree"] <= group["country_answers"] <= group["answers"]


def test_a_hidden_name_still_counts_in_the_group_answer(built):
    tables, _, _, bundle = built
    stances = tables["stances"]
    hidden = stances[stances.name_hidden_from_acaps & stances.risk_id.isin(bundle["details"])]
    assert len(hidden) > 0
    for risk_id in hidden.risk_id.unique():
        answers = stances[stances.risk_id == risk_id].expert_id.nunique()
        assert bundle["details"][risk_id]["community"]["answers"] == answers


def test_active_risks_use_the_checked_categories(built):
    risks = built[0]["risks"].set_index("risk_id")
    assert risks.loc["R1054", "category"] == "Infrastructure failure"
    assert risks.loc["R1045", "category"] == "Drought"

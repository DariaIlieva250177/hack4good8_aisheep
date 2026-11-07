import pandas as pd
import pytest

from points import (POINTS, SPOT_ON_BONUS, build_ranks, build_results, rank_for_app, score_forecasts, sort_deck,
                    what_happened)

BANDS = {"very_unlikely": 0.1, "unlikely": 0.3, "even_chance": 0.5, "likely": 0.7, "very_likely": 0.9}


def forecasts():
    return pd.DataFrame({
        "expert_id": ["E1", "E1", "E1", "E1", "E2", "E2"],
        "question_id": ["Q1", "Q2", "Q3", "Q4", "Q1", "Q2"],
        "answer_level": ["very_likely", "unlikely", "dont_know", "likely", "even_chance", "very_likely"],
    })


def questions():
    return pd.DataFrame({
        "question_id": ["Q1", "Q2", "Q3", "Q4"], "risk_id": ["R1", "R2", "R3", "R4"],
        "outcome": [1, 0, 1, None], "resolves_on": ["2026-01-01", "2026-02-01", "2026-03-01", "2027-01-01"],
    })


def experts():
    return pd.DataFrame({"expert_id": ["E1", "E2", "E3", "E4"],
                         "status": ["approved", "approved", "approved", "pending"]})


@pytest.mark.parametrize("level", BANDS)
@pytest.mark.parametrize("outcome", [0, 1])
def test_points_table_is_the_brier_score_in_readable_form(level, outcome):
    assert POINTS[level][outcome] == pytest.approx(12.5 * (0.25 - (BANDS[level] - outcome) ** 2))


def test_saying_unlikely_about_something_that_did_not_happen_earns_points():
    scored = score_forecasts(forecasts(), questions())
    row = scored[(scored.expert_id == "E1") & (scored.question_id == "Q2")].iloc[0]
    assert row.points == 2 and row.correct_call


def test_a_wrong_strong_call_costs_seven():
    scored = score_forecasts(forecasts(), questions())
    assert scored[(scored.expert_id == "E2") & (scored.question_id == "Q2")].iloc[0].points == -7


def test_dont_know_and_open_questions_are_not_scored():
    scored = score_forecasts(forecasts(), questions())
    assert set(scored.question_id) == {"Q1", "Q2"}


def test_even_chance_scores_zero_and_is_not_a_call():
    scored = score_forecasts(forecasts(), questions())
    row = scored[(scored.expert_id == "E2") & (scored.question_id == "Q1")].iloc[0]
    assert row.points == 0 and not row.is_call and not row.correct_call


def test_ranks_include_every_approved_expert_and_no_one_else():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts())
    assert set(ranks.expert_id) == {"E1", "E2", "E3"}
    assert ranks.set_index("expert_id").loc["E3", "points"] == 0


def test_most_points_comes_first_and_a_negative_total_comes_last():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts()).set_index("expert_id")
    assert (ranks.loc["E1", "points"], ranks.loc["E1", "position"]) == (5, 1)
    assert (ranks.loc["E3", "points"], ranks.loc["E3", "position"]) == (0, 2)
    assert (ranks.loc["E2", "points"], ranks.loc["E2", "position"]) == (-7, 3)


def test_ties_share_a_position():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), {"E3": 5}).set_index("expert_id")
    assert ranks.loc["E1", "position"] == ranks.loc["E3", "position"] == 1
    assert ranks.loc["E2", "position"] == 3


def test_the_spot_on_bonus_is_worth_more_than_any_right_forecast():
    assert SPOT_ON_BONUS > max(max(v.values()) for v in POINTS.values())


def test_rank_for_app_has_the_agreed_format():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), {"E1": 5})
    assert rank_for_app(ranks, "E1") == {"points": 10, "position": 1, "out_of": 3, "calls": 2, "correct": 2}


def card(risk_id, score, match, days):
    return {"risk_id": risk_id, "urgency_score": score, "match_type": match, "days_left": days}


def test_deck_sorts_by_urgency_then_match_then_closing_date():
    deck = [card("a", 2, "country_and_domain", 1), card("b", 3, "domain_only", 1),
            card("c", 3, "country_only", 9), card("d", 3, "country_and_domain", 9),
            card("e", 3, "country_and_domain", 2)]
    assert [c["risk_id"] for c in sort_deck(deck)] == ["e", "d", "c", "b", "a"]


def test_what_happened_prefers_hazard_text_and_removes_links():
    row = {"hazard_materialisation": "Clashes began ([UN](https://example.org)).",
           "impact_materialisation_description": "Other text."}
    assert what_happened(row) == "Clashes began (UN)."


def test_what_happened_is_none_when_acaps_wrote_nothing():
    assert what_happened({"hazard_materialisation": float("nan"),
                          "impact_materialisation_description": float("nan")}) is None


def results(spot_on=None):
    risks = pd.DataFrame({"risk_id": ["R1", "R2"], "title": ["One", "Two"], "country": ["Chad", "Mali"]})
    export = pd.DataFrame({"risk_id": ["R1", "R2"], "hazard_materialisation": ["It happened.", None],
                           "impact_materialisation_description": [None, None]})
    return build_results(score_forecasts(forecasts(), questions()), "E1", risks, export, spot_on)


def test_results_show_what_the_expert_said_and_what_happened():
    items = {i["risk_id"]: i for i in results()}
    assert items["R1"]["you_said"] == "very_likely"
    assert items["R1"]["outcome"] == "Happened"
    assert items["R1"]["what_happened"] == "It happened."
    assert items["R1"]["points"] == 3
    assert items["R2"]["outcome"] == "Did not happen"
    assert items["R2"]["what_happened"] is None


def test_the_spot_on_example_comes_first_and_is_labelled():
    items = results({"risk_id": "R1", "text": "My reading."})
    assert items[0]["risk_id"] == "R1"
    assert items[0]["comment"] == {"text": "My reading.", "spot_on": True, "example": True}
    assert items[0]["bonus_points"] == SPOT_ON_BONUS
    assert items[1]["comment"] is None

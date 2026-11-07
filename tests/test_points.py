import pandas as pd
import pytest

from points import (POINTS, SPOT_ON_BONUS, build_group_ranks, build_ranks, build_results, rank_for_app,
                    score_forecasts, sort_deck, what_happened)

BANDS = {"very_unlikely": 0.1, "unlikely": 0.3, "even_chance": 0.5, "likely": 0.7, "very_likely": 0.9}


def forecasts():
    return pd.DataFrame({
        "expert_id": ["E1", "E1", "E1", "E1", "E2", "E2"],
        "question_id": ["Q1", "Q2", "Q3", "Q4", "Q1", "Q2"],
        "answer_level": ["very_likely", "unlikely", "dont_know", "likely", "even_chance", "very_likely"],
        "version": 1, "submitted_at": "2025-06-01",
    })


def questions():
    return pd.DataFrame({
        "question_id": ["Q1", "Q2", "Q3", "Q4"], "risk_id": ["R1", "R2", "R3", "R4"],
        "outcome": [1, 0, 1, None], "resolves_on": ["2026-01-01", "2026-02-01", "2026-03-01", "2027-01-01"],
        "happened_on": ["2026-01-01", None, "2026-03-01", None],
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


def scored_points(rows):
    """A scored table from {expert: [points, ...]}, for tests that only care about points."""
    records = [(expert, p) for expert, points in rows.items() for p in points]
    table = pd.DataFrame(records, columns=["expert_id", "points"])
    return table.assign(is_call=True, correct_call=True)


def test_the_best_average_comes_first_and_a_negative_average_comes_last():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), min_forecasts=1).set_index("expert_id")
    assert (ranks.loc["E1", "average_points"], ranks.loc["E1", "position"]) == (2.5, 1)
    assert (ranks.loc["E2", "average_points"], ranks.loc["E2", "position"]) == (-3.5, 2)


def test_answering_more_does_not_beat_a_better_average():
    scored = scored_points({"E1": [3, 3], "E2": [2, 2, 2, 2, 2]})
    ranks = build_ranks(scored, experts(), min_forecasts=1).set_index("expert_id")
    assert ranks.loc["E2", "points"] > ranks.loc["E1", "points"]
    assert (ranks.loc["E1", "position"], ranks.loc["E2", "position"]) == (1, 2)


def test_an_expert_under_the_minimum_gets_no_position():
    scored = scored_points({"E1": [3, 3, 3, 3, 3], "E2": [3, 3, 3, 3]})
    ranks = build_ranks(scored, experts()).set_index("expert_id")
    assert ranks.loc["E1", "position"] == 1
    assert pd.isna(ranks.loc["E2", "position"])
    assert pd.isna(ranks.loc["E3", "position"])


def test_ties_share_a_position():
    scored = scored_points({"E1": [2, 2], "E2": [3, 1], "E3": [1, 1]})
    ranks = build_ranks(scored, experts(), min_forecasts=1).set_index("expert_id")
    assert ranks.loc["E1", "position"] == ranks.loc["E2", "position"] == 1
    assert ranks.loc["E3", "position"] == 3


def test_the_spot_on_bonus_counts_in_the_average():
    ranks = build_ranks(scored_points({"E1": [2, 2]}), experts(), {"E1": 5}, min_forecasts=1).set_index("expert_id")
    assert ranks.loc["E1", "points"] == 9
    assert ranks.loc["E1", "average_points"] == 4.5


def test_the_spot_on_bonus_is_worth_more_than_any_right_forecast():
    assert SPOT_ON_BONUS > max(max(v.values()) for v in POINTS.values())


def answers_on_q1(*rows):
    """Forecasts on Q1, which happened on 2026-01-01, as (expert, level, version, submitted_at)."""
    table = pd.DataFrame(rows, columns=["expert_id", "answer_level", "version", "submitted_at"])
    return table.assign(question_id="Q1")


def points_of(table):
    scored = score_forecasts(table, questions())
    return dict(zip(scored.expert_id, scored.points))


def test_an_expert_who_warned_a_day_before_it_happened_scores():
    assert points_of(answers_on_q1(("E1", "very_likely", 1, "2025-12-31"))) == {"E1": 3}


def test_a_first_answer_after_it_happened_earns_nothing():
    assert points_of(answers_on_q1(("E1", "very_likely", 1, "2026-01-02"))) == {}


def test_an_answer_on_the_day_it_happened_earns_nothing():
    assert points_of(answers_on_q1(("E1", "very_likely", 1, "2026-01-01"))) == {}


def test_points_use_the_changed_answer_when_it_came_before_it_happened():
    table = answers_on_q1(("E1", "unlikely", 1, "2025-06-01"), ("E1", "very_likely", 2, "2025-12-01"))
    assert points_of(table) == {"E1": 3}


def test_a_change_after_it_happened_leaves_the_earlier_answer_in_place():
    table = answers_on_q1(("E1", "unlikely", 1, "2025-06-01"), ("E1", "very_likely", 2, "2026-01-10"))
    assert points_of(table) == {"E1": -3}


def test_a_change_to_dont_know_means_no_points():
    table = answers_on_q1(("E1", "very_likely", 1, "2025-06-01"), ("E1", "dont_know", 2, "2025-12-01"))
    assert points_of(table) == {}


def test_a_risk_that_did_not_happen_has_no_cut_off_date():
    table = pd.DataFrame({"expert_id": ["E1"], "answer_level": ["unlikely"], "version": [1],
                          "submitted_at": ["2026-01-31"], "question_id": ["Q2"]})
    assert points_of(table) == {"E1": 2}


def group_inputs():
    ids = ["E1", "E2", "E3", "E4", "E5"]
    ranks = pd.DataFrame({"expert_id": ids, "average_points": [3.0, 2.0, 1.0, 0.5, None],
                          "position": [1, 2, 3, 4, None]})
    countries = pd.DataFrame({"expert_id": ids + ["E1", "E1"], "country": ["Chad"] * 5 + ["Mali", "Peru"],
                              "status": ["approved"] * 4 + ["approved", "approved", "denied"]})
    domains = pd.DataFrame({"expert_id": ["E1", "E2", "E3", "E1", "E2", "E3"], "category_id": [1, 1, 1, 0, 0, 0],
                            "status": ["approved"] * 6})
    categories = pd.DataFrame({"category_id": [0, 1], "name": ["No match", "Flood"]})
    return ranks, countries, domains, categories


def test_group_ranks_compare_experts_inside_a_country():
    groups = build_group_ranks(*group_inputs())
    chad = groups[groups.group == "Chad"].set_index("expert_id")
    assert (chad.loc["E2", "position"], chad.loc["E2", "out_of"]) == (2, 4)
    assert chad.loc["E2", "group_type"] == "country"


def test_group_ranks_cover_domains_by_name():
    groups = build_group_ranks(*group_inputs())
    flood = groups[groups.group == "Flood"].set_index("expert_id")
    assert (flood.loc["E3", "position"], flood.loc["E3", "out_of"]) == (3, 3)
    assert flood.loc["E3", "group_type"] == "domain"


def test_experts_without_a_position_are_left_out_of_group_ranks():
    assert "E5" not in set(build_group_ranks(*group_inputs()).expert_id)


def test_a_group_under_three_ranked_experts_is_hidden():
    assert "Mali" not in set(build_group_ranks(*group_inputs()).group)


def test_denied_countries_and_the_no_match_domain_are_not_groups():
    assert not {"Peru", "No match"} & set(build_group_ranks(*group_inputs()).group)


def test_rank_for_app_lists_the_experts_groups():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), min_forecasts=1)
    groups = pd.DataFrame({"expert_id": ["E1", "E1", "E2"], "group_type": ["domain", "country", "country"],
                           "group": ["Flood", "Chad", "Chad"], "position": [2, 1, 3], "out_of": [5, 4, 4]})
    assert rank_for_app(ranks, "E1", groups)["groups"] == [
        {"type": "country", "name": "Chad", "position": 1, "out_of": 4},
        {"type": "domain", "name": "Flood", "position": 2, "out_of": 5}]


def test_rank_for_app_has_the_agreed_format():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), {"E1": 5}, min_forecasts=1)
    assert rank_for_app(ranks, "E1") == {"points": 10, "average_points": 5.0, "position": 1, "out_of": 2,
                                         "forecasts": 2, "calls": 2, "correct": 2, "groups": []}


def test_rank_for_app_without_a_position():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts())
    assert rank_for_app(ranks, "E3") == {"points": 0, "average_points": None, "position": None, "out_of": 0,
                                         "forecasts": 0, "calls": 0, "correct": 0, "groups": []}


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

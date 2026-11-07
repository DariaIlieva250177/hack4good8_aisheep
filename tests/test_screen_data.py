from pathlib import Path

import pandas as pd
import pytest

from build_demo_data import build
from expert_stats import alerts_for_app, build_contributions, contributions_for_app, exposure_floor
from synthetic_data import CONFIG, LEVELS, build_all, group_answer, validate

EXPORT = Path(__file__).resolve().parent.parent / "data" / "risk-radar-export.csv"
TODAY = pd.Timestamp(CONFIG["today"])


@pytest.fixture(scope="module")
def tables():
    return build_all(EXPORT, CONFIG)[0]


@pytest.fixture(scope="module")
def bundle():
    return build()[3]


# regions
def test_every_country_has_a_region_and_a_map_code(tables):
    countries = tables["countries"]
    used = set(tables["risk_countries"].country) | set(tables["expert_countries"].country)
    assert used <= set(countries.country)
    assert countries.region.notna().all()
    assert countries.iso_numeric.str.fullmatch(r"\d{3}").all()


def test_a_country_missing_from_the_list_is_caught(tables):
    broken = dict(tables, countries=tables["countries"].iloc[1:])
    assert any("countries" in p for p in validate(broken))


# community names
def test_community_names_come_from_the_country_and_category(tables):
    risks = tables["risks"].set_index("risk_id")
    assert risks.loc["R1043", "community_name"] == "Chad: Cross-border insecurity"
    assert risks.community_name.notna().all()


# one end date
def test_an_open_risk_ends_when_its_months_run_out(tables):
    questions = tables["forecast_questions"].query("not is_backtest").set_index("risk_id")
    windows = tables["risk_windows"].set_index("risk_id")
    assert (windows.closes == questions.resolves_on.reindex(windows.index)).all()


def test_the_demo_risk_ends_after_two_months(tables):
    question = tables["forecast_questions"].set_index("risk_id").loc["R1043"]
    assert question.horizon_months == 2
    assert question.resolves_on == pd.Timestamp("2027-01-01")


def test_questions_have_no_separate_closing_date(tables):
    assert "closes" not in tables["forecast_questions"].columns


def test_no_open_risk_has_ended_already(tables):
    assert (tables["risk_windows"].closes > TODAY).all()


# date it happened
def test_only_past_risks_that_happened_have_a_date(tables):
    questions = tables["forecast_questions"]
    happened = questions[questions.outcome == 1]
    assert happened.happened_on.notna().all()
    assert questions[questions.outcome != 1].happened_on.isna().all()


def test_the_new_date_changes_no_past_forecast(tables):
    past = tables["forecasts"].merge(tables["forecast_questions"].query("is_backtest"), on="question_id")
    assert (past.submitted_at < past.happened_on.fillna(pd.Timestamp("2100-01-01"))).all()


# changed forecasts
def changed(tables):
    forecasts = tables["forecasts"]
    return forecasts[forecasts.version == 2]


def test_a_changed_forecast_points_back_to_the_first_one(tables):
    forecasts = tables["forecasts"].set_index("forecast_id")
    rows = changed(tables)
    assert len(rows) > 0
    first = forecasts.loc[rows.previous_forecast_id]
    assert (first.expert_id.values == rows.expert_id.values).all()
    assert (first.question_id.values == rows.question_id.values).all()
    assert (first.version == 1).all()


def test_a_forecast_moves_one_step_towards_the_new_opinion(tables):
    forecasts = tables["forecasts"].set_index("forecast_id")
    risk_of = tables["forecast_questions"].set_index("question_id").risk_id
    stances = tables["stances"].query("version == 2").set_index(["expert_id", "risk_id"]).stance
    for _, row in changed(tables).iterrows():
        before = LEVELS.index(forecasts.loc[row.previous_forecast_id, "answer_level"])
        step = 1 if stances[(row.expert_id, risk_of[row.question_id])] == "agree" else -1
        assert LEVELS.index(row.answer_level) == before + step


def test_changed_forecasts_only_exist_on_open_risks(tables):
    open_questions = set(tables["forecast_questions"].query("not is_backtest").question_id)
    assert set(changed(tables).question_id) <= open_questions


def test_a_third_forecast_is_caught(tables):
    third = changed(tables).head(1).assign(version=3, forecast_id="F99999")
    broken = dict(tables, forecasts=pd.concat([tables["forecasts"], third]))
    assert "an expert changed a forecast more than once" in validate(broken)


# alerts
def test_alerts_use_the_agreed_kinds(tables):
    assert set(tables["notifications"].kind) == {"new_risk", "reply", "result"}


def test_new_risk_alerts_only_go_to_matching_experts(tables):
    alerts = tables["notifications"].query("kind == 'new_risk'")
    matches = set(zip(tables["expert_risk_matches"].expert_id, tables["expert_risk_matches"].risk_id))
    assert set(zip(alerts.expert_id, alerts.risk_id)) <= matches


def test_reply_alerts_only_go_to_experts_who_answered_that_risk(tables):
    alerts = tables["notifications"].query("kind == 'reply'")
    members = set(zip(tables["stances"].expert_id, tables["stances"].risk_id))
    assert set(zip(alerts.expert_id, alerts.risk_id)) <= members


def test_result_alerts_only_exist_for_past_risks(tables):
    alerts = tables["notifications"].query("kind == 'result'")
    past = set(tables["forecast_questions"].query("is_backtest").risk_id)
    assert set(alerts.risk_id) <= past


def test_nobody_gets_two_alerts_of_the_same_kind_for_one_risk(tables):
    assert not tables["notifications"].duplicated(["expert_id", "kind", "risk_id"]).any()


def test_alerts_are_read_after_they_arrive_and_never_in_the_future(tables):
    alerts = tables["notifications"].dropna(subset=["read_at"])
    assert (alerts.read_at >= alerts.created_at).all()
    assert (alerts.read_at <= TODAY).all()
    assert (tables["notifications"].created_at <= TODAY).all()


def test_some_alerts_are_still_unread(tables):
    assert tables["notifications"].read_at.isna().any()


def alert(risk_id, created, read_at=None, kind="result"):
    return {"notification_id": f"N-{risk_id}", "expert_id": "E1", "kind": kind, "risk_id": risk_id,
            "created_at": pd.Timestamp(created), "read_at": read_at}


def alert_risks():
    return pd.DataFrame({"risk_id": ["R1", "R2", "R3"], "community_name": ["Chad: Flood", "Mali: Flood", "Peru: Flood"]})


def test_alerts_for_the_app_come_newest_first_with_readable_text():
    table = pd.DataFrame([alert("R1", "2026-01-01"), alert("R2", "2026-03-01", kind="new_risk")])
    items = alerts_for_app(table, "E1", alert_risks())
    assert [a["risk_id"] for a in items] == ["R2", "R1"]
    assert items[0]["text"] == "New risk for you: Mali: Flood"
    assert items[1]["text"] == "Your forecast on Chad: Flood has resolved"
    assert items[0]["unread"] is True


def test_the_example_alert_comes_first_even_when_it_is_older():
    table = pd.DataFrame([alert("R1", "2026-01-01"), alert("R2", "2026-03-01")])
    items = alerts_for_app(table, "E1", alert_risks(), first_risk_id="R1")
    assert items[0]["risk_id"] == "R1"


def test_alerts_for_the_app_only_hold_that_experts_alerts():
    table = pd.DataFrame([alert("R1", "2026-01-01"), dict(alert("R2", "2026-02-01"), expert_id="E2")])
    assert [a["risk_id"] for a in alerts_for_app(table, "E1", alert_risks())] == ["R1"]


def test_the_alert_list_has_a_limit_but_keeps_the_example():
    rows = [alert(f"R{i}", f"2026-01-{i + 1:02d}") for i in range(3)]
    risks = pd.DataFrame({"risk_id": ["R0", "R1", "R2"], "community_name": ["a", "b", "c"]})
    items = alerts_for_app(pd.DataFrame(rows), "E1", risks, first_risk_id="R0", limit=2)
    assert [a["risk_id"] for a in items] == ["R0", "R2"]


# unread counts
def test_only_experts_who_answered_have_read_a_discussion(tables):
    reads = tables["discussion_reads"]
    members = set(zip(tables["stances"].expert_id, tables["stances"].risk_id))
    assert set(zip(reads.expert_id, reads.risk_id)) == members


def test_nobody_reads_a_discussion_before_they_answer_it(tables):
    first = tables["stances"].groupby(["expert_id", "risk_id"]).given_at.min().rename("first").reset_index()
    reads = tables["discussion_reads"].merge(first, on=["expert_id", "risk_id"])
    assert (reads.last_read_at >= reads["first"]).all()
    assert (reads.last_read_at <= TODAY).all()


# contributions
@pytest.mark.parametrize("band,people", [(">500,000", 500000), ("100,000-250,000", 100000), ("<20,000", 0),
                                         (None, 0), (float("nan"), 0)])
def test_exposure_floor_takes_the_lowest_number_the_band_allows(band, people):
    assert exposure_floor(band) == people


def contribution_tables():
    empty = pd.DataFrame(columns=["expert_id", "risk_id"])
    questions = pd.DataFrame({"question_id": ["Q1", "Q2"], "risk_id": ["R1", "R2"]})
    return {
        "stances": pd.DataFrame({"expert_id": ["E1"], "risk_id": ["R1"], "version": [1]}),
        "comments": pd.DataFrame({"expert_id": ["E1", "E2"], "risk_id": ["R1", "R1"], "kind": ["answer", "answer"]}),
        "sources": empty,
        "forecasts": pd.DataFrame({"expert_id": ["E1", "E1"], "question_id": ["Q1", "Q2"], "version": [1, 1]}),
        "forecast_questions": questions,
        "risk_countries": pd.DataFrame({"risk_id": ["R1", "R2", "R2"], "country": ["Chad", "Chad", "Mali"]}),
        "countries": pd.DataFrame({"country": ["Chad", "Mali"], "iso_numeric": ["148", "466"],
                                   "region": ["Central Africa", "West Africa"]}),
        "risks": pd.DataFrame({"risk_id": ["R1", "R2"], "expected_exposure": [">500,000", "20,000-100,000"]}),
    }


def test_contributions_count_each_kind_per_country():
    table = build_contributions(contribution_tables())
    chad = table[(table.expert_id == "E1") & (table.country == "Chad")].iloc[0]
    assert (chad.votes, chad.comments, chad.sources, chad.forecasts, chad.total) == (1, 1, 0, 2, 4)
    assert chad.region == "Central Africa"


def test_a_risk_across_two_countries_counts_in_both():
    table = build_contributions(contribution_tables())
    mali = table[(table.expert_id == "E1") & (table.country == "Mali")].iloc[0]
    assert mali.total == 1


def test_the_app_total_counts_a_contribution_once():
    tables = contribution_tables()
    summary = contributions_for_app(build_contributions(tables), tables, "E1", resolved_forecasts=1)
    assert summary["total"] == 4
    assert summary["country_count"] == 2
    assert summary["region_count"] == 2
    assert summary["resolved_forecasts"] == 1
    assert summary["countries"][0] == {"country": "Chad", "iso_numeric": "148", "region": "Central Africa", "count": 4}


def test_changing_an_answer_is_not_another_contribution():
    tables = contribution_tables()
    before = contributions_for_app(build_contributions(tables), tables, "E1", resolved_forecasts=0)
    changed = dict(tables)
    changed["stances"] = pd.concat([tables["stances"], pd.DataFrame(
        {"expert_id": ["E1"], "risk_id": ["R1"], "version": [2]})])
    changed["forecasts"] = pd.concat([tables["forecasts"], pd.DataFrame(
        {"expert_id": ["E1"], "question_id": ["Q1"], "version": [2]})])
    changed["comments"] = pd.concat([tables["comments"], pd.DataFrame(
        {"expert_id": ["E1"], "risk_id": ["R1"], "kind": ["changed_opinion"]})])
    after = contributions_for_app(build_contributions(changed), changed, "E1", resolved_forecasts=0)
    assert after["total"] == before["total"]
    assert after["countries"] == before["countries"]


def test_people_in_areas_counts_each_risk_once():
    tables = contribution_tables()
    summary = contributions_for_app(build_contributions(tables), tables, "E1", resolved_forecasts=0)
    assert summary["people_in_areas"] == 520000


# hand-written demo comments
WRITTEN = pd.read_csv(EXPORT.parent / "r1043_comments.csv").set_index("comment_id").text


def demo_comments(tables):
    return tables["comments"].query("risk_id == 'R1043'").set_index("comment_id")


def test_every_comment_on_the_demo_risk_is_hand_written(tables):
    comments = demo_comments(tables)
    assert set(comments.index) == set(WRITTEN.index)
    assert (comments.text == WRITTEN.reindex(comments.index)).all()


def test_the_written_comments_are_all_different(tables):
    assert demo_comments(tables).text.is_unique


def test_comments_on_other_risks_keep_their_simulated_text(tables):
    others = tables["comments"].query("risk_id != 'R1043'")
    assert not set(others.text) & set(WRITTEN)


def test_a_source_carries_the_same_text_as_its_comment(tables):
    comments = demo_comments(tables).dropna(subset=["source_id"])
    sources = tables["sources"].set_index("source_id")
    assert len(comments) > 0
    assert (sources.loc[comments.source_id, "final_text"].values == comments.text.values).all()


def test_the_app_shows_the_written_comments(bundle):
    shown = {c["comment_id"]: c["text"] for c in bundle["details"]["R1043"]["community"]["comments"]}
    assert shown == WRITTEN.to_dict()


# the app file
def test_the_ranking_screen_gets_country_and_domain_ranks(bundle):
    groups = {g["name"]: g for g in bundle["expert"]["rank"]["groups"]}
    assert (groups["Chad"]["position"], groups["Chad"]["out_of"]) == (4, 5)
    assert groups["Chad"]["type"] == "country"
    assert groups["Armed conflict"]["type"] == "domain"
    assert "Algeria" not in groups


def test_the_app_has_contributions_for_the_demo_expert(bundle):
    summary = bundle["expert"]["contributions"]
    assert summary["total"] > 0
    assert summary["country_count"] == len(summary["countries"])
    assert summary["resolved_forecasts"] == bundle["expert"]["rank"]["forecasts"]


def test_the_first_alert_opens_the_example_result(bundle):
    assert bundle["alerts"][0]["kind"] == "result"
    assert bundle["alerts"][0]["risk_id"] == bundle["results"][0]["risk_id"]


def test_the_app_counts_every_unread_alert(bundle, tables):
    unread = tables["notifications"].query("expert_id == @bundle['expert']['expert_id'] and read_at != read_at")
    assert bundle["alerts_unread"] == len(unread)


def test_every_result_alert_in_the_app_has_a_result_card(bundle):
    results = {r["risk_id"] for r in bundle["results"]}
    assert {a["risk_id"] for a in bundle["alerts"] if a["kind"] == "result"} <= results


def test_discussions_carry_a_name_and_an_unread_count(bundle):
    group = bundle["details"]["R1043"]["community"]
    assert group["name"] == "Chad: Cross-border insecurity"
    assert group["unread"] == len(group["comments"])


def test_cards_carry_the_community_name(bundle):
    assert bundle["deck"][0]["community_name"] == "Chad: Cross-border insecurity"


def test_group_numbers_still_come_from_the_latest_votes(tables):
    votes = tables["stances"].query("risk_id == 'R1043'").sort_values("version").groupby("expert_id").tail(1)
    assert group_answer(votes)["answers"] == votes.expert_id.nunique()

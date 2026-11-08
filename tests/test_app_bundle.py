"""The tables behind the chats and suggestions, the demo expert's starting point and the app file."""
import json
from pathlib import Path

import pandas as pd
import pytest

from app_bundle import analysis_for, split_citations
from build_demo_data import build
from points import add_accuracy
from synthetic_data import validate

EXPORT = Path(__file__).resolve().parent.parent / "data" / "risk-radar-export.csv"
DEMO = "E041"
ANSWERED = {"R1049", "R1053", "R1074"}
LATER = {"R1042", "R1054"}


@pytest.fixture(scope="module")
def built():
    return build()


@pytest.fixture(scope="module")
def tables(built):
    return built[0]


@pytest.fixture(scope="module")
def bundle(built):
    return built[3]


def test_the_new_tables_link_up(tables):
    assert validate(tables) == []


# suggestions
def test_suggestions_match_the_add_your_own_card_form(tables):
    suggestions = tables["suggestions"]
    assert {"statement", "area", "why", "status", "posted_risk_id"} <= set(suggestions.columns)
    assert not {"type", "risk_id", "title", "description"} & set(suggestions.columns)
    assert set(suggestions.status) <= {"new", "approved", "rejected", "posted"}


def test_the_queue_has_new_and_approved_suggestions(tables):
    assert {"new", "approved"} <= set(tables["suggestions"].status)


def test_only_a_reviewed_suggestion_names_its_reviewer(tables):
    suggestions = tables["suggestions"]
    assert suggestions[suggestions.status == "new"].reviewed_by.isna().all()
    assert suggestions[suggestions.status != "new"].reviewed_by.notna().all()


def test_suggesting_a_missing_trigger_is_gone(tables):
    assert (tables["triggers"].source == "acaps").all()
    assert not {"suggestion_id", "suggested_by"} & set(tables["triggers"].columns)


# replies under answers
def test_a_reply_sits_under_a_top_level_comment_on_the_same_risk(tables):
    comments = tables["comments"]
    replies = comments[comments.kind == "reply"]
    parents = comments[comments.kind != "reply"].set_index("comment_id")
    assert len(replies) > 0
    assert replies.reply_to.isin(parents.index).all()
    assert (parents.loc[replies.reply_to, "risk_id"].values == replies.risk_id.values).all()


def test_nobody_replies_to_themselves(tables):
    comments = tables["comments"]
    replies = comments[comments.kind == "reply"]
    author = comments.set_index("comment_id").expert_id
    assert (author.loc[replies.reply_to].values != replies.expert_id.values).all()


def test_a_reply_comes_from_someone_who_answered_that_risk(tables):
    comments = tables["comments"]
    replies = comments[comments.kind == "reply"]
    answered = set(zip(tables["stances"].expert_id, tables["stances"].risk_id))
    assert set(zip(replies.expert_id, replies.risk_id)) <= answered


def test_a_hidden_name_stays_hidden_on_replies(tables):
    comments, stances = tables["comments"], tables["stances"]
    hidden = set(map(tuple, stances[stances.name_hidden_from_acaps][["expert_id", "risk_id"]].values))
    replies = comments[comments.kind == "reply"]
    assert all(flag == ((e, r) in hidden) for flag, e, r in
               zip(replies.name_hidden_from_acaps, replies.expert_id, replies.risk_id))


def test_replies_are_written_after_their_parent(tables):
    comments = tables["comments"]
    replies = comments[comments.kind == "reply"]
    posted = comments.set_index("comment_id").posted_at
    assert (pd.to_datetime(replies.posted_at).values >= pd.to_datetime(posted.loc[replies.reply_to]).values).all()


def test_the_demo_risk_has_written_replies(tables):
    comments = tables["comments"]
    written = pd.read_csv(EXPORT.parent / "r1043_replies.csv", encoding="utf-8")
    replies = comments[(comments.kind == "reply") & (comments.risk_id == "R1043")]
    assert set(written.text) <= set(replies.text)


# moderator messages and summaries
def test_moderator_messages_are_on_open_risks(tables):
    open_risks = tables["forecast_questions"].query("not is_backtest").risk_id
    messages = tables["moderator_messages"]
    assert len(messages) > 0
    assert messages.risk_id.isin(open_risks).all()


def test_every_closed_chat_has_one_summary(tables):
    past = tables["forecast_questions"].query("is_backtest").risk_id
    summaries = tables["chat_summaries"]
    assert set(summaries.risk_id) == set(past)
    assert summaries.risk_id.is_unique


def test_nothing_the_moderator_writes_says_round(tables):
    text = pd.concat([tables["moderator_messages"].text, tables["chat_summaries"].text])
    assert not text.str.contains(r"\bround", case=False).any()


def test_a_removed_to_do_is_counted_apart_from_a_done_one(tables):
    assert {"open", "done", "removed"} == set(tables["todo_items"].status)


# the demo expert's starting point
def test_the_demo_expert_has_answered_three_risks(tables):
    stances = tables["stances"]
    assert set(stances[stances.expert_id == DEMO].risk_id) == ANSWERED
    questions = tables["forecast_questions"].set_index("risk_id").question_id
    forecasts = tables["forecasts"]
    assert {questions[r] for r in ANSWERED} <= set(forecasts[forecasts.expert_id == DEMO].question_id)


def test_the_demo_expert_has_two_cards_saved_for_later(tables, bundle):
    todo = tables["todo_items"]
    todo = todo[todo.expert_id == DEMO]
    assert set(todo[todo.status == "open"].risk_id) == LATER
    assert set(todo[todo.status == "done"].risk_id) == ANSWERED
    assert set(bundle["todo"]) == LATER


def test_the_demo_risk_is_still_unanswered_and_first(tables, bundle):
    stances = tables["stances"]
    assert "R1043" not in set(stances[stances.expert_id == DEMO].risk_id)
    assert bundle["deck"][0]["risk_id"] == "R1043"


def test_the_deck_leaves_out_what_the_demo_expert_already_handled(bundle):
    assert not {c["risk_id"] for c in bundle["deck"]} & (ANSWERED | LATER)


def test_the_demo_answers_fall_inside_their_chats(tables):
    windows = tables["risk_windows"].set_index("risk_id")
    stances = tables["stances"]
    for _, s in stances[stances.expert_id == DEMO].iterrows():
        assert windows.loc[s.risk_id, "opens"] <= s.given_at <= windows.loc[s.risk_id, "closes"]


def test_the_demo_risk_keeps_its_numbers(bundle):
    group = bundle["chats"]["R1043"]["group"]
    assert (group["answers"], group["agree"], group["weighted_agree"]) == (28, 22, 80)
    assert (group["country_agree"], group["country_answers"]) == (5, 6)


# accuracy
def test_accuracy_is_the_mean_squared_error_of_each_expert():
    ranks = pd.DataFrame({"expert_id": ["E1", "E2"], "points": [1, 2]})
    scored = pd.DataFrame({"expert_id": ["E1", "E1", "E2"], "risk_id": ["R1", "R2", "R1"],
                           "probability": [0.9, 0.3, 0.5], "outcome": [1, 0, 1]})
    risks = pd.DataFrame({"risk_id": ["R1", "R2"], "acaps_p": [0.7, 0.5]})
    table = add_accuracy(ranks, scored, risks).set_index("expert_id")
    assert table.loc["E1", "brier"] == pytest.approx((0.01 + 0.09) / 2)
    assert table.loc["E1", "acaps_brier"] == pytest.approx((0.09 + 0.25) / 2)
    assert table.loc["E2", "brier"] == pytest.approx(0.25)


def test_accuracy_skips_risks_acaps_never_rated():
    ranks = pd.DataFrame({"expert_id": ["E1"], "points": [1]})
    scored = pd.DataFrame({"expert_id": ["E1", "E1"], "risk_id": ["R1", "R2"],
                           "probability": [0.9, 0.3], "outcome": [1, 0]})
    risks = pd.DataFrame({"risk_id": ["R1", "R2"], "acaps_p": [0.7, None]})
    assert add_accuracy(ranks, scored, risks).acaps_brier.iloc[0] == pytest.approx(0.09)


def test_an_expert_with_no_scored_forecast_has_no_accuracy():
    ranks = pd.DataFrame({"expert_id": ["E1"], "points": [0]})
    scored = pd.DataFrame({"expert_id": pd.Series(dtype=str), "risk_id": pd.Series(dtype=str),
                           "probability": pd.Series(dtype=float), "outcome": pd.Series(dtype=int)})
    risks = pd.DataFrame({"risk_id": ["R1"], "acaps_p": [0.7]})
    assert pd.isna(add_accuracy(ranks, scored, risks).brier.iloc[0])


def test_the_ranking_screen_gets_accuracy(bundle):
    rank = bundle["expert"]["rank"]
    assert 0 < rank["brier"] < rank["acaps_brier"]


# ACAPS analysis text
def test_citations_move_out_of_the_text():
    text, sources = split_citations("Refugees arrived ([UNHCR 18/05/2026](https://example.org/a)). More came.")
    assert text == "Refugees arrived. More came."
    assert sources == [{"label": "UNHCR 18/05/2026", "url": "https://example.org/a"}]


def test_a_paragraph_without_citations_is_unchanged():
    assert split_citations("Plain text.") == ("Plain text.", [])


def test_the_analysis_has_paragraphs_and_a_dated_update():
    row = {"rationale": "One.\n\nTwo.", "risk_trend": "Deteriorated", "priority_needs": "Food, Health",
           "rationale_update": "UPDATE 30/09/2026\nStill active.", "source": "https://example.org/b"}
    analysis = analysis_for(row)
    assert analysis["rationale"] == ["One.", "Two."]
    assert analysis["priority_needs"] == ["Food", "Health"]
    assert analysis["update"] == {"date": "30/09/2026", "text": ["Still active."]}
    assert analysis["sources"] == [{"label": "example.org", "url": "https://example.org/b"}]


def test_a_risk_without_an_update_has_none():
    assert analysis_for({"rationale": "One."})["update"] is None


# the expert's file
def test_every_risk_on_a_screen_has_a_card_and_a_chat(bundle):
    ids = ({c["risk_id"] for c in bundle["deck"]} | set(bundle["todo"]) | {a["risk_id"] for a in bundle["my_answers"]}
           | {r["risk_id"] for r in bundle["read_only"]} | {r["risk_id"] for r in bundle["results"]}
           | {a["risk_id"] for a in bundle["alerts"]})
    assert ids <= set(bundle["cards"])
    assert ids <= set(bundle["chats"])


def test_the_demo_expert_has_a_different_name_on_every_risk(bundle, tables):
    names = bundle["expert"]["names"]
    assert set(names) == set(bundle["cards"])
    assert len(set(names.values())) == len(names)
    dn = tables["display_names"]
    mine = dn[dn["expert_id"] == DEMO].set_index("risk_id")["display_name"]
    assert all(names[rid] == name for rid, name in mine.items())
    others = dn[dn["expert_id"] != DEMO]
    assert not any(((others["risk_id"] == rid) & (others["display_name"] == n)).any() for rid, n in names.items())


def test_no_saved_file_keeps_a_plain_recovery_code(built):
    assert "recovery_code" not in built[1].columns


def test_cards_carry_the_acaps_risk_level_not_the_urgency(bundle, tables):
    levels = tables["risks"].set_index("risk_id")["risk_level"]
    watch = next(rid for rid, c in bundle["cards"].items() if c["urgency"] == "watch")
    assert bundle["cards"]["R1043"]["level"] == levels["R1043"] == "High"
    assert bundle["cards"][watch]["level"] == levels[watch] == "Medium"


def test_open_cards_carry_the_full_analysis(bundle):
    assert bundle["cards"]["R1043"]["analysis"]["rationale"]
    assert bundle["cards"]["R1043"]["triggers"][0]["title"]


def test_a_closed_chat_shows_what_happened_and_the_points(bundle):
    result = next(r for r in bundle["results"] if r["risk_id"] != "R1026")
    chat = bundle["chats"][result["risk_id"]]
    assert (chat["outcome"]["points"], chat["outcome"]["you_said"]) == (result["points"], result["you_said"])
    assert chat["summary"]


def test_the_forecast_spread_counts_each_expert_once(bundle, tables):
    spread = bundle["chats"]["R1043"]["forecasts"]
    forecasts = tables["forecasts"]
    answers = forecasts[(forecasts.question_id == "Q-R1043") & (forecasts.answer_level != "dont_know")]
    assert len(spread) == 5
    assert sum(spread) == answers.expert_id.nunique()


def test_a_chat_lists_replies_under_their_answer(bundle):
    comments = bundle["chats"]["R1043"]["comments"]
    assert any(c["replies"] for c in comments)
    assert all(c["verdict"] in ("yes", "no", None) for c in comments)


def test_the_demo_experts_own_comment_is_not_listed_with_the_others(bundle):
    mine = {a["text"] for a in bundle["my_answers"]}
    listed = {c["text"] for chat in bundle["chats"].values() for c in chat["comments"]}
    assert not mine & listed


def test_the_expert_file_names_no_other_expert(bundle):
    text = json.dumps({k: bundle[k] for k in ("cards", "chats", "my_answers")}, ensure_ascii=False)
    assert "expert_id" not in text
    assert not any(f'"E{n:03d}"' in text for n in range(1, 120))


def test_the_expert_file_holds_no_other_experts_rank(bundle):
    assert "experts" not in bundle


def test_the_ranking_screen_gets_the_crises_behind_each_country(bundle):
    top = bundle["expert"]["contributions"]["countries"][0]
    assert top["crises"]
    assert {"title", "exposure"} == set(top["crises"][0])


def test_the_profile_gets_the_panel(bundle):
    assert bundle["expert"]["panel"] == "Chad"
    assert bundle["expert"]["chats_joined"] == len(ANSWERED) + len(bundle["results"])


def test_the_app_never_reads_the_simulation_file():
    source = (EXPORT.parent.parent / "src" / "app_bundle.py").read_text(encoding="utf-8")
    assert "expert_truth" not in source


def test_a_summary_names_the_same_forecast_as_the_final_results(bundle):
    chat = bundle["chats"]["R1026"]
    average = sum((step + 1) * n for step, n in enumerate(chat["forecasts"])) / sum(chat["forecasts"])
    word = ["very unlikely", "unlikely", "an even chance", "likely", "very likely"][int(average + 0.5) - 1]
    assert f"The panel forecast was {word}." in chat["summary"]

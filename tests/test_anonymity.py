from pathlib import Path

import pytest

from synthetic_data import CONFIG, build_all, validate

EXPORT = Path(__file__).resolve().parent.parent / "data" / "risk-radar-export.csv"


@pytest.fixture(scope="module")
def tables():
    return build_all(EXPORT, CONFIG)[0]


def deleted_experts(tables):
    experts = tables["experts"]
    return experts[(experts["anonymity_level"] == "verified_deleted") & (experts["status"] != "pending")]


def test_deleted_experts_keep_no_comment_or_education(tables):
    deleted = deleted_experts(tables)
    assert len(deleted) > 0
    assert deleted[["application_comment", "education_level", "education_field"]].isna().all().all()


def test_other_experts_keep_their_application_details(tables):
    kept = tables["experts"][tables["experts"]["anonymity_level"] != "verified_deleted"]
    assert kept["application_comment"].notna().all()


def test_validate_catches_a_kept_application_comment(tables):
    broken = dict(tables)
    broken["experts"] = tables["experts"].copy()
    broken["experts"].loc[deleted_experts(tables).index[0], "application_comment"] = "I work in Chad."
    assert any("application details" in p for p in validate(broken))


def test_no_expert_reuses_a_display_name(tables):
    assert not tables["display_names"].duplicated(["expert_id", "display_name"]).any()


def test_validate_catches_a_reused_display_name(tables):
    names = tables["display_names"].copy()
    busiest = names["expert_id"].value_counts().index[0]
    first, second = names.index[names["expert_id"] == busiest][:2]
    names.loc[second, "display_name"] = names.loc[first, "display_name"]
    assert any("reuses a display name" in p for p in validate({**tables, "display_names": names}))


def hidden_pairs(tables):
    stances = tables["stances"]
    hidden = stances[stances["hidden_from_acaps"]]
    return set(zip(hidden["expert_id"], hidden["risk_id"]))


def test_a_hidden_answer_hides_the_comment_on_that_risk(tables):
    comments = tables["comments"]
    expected = [pair in hidden_pairs(tables) for pair in zip(comments["expert_id"], comments["risk_id"])]
    assert comments["hidden_from_acaps"].tolist() == expected
    assert any(expected)


def test_a_hidden_answer_hides_the_forecast_on_that_risk(tables):
    forecasts = tables["forecasts"].merge(tables["forecast_questions"][["question_id", "risk_id"]], on="question_id")
    expected = [pair in hidden_pairs(tables) for pair in zip(forecasts["expert_id"], forecasts["risk_id"])]
    assert forecasts["hidden_from_acaps"].tolist() == expected
    assert any(expected)


def test_only_known_experts_can_hide_an_answer(tables):
    levels = tables["experts"].set_index("expert_id")["anonymity_level"]
    for table in ("stances", "comments", "forecasts"):
        hidden = tables[table][tables[table]["hidden_from_acaps"]]
        assert hidden["expert_id"].map(levels).eq("known_to_acaps").all()

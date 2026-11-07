import pandas as pd

from synthetic_data import CONFIG, group_answer


def answers(*rows):
    weights = CONFIG["match_weights"]
    return pd.DataFrame([{"stance": stance, "match_type": match, "match_weight": weights[match]}
                         for stance, match in rows], columns=["stance", "match_type", "match_weight"])


def test_a_higher_weight_vote_counts_for_more():
    local_agrees = group_answer(answers(("agree", "country_and_domain"), ("disagree", "domain_only")))
    local_disagrees = group_answer(answers(("disagree", "country_and_domain"), ("agree", "domain_only")))
    assert local_agrees["weighted_agree"] == 71
    assert local_disagrees["weighted_agree"] == 29


def test_the_plain_counts_treat_every_vote_the_same():
    group = group_answer(answers(("agree", "country_and_domain"), ("disagree", "domain_only")))
    assert (group["answers"], group["agree"], group["disagree"]) == (2, 1, 1)


def test_the_country_line_leaves_out_domain_only_experts():
    group = group_answer(answers(("agree", "country_and_domain"), ("agree", "country_only"),
                                 ("disagree", "country_only"), ("agree", "domain_only")))
    assert (group["country_answers"], group["country_agree"]) == (3, 2)


def test_the_country_line_is_hidden_under_three_answers():
    group = group_answer(answers(("agree", "country_and_domain"), ("agree", "country_only"),
                                 ("agree", "domain_only")))
    assert group["country_answers"] is None
    assert group["country_agree"] is None


def test_a_risk_with_no_answers_has_no_weighted_total():
    group = group_answer(answers())
    assert group["answers"] == 0
    assert group["weighted_agree"] is None

"""
points.py - turns resolved forecasts into points, ranks and the demo expert's results.

Experts earn points once ACAPS records what happened to a risk. The table below is the Brier
score in a form people can read: 12.5 x (0.25 - (p - outcome)^2) with the answer bands
0.1, 0.3, 0.5, 0.7 and 0.9. Experts never see a Brier number.
"""
import re

import pandas as pd

from synthetic_data import _short

POINTS = {
    "very_likely": {1: 3, 0: -7},
    "likely": {1: 2, 0: -3},
    "even_chance": {1: 0, 0: 0},
    "unlikely": {1: -3, 0: 2},
    "very_unlikely": {1: -7, 0: 3},
}
CALL_SIDE = {"very_likely": 1, "likely": 1, "unlikely": 0, "very_unlikely": 0}
SPOT_ON_BONUS = 5
MIN_FORECASTS = 5
MIN_GROUP_EXPERTS = 3
MATCH_ORDER = {"country_and_domain": 0, "country_only": 1, "domain_only": 2}


def final_answers(forecasts, questions):
    """Each expert's last forecast on each question from before the risk happened.

    Answers given after that date still reach ACAPS, but they earn nothing: by then anyone can read
    the news. Risks that did not happen have no date, so all their answers count.
    """
    dated = forecasts.merge(questions[["question_id", "happened_on"]], on="question_id")
    happened = pd.to_datetime(dated["happened_on"])
    in_time = dated[happened.isna() | (pd.to_datetime(dated["submitted_at"]) < happened)]
    return in_time.sort_values("version", kind="stable").groupby(["expert_id", "question_id"]).tail(1)


def score_forecasts(forecasts, questions):
    """One row per scored forecast. Open questions and "don't know" answers are left out."""
    resolved = questions.loc[questions["outcome"].notna(), ["question_id", "risk_id", "outcome", "resolves_on"]]
    answers = final_answers(forecasts, questions)
    scored = answers[answers["answer_level"].isin(POINTS)].merge(resolved, on="question_id")
    scored["outcome"] = scored["outcome"].astype(int)
    scored["points"] = [POINTS[a][o] for a, o in zip(scored["answer_level"], scored["outcome"])]
    scored["is_call"] = scored["answer_level"].isin(CALL_SIDE)
    scored["correct_call"] = [CALL_SIDE.get(a) == o for a, o in zip(scored["answer_level"], scored["outcome"])]
    return scored[["expert_id", "question_id", "risk_id", "answer_level", "outcome", "resolves_on",
                   "points", "is_call", "correct_call"]]


def build_ranks(scored, experts, bonuses=None, min_forecasts=MIN_FORECASTS):
    """Every approved expert, ordered by average points per scored forecast (position 1 = best).

    Using the average means answering more cannot buy a higher rank. Experts with fewer than
    min_forecasts scored forecasts have no position yet. Ties share a position.
    """
    approved = experts.loc[experts["status"] == "approved", "expert_id"]
    per_expert = scored.groupby("expert_id").agg(
        forecast_points=("points", "sum"), forecasts=("points", "size"),
        calls=("is_call", "sum"), correct=("correct_call", "sum"))
    ranks = per_expert.reindex(approved).fillna(0).astype(int)
    ranks["bonus_points"] = pd.Series(bonuses or {}, dtype=float).reindex(ranks.index).fillna(0).astype(int)
    ranks["points"] = ranks["forecast_points"] + ranks["bonus_points"]
    ranks["average_points"] = (ranks["points"] / ranks["forecasts"].where(ranks["forecasts"] > 0)).round(2)
    enough = ranks.loc[ranks["forecasts"] >= min_forecasts, "average_points"]
    ranks["position"] = enough.rank(ascending=False, method="min").astype("Int64")
    ranks = ranks.sort_values(["position", "forecasts"], ascending=[True, False], na_position="last").reset_index()
    return ranks[["expert_id", "points", "average_points", "position", "forecast_points", "bonus_points",
                  "forecasts", "calls", "correct"]]


def build_group_ranks(ranks, expert_countries, expert_domains, categories, min_ranked=MIN_GROUP_EXPERTS):
    """Each expert's position inside their approved countries and domains.

    It compares the same overall average, because no country has enough scored forecasts on its own
    risks yet. A group needs min_ranked ranked experts, so a position always compares real people.
    """
    average = ranks[ranks["position"].notna()].set_index("expert_id")["average_points"]
    names = categories.set_index("category_id")["name"]
    countries = expert_countries[expert_countries["status"] == "approved"]
    domains = expert_domains[(expert_domains["status"] == "approved") & (expert_domains["category_id"] != 0)]
    members = pd.concat([
        countries.assign(group_type="country", group=countries["country"]),
        domains.assign(group_type="domain", group=domains["category_id"].map(names)),
    ])[["expert_id", "group_type", "group"]]
    members = members[members["expert_id"].isin(average.index)].assign(
        average_points=lambda t: t["expert_id"].map(average))
    groups = members.groupby(["group_type", "group"])
    members = members.assign(out_of=groups["expert_id"].transform("size"),
                             position=groups["average_points"].rank(ascending=False, method="min").astype(int))
    members = members[members["out_of"] >= min_ranked]
    return members[["expert_id", "group_type", "group", "position", "out_of"]].reset_index(drop=True)


def add_accuracy(ranks, scored, risks):
    """Adds each expert's Brier score and what ACAPS scored on the same risks. Lower is better."""
    acaps = scored["risk_id"].map(risks.set_index("risk_id")["acaps_p"]).astype(float)
    outcome = scored["outcome"].astype(float)
    errors = pd.DataFrame({"expert_id": scored["expert_id"], "brier": (scored["probability"].astype(float) - outcome) ** 2,
                           "acaps_brier": (acaps - outcome) ** 2})
    return ranks.merge(errors.groupby("expert_id").mean().reset_index(), on="expert_id", how="left")


def rank_for_app(ranks, expert_id, group_ranks=None):
    """The one expert's own rank, as the app reads it in expert.rank. Position is None until they have enough forecasts."""
    row = ranks.set_index("expert_id").loc[expert_id]
    groups = []
    if group_ranks is not None:
        mine = group_ranks[group_ranks["expert_id"] == expert_id].sort_values(["group_type", "position"])
        groups = [{"type": g["group_type"], "name": g["group"], "position": int(g["position"]),
                   "out_of": int(g["out_of"])} for _, g in mine.iterrows()]
    rank = {"points": int(row["points"]),
            "average_points": None if pd.isna(row["average_points"]) else float(row["average_points"]),
            "position": None if pd.isna(row["position"]) else int(row["position"]),
            "out_of": int(ranks["position"].notna().sum()),
            "forecasts": int(row["forecasts"]), "calls": int(row["calls"]), "correct": int(row["correct"]),
            "groups": groups}
    for column in ("brier", "acaps_brier"):
        if column in row and pd.notna(row[column]):
            rank[column] = round(float(row[column]), 3)
    return rank


def sort_deck(deck):
    """Urgency first, then own country and domain, own country, domain, then closing soonest."""
    return sorted(deck, key=lambda c: (-(c["urgency_score"] or 0), MATCH_ORDER[c["match_type"]], c["days_left"]))


def what_happened(row):
    """ACAPS's text on what happened, cut to fit a card. None when ACAPS wrote nothing."""
    for column in ("hazard_materialisation", "impact_materialisation_description"):
        text = row.get(column)
        if isinstance(text, str) and text.strip():
            return _short(re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text), 400)
    return None


def build_results(scored, expert_id, risks, export, spot_on=None):
    """One item per scored forecast of this expert, the spot-on example first, then newest first."""
    mine = scored[scored["expert_id"] == expert_id].sort_values(["resolves_on", "risk_id"], ascending=[False, True])
    risk = risks.set_index("risk_id")
    text = export.set_index("risk_id")
    items = []
    for _, s in mine.iterrows():
        rid = s["risk_id"]
        item = {"risk_id": rid, "title": risk.loc[rid, "title"], "country": risk.loc[rid, "country"],
                "you_said": s["answer_level"], "outcome": "Happened" if s["outcome"] == 1 else "Did not happen",
                "what_happened": what_happened(text.loc[rid]), "points": int(s["points"]),
                "correct_call": bool(s["correct_call"]) if s["is_call"] else None,
                "comment": None, "bonus_points": 0}
        if spot_on and spot_on["risk_id"] == rid:
            item["comment"] = {"text": spot_on["text"], "spot_on": True, "example": True}
            item["bonus_points"] = SPOT_ON_BONUS
        items.append(item)
    return sorted(items, key=lambda i: i["comment"] is None)

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
MATCH_ORDER = {"country_and_domain": 0, "country_only": 1, "domain_only": 2}


def score_forecasts(forecasts, questions):
    """One row per scored forecast. Open questions and "don't know" answers are left out."""
    resolved = questions.loc[questions["outcome"].notna(), ["question_id", "risk_id", "outcome", "resolves_on"]]
    scored = forecasts[forecasts["answer_level"].isin(POINTS)].merge(resolved, on="question_id")
    scored["outcome"] = scored["outcome"].astype(int)
    scored["points"] = [POINTS[a][o] for a, o in zip(scored["answer_level"], scored["outcome"])]
    scored["is_call"] = scored["answer_level"].isin(CALL_SIDE)
    scored["correct_call"] = [CALL_SIDE.get(a) == o for a, o in zip(scored["answer_level"], scored["outcome"])]
    return scored[["expert_id", "question_id", "risk_id", "answer_level", "outcome", "resolves_on",
                   "points", "is_call", "correct_call"]]


def build_ranks(scored, experts, bonuses=None):
    """Every approved expert's total points and position (1 = most points). Ties share a position."""
    approved = experts.loc[experts["status"] == "approved", "expert_id"]
    per_expert = scored.groupby("expert_id").agg(
        forecast_points=("points", "sum"), forecasts=("points", "size"),
        calls=("is_call", "sum"), correct=("correct_call", "sum"))
    ranks = per_expert.reindex(approved).fillna(0).astype(int)
    ranks["bonus_points"] = pd.Series(bonuses or {}, dtype=float).reindex(ranks.index).fillna(0).astype(int)
    ranks["points"] = ranks["forecast_points"] + ranks["bonus_points"]
    ranks["position"] = ranks["points"].rank(ascending=False, method="min").astype(int)
    ranks = ranks.sort_values(["position", "forecasts"], ascending=[True, False]).reset_index()
    return ranks[["expert_id", "points", "position", "forecast_points", "bonus_points", "forecasts", "calls", "correct"]]


def rank_for_app(ranks, expert_id):
    """The one expert's own rank, in the format the app reads as expert.rank."""
    row = ranks.set_index("expert_id").loc[expert_id]
    return {"points": int(row["points"]), "position": int(row["position"]), "out_of": len(ranks),
            "calls": int(row["calls"]), "correct": int(row["correct"])}


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

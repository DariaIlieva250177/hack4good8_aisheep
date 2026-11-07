"""
expert_stats.py - the numbers behind the Ranking and Alerts screens: what an expert has contributed,
where, and which alerts they have waiting.
"""
import re

import pandas as pd

KINDS = ["votes", "comments", "sources", "forecasts"]
ALERT_TEXT = {
    "new_risk": "New risk for you: {name}",
    "reply": "New comments on {name}",
    "result": "Your forecast on {name} has resolved",
}


def exposure_floor(band):
    """The fewest people an ACAPS exposure band allows: ">500,000" is 500,000 and "<20,000" is 0."""
    if not isinstance(band, str) or band.startswith("<"):
        return 0
    return int(re.search(r"[\d,]+", band).group().replace(",", ""))


def activity(tables):
    """One row per contribution: a vote, comment, source or forecast, and the risk it was on.

    Changing an answer is not another contribution, so changed versions are left out.
    """
    risk_of = tables["forecast_questions"].set_index("question_id")["risk_id"]
    forecasts = tables["forecasts"].assign(risk_id=lambda t: t["question_id"].map(risk_of))
    frames = {"votes": tables["stances"].query("version == 1"), "comments": tables["comments"].query("kind == 'answer'"),
              "sources": tables["sources"], "forecasts": forecasts.query("version == 1")}
    rows = [f[["expert_id", "risk_id"]].assign(kind=kind) for kind, f in frames.items() if len(f)]
    return pd.concat(rows, ignore_index=True)


def build_contributions(tables):
    """How much each expert contributed per country. A risk across two countries counts in both."""
    rows = activity(tables).merge(tables["risk_countries"], on="risk_id")
    table = rows.groupby(["expert_id", "country", "kind"]).size().unstack(fill_value=0)
    table = table.reindex(columns=KINDS, fill_value=0)
    table["total"] = table.sum(axis=1)
    table = table.reset_index().merge(tables["countries"][["country", "region"]], on="country")
    return table[["expert_id", "country", "region", *KINDS, "total"]]


def contributions_for_app(contributions, tables, expert_id, resolved_forecasts):
    """The one expert's contributions, as the Ranking screen reads them in expert.contributions."""
    mine = activity(tables).query("expert_id == @expert_id")
    places = contributions[contributions["expert_id"] == expert_id].merge(
        tables["countries"][["country", "iso_numeric"]], on="country")
    places = places.sort_values(["total", "country"], ascending=[False, True])
    exposure = tables["risks"].set_index("risk_id")["expected_exposure"]
    return {"total": len(mine),
            "countries": [{"country": p["country"], "iso_numeric": p["iso_numeric"], "region": p["region"],
                           "count": int(p["total"])} for _, p in places.iterrows()],
            "country_count": len(places),
            "region_count": int(places["region"].nunique()),
            "resolved_forecasts": resolved_forecasts,
            "people_in_areas": sum(exposure_floor(exposure[risk]) for risk in mine["risk_id"].unique())}


def alerts_for_app(notifications, expert_id, risks, first_risk_id=None, limit=12):
    """The expert's alerts, newest first, with the result on first_risk_id at the top."""
    mine = notifications[notifications["expert_id"] == expert_id]
    mine = mine.sort_values("created_at", ascending=False, kind="stable")
    is_first = (mine["risk_id"] == first_risk_id) & (mine["kind"] == "result")
    mine = pd.concat([mine[is_first], mine[~is_first]]).head(limit)
    names = risks.set_index("risk_id")["community_name"]
    return [{"id": a["notification_id"], "kind": a["kind"], "risk_id": a["risk_id"],
             "text": ALERT_TEXT[a["kind"]].format(name=names[a["risk_id"]]),
             "created_at": a["created_at"], "unread": bool(pd.isna(a["read_at"]))}
            for _, a in mine.iterrows()]

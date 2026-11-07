"""
build_demo_data.py - rebuilds all the data with one command:

    python src/build_demo_data.py

It does what notebook 05 does, then adds the points and screen numbers: data/synthetic/ranks.csv,
group_ranks.csv and contributions.csv, plus expert.rank, expert.contributions, results, alerts and
the card order in app/data/expert_demo.json. Run this, not the notebook's save cell, because the
notebook writes the app file without any of those.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from expert_stats import alerts_for_app, build_contributions, contributions_for_app
from points import (SPOT_ON_BONUS, build_group_ranks, build_ranks, build_results, rank_for_app, score_forecasts,
                    sort_deck)
from risk_tools import load_risks
from synthetic_data import CONFIG, _clean, build_all, expert_demo_bundle, save_all, validate

EXPORT = ROOT / "data" / "risk-radar-export.csv"
OUT_DIR = ROOT / "data" / "synthetic"
APP_FILE = ROOT / "app" / "data" / "expert_demo.json"

# Hand-written and synthetic: past risks have no comments, so this one shows how a comment that
# named the real reason earns the spot-on bonus. The app labels it as an example.
SPOT_ON_EXAMPLE = {
    "risk_id": "R1026",
    "text": "Egypt will feel this through food and fertiliser prices and the currency, even if Red Sea shipping holds up.",
}


def build(config=CONFIG):
    tables, truth = build_all(EXPORT, config)
    problems = validate(tables)
    if problems:
        raise ValueError(f"The generated tables have problems: {problems}")

    bundle = expert_demo_bundle(tables, truth, config)
    demo_expert = bundle["expert"]["expert_id"]
    scored = score_forecasts(tables["forecasts"], tables["forecast_questions"])
    if not ((scored["expert_id"] == demo_expert) & (scored["risk_id"] == SPOT_ON_EXAMPLE["risk_id"])).any():
        raise ValueError(f"{demo_expert} has no scored forecast on {SPOT_ON_EXAMPLE['risk_id']}: pick another example")

    ranks = build_ranks(scored, tables["experts"], {demo_expert: SPOT_ON_BONUS})
    group_ranks = build_group_ranks(ranks, tables["expert_countries"], tables["expert_domains"], tables["categories"])
    contributions = build_contributions(tables)
    rank = rank_for_app(ranks, demo_expert, group_ranks)
    alerts = tables["notifications"]

    bundle["deck"] = sort_deck(bundle["deck"])
    bundle["expert"]["rank"] = rank
    bundle["expert"]["contributions"] = contributions_for_app(contributions, tables, demo_expert, rank["forecasts"])
    bundle["results"] = build_results(scored, demo_expert, tables["risks"], load_risks(EXPORT), SPOT_ON_EXAMPLE)
    bundle["alerts"] = alerts_for_app(alerts, demo_expert, tables["risks"], SPOT_ON_EXAMPLE["risk_id"])
    bundle["alerts_unread"] = int(((alerts["expert_id"] == demo_expert) & alerts["read_at"].isna()).sum())
    tables = {**tables, "group_ranks": group_ranks, "contributions": contributions}
    return tables, truth, ranks, _clean(bundle)


def main():
    tables, truth, ranks, bundle = build()
    save_all(tables, truth, OUT_DIR)
    ranks.to_csv(OUT_DIR / "ranks.csv", index=False)
    APP_FILE.parent.mkdir(parents=True, exist_ok=True)
    APP_FILE.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Demo expert:", bundle["expert"]["expert_id"], bundle["expert"]["rank"])
    print("Deck:", [c["risk_id"] for c in bundle["deck"]])
    print("Results:", len(bundle["results"]))


if __name__ == "__main__":
    main()

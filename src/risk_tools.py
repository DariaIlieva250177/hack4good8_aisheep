"""
risk_tools.py - helpers for the ACAPS Ground Truth challenge (put this file in src/).

What is in here
- loading the Risk Radar export with clean column names
- turning ACAPS probability words into numbers
- parsing the Triggers field into separate triggers
- finding dates inside the free-text update history (best effort)
- outcome handling (materialised = 1, not materialised = 0)
- Brier score, calibration table
- synthetic experts, synthetic answers, scoreboard, panel aggregation

Everything about experts here is SIMULATED. It tests the scoring pipeline,
it says nothing about real experts.
"""
import re
import warnings

import numpy as np
import pandas as pd

# ---------------------------------------------------------------- constants
OUTCOME_STATUSES = {"materialised": 1, "not materialised": 0}

# Midpoints of the probability bands. The ACAPS infographic and the methodology PDF
# use slightly different bands, so CONFIRM WITH ALEX which one to use.
PROB_SCHEMES = {
    "infographic": {"very low": 0.10, "low": 0.30, "medium": 0.50, "high": 0.70, "very high": 0.90},
    "pdf":         {"very low": 0.05, "low": 0.22, "medium": 0.50, "high": 0.78, "very high": 0.95},
}

EXPECTED_COLUMNS = [
    "risk_id", "risk_title", "risk_type", "iso", "country", "rationale",
    "probability", "impact", "risk_level", "status", "triggers",
    "expected_exposure", "rationale_update",
]

PSEUDONYMS = ["Heron", "Acacia", "Lynx", "Falcon", "Juniper", "Otter", "Sparrow",
              "Cedar", "Marten", "Willow", "Kestrel", "Alder", "Badger", "Linden", "Plover"]


# ---------------------------------------------------------------- loading
def snake(name):
    """'Risk Level' -> 'risk_level', 'What materialised?' -> 'what_materialised'."""
    return re.sub(r"[^0-9a-zA-Z]+", "_", str(name).strip().lower()).strip("_")


def load_risks(path):
    """Load the CSV and give every column a snake_case name."""
    df = pd.read_csv(path)
    df.columns = [snake(c) for c in df.columns]
    for c in ("status", "risk_level", "probability", "risk_type"):
        if c in df.columns:
            df[c] = df[c].astype("string").str.strip()
    return df


def check_columns(df, expected=EXPECTED_COLUMNS):
    """Return the expected columns that are missing from the data."""
    return [c for c in expected if c not in df.columns]


# ---------------------------------------------------------------- outcomes and probabilities
def add_outcome(df):
    """outcome = 1 if materialised, 0 if not materialised, empty for active / unknown."""
    df = df.copy()
    s = df["status"].astype("string").str.strip().str.lower()
    df["outcome"] = pd.to_numeric(s.map(OUTCOME_STATUSES), errors="coerce")
    return df


def resolved_only(df):
    """Only the risks where we know what happened."""
    out = df[df["outcome"].notna()].copy()
    out["outcome"] = out["outcome"].astype(int)
    return out


def prob_to_number(series, scheme="infographic"):
    """Turn 'Very Low' ... 'Very High' into a number between 0 and 1."""
    mapping = PROB_SCHEMES[scheme]
    s = series.astype("string").str.strip().str.lower().map(mapping)
    return pd.to_numeric(s, errors="coerce")


# ---------------------------------------------------------------- triggers
_TRIGGER = re.compile(
    r"Trigger ID:\s*(?P<id>.+?)\s*\n\s*Title:\s*(?P<title>.+?)\s*\n\s*Description:\s*(?P<desc>.*?)"
    r"(?=\n\s*Trigger ID:|\Z)",
    re.S | re.I,
)


def parse_triggers(text):
    """Split the Triggers text into a list of {trigger_id, title, description}."""
    if text is None or pd.isna(text) or not str(text).strip():
        return []
    t = str(text).replace("\r", "")
    found = [
        {"trigger_id": m["id"].strip(),
         "title": m["title"].strip(),
         "description": " ".join(m["desc"].split())}
        for m in _TRIGGER.finditer(t)
    ]
    if found:
        return found
    lines = [x.strip() for x in t.split("\n") if x.strip()]
    return [{"trigger_id": "unparsed", "title": lines[0][:120], "description": " ".join(lines[1:])}]


def explode_triggers(df):
    """One row per trigger: risk_id, trigger_id, title, description."""
    rows = []
    for _, r in df.iterrows():
        for t in parse_triggers(r.get("triggers")):
            rows.append({"risk_id": r["risk_id"], **t})
    return pd.DataFrame(rows, columns=["risk_id", "trigger_id", "title", "description"])


# ---------------------------------------------------------------- dates (best effort)
_MONTH = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?"
_DATE_PATTERNS = [
    r"\b\d{4}-\d{2}-\d{2}\b",
    r"\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b",
    rf"\b\d{{1,2}}\s+{_MONTH},?\s+\d{{4}}\b",
    rf"\b{_MONTH}\s+\d{{1,2}},?\s+\d{{4}}\b",
    rf"\b{_MONTH}\s+\d{{4}}\b",
]


def find_dates(text):
    """All date-like strings in a text, parsed. Mixed formats, so this is a best effort."""
    if text is None or pd.isna(text):
        return []
    found = []
    earliest, latest = pd.Timestamp("2010-01-01"), pd.Timestamp.today().normalize()
    for pat in _DATE_PATTERNS:
        for m in re.findall(pat, str(text), flags=re.I):
            s = m.replace("Sept", "Sep")
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
                        d = pd.to_datetime(s, format="%Y-%m-%d", errors="coerce")
                    else:
                        d = pd.to_datetime(s, dayfirst=True, errors="coerce")
            except Exception:
                d = pd.NaT
            # skip typos and impossible years (e.g. "0202"), and dates in the future
            if pd.notna(d) and earliest <= d <= latest:
                found.append(d)
    return found


def date_summary(text):
    """(first date, last date, how many) found in a text."""
    d = find_dates(text)
    if not d:
        return pd.NaT, pd.NaT, 0
    return min(d), max(d), len(d)


# ---------------------------------------------------------------- scoring
def brier(p, o):
    """Squared gap between forecast p (0-1) and outcome o (0 or 1), per item. Lower is better."""
    return (np.asarray(p, dtype=float) - np.asarray(o, dtype=float)) ** 2


def calibration_table(p, o, bins=(0, 0.2, 0.4, 0.6, 0.8, 1.0)):
    """Compare forecast bands with how often the event really happened."""
    d = pd.DataFrame({"p": np.asarray(p, dtype=float), "o": np.asarray(o, dtype=float)})
    d["band"] = pd.cut(d["p"], bins=list(bins), include_lowest=True)
    out = d.groupby("band", observed=True).agg(n=("o", "size"),
                                              mean_forecast=("p", "mean"),
                                              observed_rate=("o", "mean"))
    return out.round(2)


# ---------------------------------------------------------------- synthetic experts
def _logit(p):
    p = np.clip(p, 0.02, 0.98)
    return np.log(p / (1 - p))


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


def simulate_experts(n=12, seed=7):
    """Synthetic panel. sim_skill / sim_bias / sim_noise are the hidden truth of the simulation."""
    rng = np.random.default_rng(seed)
    names = list(PSEUDONYMS)
    rng.shuffle(names)
    return pd.DataFrame({
        "expert_id": [f"E{i + 1:02d}" for i in range(n)],
        "pseudonym": [names[i % len(names)] + ("" if i < len(names) else str(i)) for i in range(n)],
        "anonymity_level": rng.choice(["known_to_acaps", "pseudonymous", "anonymous"], size=n, p=[0.3, 0.4, 0.3]),
        "sim_skill": rng.uniform(0.0, 1.0, n).round(2),
        "sim_bias": rng.normal(0, 0.3, n).round(2),
        "sim_noise": rng.uniform(0.3, 1.0, n).round(2),
    })


def simulate_responses(resolved, experts, prior_col="acaps_p", answer_rate=0.6, strength=2.0, seed=11):
    """
    Each expert answers a random part of the resolved risks. Start from the ACAPS rating,
    add private information (more for skilled experts), a personal bias and noise.
    """
    rng = np.random.default_rng(seed)
    rows = []
    for _, e in experts.iterrows():
        for _, r in resolved.iterrows():
            if rng.random() > answer_rate:
                continue
            prior = r[prior_col] if pd.notna(r[prior_col]) else 0.5
            o = int(r["outcome"])
            z = _logit(prior) + e["sim_skill"] * strength * (2 * o - 1) + e["sim_bias"] + rng.normal(0, e["sim_noise"])
            est = float(np.clip(np.round(_sigmoid(z) * 20) / 20, 0.05, 0.95))
            rows.append({"expert_id": e["expert_id"], "risk_id": r["risk_id"], "estimate": est, "outcome": o})
    return pd.DataFrame(rows)


def scoreboard(responses, experts, min_answers=10):
    """Mean Brier score per expert, lowest (best) first. Only pseudonyms are shown."""
    d = responses.assign(brier=brier(responses["estimate"], responses["outcome"]))
    s = d.groupby("expert_id").agg(answers=("brier", "size"), mean_brier=("brier", "mean")).reset_index()
    s = s.merge(experts[["expert_id", "pseudonym"]], on="expert_id")
    s = s[s["answers"] >= min_answers].sort_values("mean_brier").reset_index(drop=True)
    s["rank"] = s.index + 1
    s["mean_brier"] = s["mean_brier"].round(3)
    return s[["rank", "pseudonym", "answers", "mean_brier", "expert_id"]]


def aggregate_panel(responses):
    """Per risk: group mean, median, spread (standard deviation) and number of answers."""
    g = responses.groupby("risk_id").agg(
        panel_mean=("estimate", "mean"),
        panel_median=("estimate", "median"),
        spread=("estimate", "std"),
        n=("estimate", "size"),
        outcome=("outcome", "first"),
    ).reset_index()
    return g
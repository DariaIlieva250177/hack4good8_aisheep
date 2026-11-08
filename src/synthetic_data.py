"""
synthetic_data.py - builds every table of the Ground Truth data model (docs/data_model.md).

REAL (from the ACAPS Risk Radar export): risks, countries, triggers, outcomes.
SYNTHETIC (made up): experts, approvals, anonymity, documents, display names, moderators,
answering windows, card swipes, to-do items, stances, comments, sources, likes, forecasts,
suggested cards, read-only views, moderator messages, chat summaries.

Put this file in src/ next to risk_tools.py. The notebook 05_generate_synthetic_data runs it.

    from synthetic_data import CONFIG, build_all, validate, save_all
    tables, truth = build_all(ROOT / "data" / "risk-radar-export.csv", CONFIG)
"""
import hashlib
import re
from datetime import timedelta

from pathlib import Path
import numpy as np
import pandas as pd

from risk_tools import load_risks, add_outcome, prob_to_number, parse_triggers, PROB_SCHEMES
from screen_tables import (add_demo_answers, build_chat_summaries, build_moderator_messages, build_replies,
                           load_suggestions, mark_removed_todos)

# ======================================================================= settings
CONFIG = {
    "today": "2026-11-06",          # the date the data pretends to be
    "seed": 42,                      # same seed -> same data
    "n_experts": 80,                 # about 80; a few extra are added so R1043 has a full panel
    "prob_scheme": "infographic",    # or "pdf" - confirm with ACAPS
    "match_weights": {"country_and_domain": 1.0, "country_only": 0.6, "domain_only": 0.4},
    "anonymity_mix": {"known_to_acaps": 0.3, "verified_anonymous": 0.4, "verified_deleted": 0.3},
    "status_mix": {"approved": 0.88, "pending": 0.07, "rejected": 0.05},
    "default_horizon_months": 2,
    "demo_risk": "R1043",
    "demo_later": ["R1042", "R1054"],  # cards the demo expert starts with in To-do
    "demo_skill": 0.98,              # simulated skill of the demo expert, so Ranking shows a top place
}

# ======================================================================= categories (domains)
CATEGORIES = [
    (0, "Fallback (no match)", "An empty block of sandy terrain with a faint path across it", "cat-default"),
    (1, "Cross-border insecurity", "A closed boom barrier across an empty sandy road", "cat-border"),
    (2, "Armed conflict", "A low wall of sandbags beside a dirt track", "cat-conflict"),
    (3, "Displacement", "Three plain tents close together on dry ground", "cat-displacement"),
    (4, "Political crisis", "An empty ballot box on a small table", "cat-political"),
    (5, "Economic crisis / prices", "A market balance scale with one empty pan", "cat-economic"),
    (6, "Food insecurity", "A half-empty grain sack, slightly slumped", "cat-food"),
    (7, "Disease outbreak", "A closed medical cool box", "cat-health"),
    (8, "Flood", "A small house with water up to its windows", "cat-flood"),
    (9, "Drought", "Cracked dry soil with one dead stalk", "cat-drought"),
    (10, "Cyclone / storm", "A palm tree bent hard by wind on a coastal block", "cat-storm"),
    (11, "Earthquake / landslide", "A block split by a deep fissure", "cat-earthquake"),
    (12, "Locusts / crop pests", "A single locust on a millet head", "cat-pests"),
    (13, "Infrastructure failure", "A cracked concrete dam wall with a thin stream", "cat-infrastructure"),
    (14, "Aid and funding cuts", "An empty warehouse pallet with loose straps", "cat-funding"),
]
CAT_NAME = {c[0]: c[1] for c in CATEGORIES}

# Keywords searched in a risk's title (its triggers only if the title matches nothing). Checked in
# this order; the first hit is the main category. Each keyword must start a word, and the ones in
# WHOLE_WORD_KEYWORDS must also end it, so "dam" and "war" never match "damage" or "warning".
CATEGORY_KEYWORDS = [
    (1, ["cross-border", "border"]),
    (11, ["earthquake", "landslide", "seismic", "volcan"]),
    (10, ["cyclone", "hurricane", "typhoon", "storm"]),
    (9, ["drought", "dry spell", "dry condition", "below-average", "el niño", "el nino", "water shortage"]),
    (8, ["flood", "inundat", "heavy rain"]),
    (12, ["locust", "pest", "armyworm"]),
    (7, ["cholera", "outbreak", "epidemic", "disease", "measles", "dengue", "mpox", "ebola", "malaria", "diphtheria"]),
    (13, ["dam", "infrastructure", "power outage", "power grid", "electricity", "blackout", "bridge"]),
    (14, ["funding", "aid cut", "aid suspension", "assistance cut", "usaid", "donor"]),
    (4, ["election", "political", "coup", "protest", "unrest", "referendum", "government", "mutiny"]),
    (5, ["economic", "price", "inflation", "currency", "fuel", "devaluation", "debt", "market", "trade"]),
    (6, ["food", "hunger", "famine", "malnutrition", "nutrition", "harvest", "crop"]),
    (3, ["displace", "refugee", "idp", "returnee", "mass return", "migration", "influx", "evict"]),
    (2, ["conflict", "armed", "clash", "violence", "insecurity", "attack", "fighting", "military", "militia", "insurg",
         "war", "drone", "siege", "offensive", "strike"]),
]
WHOLE_WORD_KEYWORDS = {"dam", "war", "idp"}

LEVELS = ["very_unlikely", "unlikely", "even_chance", "likely", "very_likely"]
URGENCY = {  # no green: every risk shown is at least yellow
    "very_urgent": ("Red", "#D64545", "Very urgent", 3),
    "urgent": ("Orange", "#E8873A", "Urgent", 2),
    "watch": ("Yellow", "#E8C547", "Watch", 1),
}

ADJECTIVES = ["Amber", "Quiet", "Swift", "Silver", "Bright", "Calm", "Steady", "Clear", "Bold", "Gentle",
              "Keen", "Patient", "Sharp", "Warm", "Wise", "Brave", "Early", "Northern", "Southern", "Hidden"]
ANIMALS = ["Heron", "Falcon", "Lynx", "Otter", "Kestrel", "Sparrow", "Badger", "Marten", "Plover", "Ibis",
           "Gazelle", "Owl", "Crane", "Fox", "Hare", "Swift", "Egret", "Oryx", "Jackal", "Stork"]


# ======================================================================= helpers
def _ts(s):
    return pd.Timestamp(s).normalize()


def _rand_date(rng, start, end):
    """A random day between start and end (both included)."""
    start, end = _ts(start), _ts(end)
    days = max((end - start).days, 0)
    return start + timedelta(days=int(rng.integers(0, days + 1)))


RECOVERY_WORDS = [
    "acacia", "anchor", "basalt", "beacon", "bridge", "canyon", "cedar", "clover", "comet", "coral",
    "delta", "desert", "ember", "falcon", "fern", "fjord", "glacier", "granite", "harbor", "hazel",
    "heron", "island", "jasper", "juniper", "kestrel", "lagoon", "lantern", "maple", "meadow", "meteor",
    "millet", "monsoon", "nectar", "oasis", "orchid", "otter", "pebble", "pepper", "plateau", "quartz",
    "raven", "reef", "river", "saffron", "savanna", "sierra", "spruce", "summit", "tamarind", "thistle",
    "timber", "tundra", "valley", "velvet", "willow", "zephyr", "amber", "breeze", "copper", "dune",
]


def make_recovery_code(rng, n_words=12):
    """A wallet-style recovery phrase: shown to the expert once, never stored in plain text."""
    return " ".join(rng.choice(RECOVERY_WORDS, size=n_words))


def hash_secret(secret, salt):
    return hashlib.sha256((salt + secret).encode()).hexdigest()


def _short(text, max_chars=280):
    """First two sentences of the rationale, cut to fit a card."""
    if text is None or pd.isna(text):
        return ""
    t = " ".join(str(text).split())
    parts = re.split(r"(?<=[.!?])\s+", t)
    s = " ".join(parts[:2])
    return s if len(s) <= max_chars else s[: max_chars - 1].rsplit(" ", 1)[0] + "…"


def classify_categories(text):
    """All matching category ids in priority order; [0] if nothing matches."""
    t = str(text or "").lower().replace("food insecurity", "food shortage")
    hits = [cid for cid, words in CATEGORY_KEYWORDS if any(_keyword_hit(w, t) for w in words)]
    return hits or [0]


def _keyword_hit(word, text):
    tail = r"s?\b" if word in WHOLE_WORD_KEYWORDS else ""
    return re.search(r"\b" + re.escape(word) + tail, text) is not None


def load_category_overrides(path):
    """Hand-checked categories: {risk_id: [category ids, main first]}. Empty if the file is missing."""
    path = Path(path)
    if not path.exists():
        return {}
    ids = {c[1]: c[0] for c in CATEGORIES}
    table = pd.read_csv(path)
    return {r["risk_id"]: [ids[name.strip()] for name in r["categories"].split(";")] for _, r in table.iterrows()}


def load_countries(path):
    """Every country with its map code and region. Codes stay text so 004 keeps its zeros."""
    return pd.read_csv(path, dtype=str)


def level_probabilities(scheme):
    """five-level answer -> probability, using the same bands as the ACAPS mapping."""
    vals = list(PROB_SCHEMES[scheme].values())  # very low ... very high
    return dict(zip(LEVELS, vals))


def nearest_level(p, level_p):
    return min(level_p, key=lambda k: abs(level_p[k] - p))


def _logit(p):
    p = np.clip(p, 0.02, 0.98)
    return np.log(p / (1 - p))


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


def urgency_for(level, trend, closes, today):
    days_left = (closes - today).days if pd.notna(closes) else 999
    if level == "High" and (trend == "Deteriorated" or days_left <= 2):
        return "very_urgent"
    if level == "High":
        return "urgent"
    return "watch"  # Medium, Low, improving or unknown: yellow


# ======================================================================= 1. real ACAPS tables
def build_reference(export_path, cfg, rng):
    today = _ts(cfg["today"])
    df = add_outcome(load_risks(export_path))
    df["acaps_p"] = prob_to_number(df["probability"], cfg["prob_scheme"])

    def col(name):
        return df[name] if name in df.columns else pd.Series([None] * len(df))

    risks = pd.DataFrame({
        "risk_id": df["risk_id"],
        "title": df["risk_title"],
        "short_explanation": df["rationale"].apply(_short) if "rationale" in df else "",
        "rationale": col("rationale"),
        "country": col("country"),
        "iso": col("iso"),
        "risk_type": col("risk_type"),
        "acaps_probability": df["probability"],
        "acaps_p": df["acaps_p"],
        "impact": col("impact"),
        "risk_level": df["risk_level"],
        "risk_trend": col("risk_trend"),
        "expected_exposure": col("expected_exposure"),
        "priority_needs": col("expected_priority_needs"),
        "status": df["status"],
        "outcome": df["outcome"],
    })

    # plain Python values (None instead of pandas NA) so simple comparisons work
    for c in ["status", "risk_level", "risk_trend", "risk_type", "acaps_probability", "country",
              "priority_needs", "title", "rationale", "iso", "expected_exposure"]:
        risks[c] = risks[c].astype(object).where(risks[c].notna(), None)

    # countries: one row per risk per country
    rc = []
    for _, r in risks.iterrows():
        for c in str(r["country"] or "").split(","):
            if c.strip() and c.strip().lower() != "nan":
                rc.append({"risk_id": r["risk_id"], "country": c.strip()})
    risk_countries = pd.DataFrame(rc, columns=["risk_id", "country"])

    # categories: hand-checked overrides first, then a category column if the export has one, then keywords
    overrides = load_category_overrides(Path(export_path).parent / "risk_category_overrides.csv")
    cat_rows = []
    for i, r in df.iterrows():
        if r["risk_id"] in overrides:
            hits = overrides[r["risk_id"]]
        elif "category" in df.columns and pd.notna(r.get("category")):
            hits = classify_categories(str(r["category"]))
        else:
            hits = classify_categories(r.get("risk_title", ""))
            if hits == [0]:
                hits = classify_categories(r.get("triggers", ""))
        for rank, cid in enumerate(hits):
            cat_rows.append({"risk_id": r["risk_id"], "category_id": cid, "is_primary": rank == 0})
    risk_categories = pd.DataFrame(cat_rows)
    primary = risk_categories[risk_categories["is_primary"]].set_index("risk_id")["category_id"]
    risks["category_id"] = risks["risk_id"].map(primary).fillna(0).astype(int)
    risks["category"] = risks["category_id"].map(CAT_NAME)
    risks["category_image"] = risks["category_id"].map({c[0]: c[3] for c in CATEGORIES})

    categories = pd.DataFrame(CATEGORIES, columns=["category_id", "name", "image_description", "file_name"])

    # triggers from ACAPS
    trig = []
    for _, r in df.iterrows():
        for k, t in enumerate(parse_triggers(r.get("triggers"))):
            tid = t["trigger_id"] if t["trigger_id"] != "unparsed" else f'{r["risk_id"]} - U{k + 1}'
            trig.append({"trigger_id": tid, "risk_id": r["risk_id"], "title": t["title"],
                         "description": t["description"], "source": "acaps"})
    triggers = pd.DataFrame(trig).drop_duplicates("trigger_id")
    return risks, risk_countries, risk_categories, categories, triggers


# ======================================================================= 2. experts and approval
EDU_LEVELS = ["Diploma", "BSc", "BA", "MSc", "MA", "PhD"]
EDU_FIELDS = {
    1: "Security studies", 2: "Conflict studies", 3: "Migration studies", 4: "Political science",
    5: "Economics", 6: "Agronomy", 7: "Public health", 8: "Hydrology", 9: "Climate science",
    10: "Meteorology", 11: "Geology", 12: "Plant protection", 13: "Civil engineering",
    14: "Humanitarian studies", 0: "Humanitarian studies",
}
DENIAL_REASONS = [
    "No document supports this area of expertise",
    "Experience in this area is too indirect",
    "Please add proof of recent work in this area",
]
COMMENT_TEMPLATES = [
    "I have worked on {domain} in {country} for several years and follow local reporting closely.",
    "I coordinate field programmes in {country} and track {domain} risks for my organisation.",
    "Researcher focusing on {domain}; much of my fieldwork has been in {country}.",
    "I lead a local organisation in {country} and see early signs of {domain} problems first-hand.",
]


def build_experts(risks, risk_countries, risk_categories, cfg, rng):
    today = _ts(cfg["today"])
    active_ids = set(risks.loc[risks["status"] == "Active", "risk_id"])
    rc_active = risk_countries[risk_countries["risk_id"].isin(active_ids)]
    all_countries = sorted(risk_countries["country"].unique())
    active_countries = rc_active["country"].tolist() or all_countries
    cat_freq = risk_categories.loc[risk_categories["category_id"] > 0, "category_id"].value_counts()
    cat_pool = cat_freq.index.tolist() or list(range(1, 15))
    cat_weights = (cat_freq / cat_freq.sum()).tolist() if len(cat_freq) else None

    specs = []  # (main country, main category, core?)
    # two "core" experts per active risk, so every card has local and topic experts
    for rid in sorted(active_ids):
        cs = rc_active.loc[rc_active["risk_id"] == rid, "country"].tolist()
        cid = int(risks.loc[risks["risk_id"] == rid, "category_id"].iloc[0])
        for _ in range(2):
            specs.append((cs[0] if cs else rng.choice(all_countries),
                          cid if cid > 0 else int(rng.choice(cat_pool)), True))
    # a full panel for the demo risk
    demo = risks[risks["risk_id"] == cfg["demo_risk"]]
    if not demo.empty:
        demo_country = rc_active.loc[rc_active["risk_id"] == cfg["demo_risk"], "country"]
        demo_country = demo_country.iloc[0] if len(demo_country) else "Chad"
        for cid in [1, 1, 2, 2, 3]:
            specs.append((demo_country, cid, True))
    # everyone else
    while len(specs) < cfg["n_experts"]:
        country = rng.choice(active_countries) if rng.random() < 0.7 else rng.choice(all_countries)
        cid = int(rng.choice(cat_pool, p=cat_weights)) if cat_weights else int(rng.integers(1, 15))
        specs.append((country, cid, False))
    # make sure the approval queue has some pending and rejected applications to show
    forced = {}
    for status, count in [("pending", 4), ("rejected", 2)]:
        for _ in range(count):
            country = rng.choice(active_countries)
            cid = int(rng.choice(cat_pool))
            specs.append((country, cid, False))
            forced[len(specs)] = status

    statuses = list(cfg["status_mix"])
    status_p = list(cfg["status_mix"].values())
    levels = list(cfg["anonymity_mix"])
    level_p = list(cfg["anonymity_mix"].values())

    experts, identity, ecountries, edomains, docs, anon_hist, recovery_codes = [], [], [], [], [], [], []
    for n, (country, cid, core) in enumerate(specs, start=1):
        eid = f"E{n:03d}"
        status = "approved" if core else str(forced.get(n, rng.choice(statuses, p=status_p)))
        if status == "pending":
            registered = _rand_date(rng, today - timedelta(days=10), today - timedelta(days=1))
            reviewed = None
        else:
            registered = _rand_date(rng, today - timedelta(days=365), today - timedelta(days=30))
            reviewed = registered + timedelta(days=int(rng.integers(1, 11)))
        level_at_signup = str(rng.choice(levels, p=level_p))
        moderator = rng.choice(["M01", "M03"])

        # countries asked for (20% ask for a second one)
        asked_c = [country]
        if rng.random() < 0.2:
            other = rng.choice([c for c in all_countries if c != country] or all_countries)
            asked_c.append(other)
        # domains asked for: the main one plus 0-2 more
        pool_d = [c for c in cat_pool if c != cid] or cat_pool
        asked_d = [cid] + [int(x) for x in rng.choice(pool_d, size=min(int(rng.integers(0, 3)), len(pool_d)),
                                                        replace=False)]
        asked_d = list(dict.fromkeys(asked_d))

        for k, c in enumerate(asked_c):
            st = {"approved": "approved", "rejected": "denied", "pending": "pending"}[status]
            if status == "approved" and k > 0 and rng.random() < 0.3:
                st = "denied"  # the monitoring person can deny one of the countries
            ecountries.append({"expert_id": eid, "country": c, "status": st,
                               "reviewed_by": moderator if reviewed is not None else None,
                               "reviewed_at": reviewed,
                               "denial_reason": rng.choice(DENIAL_REASONS) if st == "denied" else None})
        for k, d in enumerate(asked_d):
            st = {"approved": "approved", "rejected": "denied", "pending": "pending"}[status]
            if status == "approved" and k > 0 and rng.random() < 0.25:
                st = "denied"  # each domain is approved separately
            edomains.append({"expert_id": eid, "category_id": d, "status": st,
                             "reviewed_by": moderator if reviewed is not None else None,
                             "reviewed_at": reviewed,
                             "denial_reason": rng.choice(DENIAL_REASONS) if st == "denied" else None})

        # anonymity: 15% of approved experts changed their level later in settings
        current = level_at_signup
        anon_hist.append({"expert_id": eid, "level": level_at_signup, "valid_from": registered,
                          "valid_to": None, "changed_in": "registration"})
        changed_on = None
        if status == "approved" and level_at_signup != "verified_deleted" and rng.random() < 0.15:
            changed_on = _rand_date(rng, reviewed + timedelta(days=5), today - timedelta(days=1)) \
                if reviewed + timedelta(days=5) < today else None
            if changed_on is not None:
                current = str(rng.choice([lv for lv in levels if lv != level_at_signup]))
                anon_hist[-1]["valid_to"] = changed_on
                anon_hist.append({"expert_id": eid, "level": current, "valid_from": changed_on,
                                  "valid_to": None, "changed_in": "settings"})

        # identity: personal details deleted after approval for verified_deleted.
        # Account recovery uses a wallet-style secret code instead of an email: only its hash is stored.
        email = f"expert{n:03d}@example.org"
        deleted = status != "pending" and current == "verified_deleted"
        deleted_on = (changed_on or reviewed) if deleted else None
        code = make_recovery_code(rng)
        code_salt = f"{eid}-{int(rng.integers(10**8, 10**9))}"
        recovery_codes.append({"expert_id": eid, "recovery_code": code})
        identity.append({
            "expert_id": eid,
            "recovery_code_hash": hash_secret(code, code_salt),
            "recovery_code_salt": code_salt,
            "recovery_code_created_at": registered,
            "contact_email": None if deleted else email,
            "full_name": None if deleted else f"Synthetic Expert {n:03d}",
            "organisation": None if deleted else rng.choice(["Example NGO", "Example University",
                                                            "Example UN agency", "Example research institute"]),
            "personal_data_deleted_at": deleted_on,
        })

        # application documents
        for k in range(int(rng.integers(1, 4))):
            dtype = rng.choice(["diploma", "certificate", "cv", "publication"])
            supports = rng.choice(asked_d)
            docs.append({
                "document_id": f"D{n:03d}{k + 1}",
                "expert_id": eid,
                "doc_type": dtype,
                "supports_category_id": int(supports),
                "file_name": None if deleted else f"{eid}_{dtype}_{k + 1}.pdf",
                "uploaded_at": registered,
                "deleted_at": deleted_on,
            })

        experts.append({
            "expert_id": eid,
            "status": status,
            "anonymity_level": current,
            "education_level": rng.choice(EDU_LEVELS, p=[0.1, 0.15, 0.1, 0.35, 0.1, 0.2]),
            "education_field": EDU_FIELDS.get(cid, "Humanitarian studies"),
            "application_comment": rng.choice(COMMENT_TEMPLATES).format(
                domain=CAT_NAME[cid].lower(), country=country),
            "registered_at": registered,
            "reviewed_at": reviewed,
            "reviewed_by": moderator if reviewed is not None else None,
            "language": rng.choice(["English", "French", "Arabic", "Spanish"], p=[0.55, 0.25, 0.1, 0.1]),
        })
        if deleted:  # nothing that could identify them stays after approval
            experts[-1].update(education_level=None, education_field=None, application_comment=None)

    return (pd.DataFrame(experts), pd.DataFrame(identity), pd.DataFrame(ecountries),
            pd.DataFrame(edomains), pd.DataFrame(docs), pd.DataFrame(anon_hist), pd.DataFrame(recovery_codes))


def build_moderators():
    return pd.DataFrame([
        {"moderator_id": "M01", "role": "approver", "label": "ACAPS moderator 1"},
        {"moderator_id": "M02", "role": "moderator", "label": "ACAPS moderator 2"},
        {"moderator_id": "M03", "role": "approver_and_moderator", "label": "ACAPS moderator 3"},
    ])


# ======================================================================= 3. matching
def expert_matches(experts, ecountries, edomains, risk_countries, risk_categories, cfg):
    """For every approved expert and every risk: country_and_domain / country_only / domain_only."""
    approved = experts.loc[experts["status"] == "approved", "expert_id"]
    ec = ecountries[ecountries["status"] == "approved"].groupby("expert_id")["country"].apply(set)
    ed = edomains[edomains["status"] == "approved"].groupby("expert_id")["category_id"].apply(set)
    rc = risk_countries.groupby("risk_id")["country"].apply(set)
    rk = risk_categories[risk_categories["category_id"] > 0].groupby("risk_id")["category_id"].apply(set)
    rows = []
    for eid in approved:
        cs, ds = ec.get(eid, set()), ed.get(eid, set())
        for rid in sorted(set(rc.index) | set(rk.index)):
            c = bool(cs & rc.get(rid, set()))
            d = bool(ds & rk.get(rid, set()))
            if c or d:
                mt = "country_and_domain" if c and d else ("country_only" if c else "domain_only")
                rows.append({"expert_id": eid, "risk_id": rid, "match_type": mt,
                             "match_weight": cfg["match_weights"][mt]})
    return pd.DataFrame(rows, columns=["expert_id", "risk_id", "match_type", "match_weight"])


# ======================================================================= 4. answering windows and questions
def _chat_deadline(rng, opens, today):
    """When a risk's chat closes and answers lock. ACAPS sets this; the export has none, so it is simulated."""
    closes = opens + timedelta(days=int(rng.integers(10, 36)))
    if closes <= today:
        closes = today + timedelta(days=int(rng.integers(1, 15)))
    return closes


def build_windows_and_questions(risks, cfg, rng):
    today = _ts(cfg["today"])
    windows, questions = [], []
    for _, r in risks.iterrows():
        rid = r["risk_id"]
        if r["status"] == "Active":
            if rid == cfg["demo_risk"]:
                opens, closes = today - timedelta(days=5), today + timedelta(days=9)
            else:
                opens = today - timedelta(days=int(rng.integers(1, 22)))
                closes = _chat_deadline(rng, opens, today)
            set_by = rng.choice(["M02", "M03"])
            n = cfg["default_horizon_months"] if rng.random() < 0.7 else int(rng.choice([1, 3, 4, 6]))
            ends = opens + pd.DateOffset(months=n)
            closes = min(closes, ends)  # a chat cannot outlive its risk
            windows.append({"window_id": f"W-{rid}", "risk_id": rid, "opens": opens, "closes": closes,
                            "set_by": set_by})
            original = f"Do you think this will happen in the next {n} months?"
            edited = rng.random() < 0.2
            questions.append({
                "question_id": f"Q-{rid}", "risk_id": rid,
                "question_text": f"Will this situation get worse in the next {n} months?" if edited else original,
                "original_text": original, "horizon_months": n,
                "created_by": "M02", "edited_by": "M03" if edited else None,
                "edited_at": opens + timedelta(days=1) if edited else None,
                "opens": opens, "closes": closes, "resolves_on": ends, "happened_on": None,
                "status": "open", "outcome": None,
                "is_backtest": False,
            })
        elif pd.notna(r["outcome"]):
            # past risks with a known outcome, used to test scoring and ranks
            opens = today - timedelta(days=int(rng.integers(60, 366)))
            ended = min(opens + pd.DateOffset(months=6), today - timedelta(days=1))
            questions.append({
                "question_id": f"QH-{rid}", "risk_id": rid,
                "question_text": "Do you think this will happen?", "original_text": "Do you think this will happen?",
                "horizon_months": 6, "created_by": "M02", "edited_by": None, "edited_at": None,
                # the export has no date for when a risk happened, so past risks use their end date
                "opens": opens, "closes": opens + timedelta(days=14), "resolves_on": ended,
                "happened_on": ended if r["outcome"] == 1 else None,
                "status": "resolved", "outcome": int(r["outcome"]), "is_backtest": True,
            })
    windows = pd.DataFrame(windows)
    risks = risks.merge(windows[["risk_id", "closes"]], on="risk_id", how="left")
    risks["urgency"] = [urgency_for(lv, tr, cl, today) if st == "Active" else None
                        for lv, tr, cl, st in zip(risks["risk_level"], risks["risk_trend"],
                                                  risks["closes"], risks["status"])]
    none = (None, None, None, None)
    for i, c in enumerate(["urgency_colour", "urgency_hex", "urgency_label", "urgency_score"]):
        risks[c] = [URGENCY.get(u, none)[i] if isinstance(u, str) else None for u in risks["urgency"]]
    risks = risks.drop(columns=["closes"])
    risks["community_name"] = risks["country"] + ": " + risks["category"]
    questions = pd.DataFrame(questions)
    questions["happened_on"] = pd.to_datetime(questions["happened_on"])
    return risks, windows, questions


# ======================================================================= 5. expert activity
AGREE_TEXT = [
    "This matches what partners on the ground are reporting.",
    "I agree. The signs are visible already in the areas I cover.",
    "Agree, and I would watch the next few weeks closely.",
    "Yes. Local markets and community leaders point the same way.",
]
DISAGREE_TEXT = [
    "I see less pressure than the analysis suggests in the areas I know.",
    "I disagree with the timing; this looks more likely later in the season.",
    "Local reporting does not support this yet.",
    "The analysis overstates the role of this trigger.",
]
CHANGE_TEXT = [
    "Changed opinion after reading the group discussion and new local reports.",
    "Changed opinion: the latest field updates convinced me.",
]
SOURCE_TITLES = [
    "Field assessment report", "Market monitoring bulletin", "Situation update",
    "Research paper on early warning signals", "Local news investigation",
]


def build_activity(risks, matches, windows, questions, experts, cfg, rng, truth):
    today = _ts(cfg["today"])
    level_p = level_probabilities(cfg["prob_scheme"])
    demo_expert = cfg.get("_demo_expert")
    active = risks[risks["status"] == "Active"].set_index("risk_id")
    win = windows.set_index("risk_id")
    level_of = experts.set_index("expert_id")["anonymity_level"]
    agree_rate = {rid: rng.beta(4, 2) if rng.random() < 0.7 else rng.beta(2, 2) for rid in active.index}

    swipes, todos, stances, comments, sources, forecasts, views = [], [], [], [], [], [], []
    act_matches = matches[matches["risk_id"].isin(active.index)]

    for _, m in act_matches.iterrows():
        eid, rid = m["expert_id"], m["risk_id"]
        if eid == demo_expert:
            continue  # the demo expert starts with an untouched deck
        t = truth.loc[eid]
        if rng.random() > 0.55 + 0.4 * t["sim_activity"]:
            continue  # never saw or never touched this card
        w = win.loc[rid]
        last = min(today, w["closes"])
        at = _rand_date(rng, w["opens"], last)
        gave_stance = rng.random() < 0.55 + 0.35 * t["sim_activity"]
        right = rng.random() < (0.45 if gave_stance else 0.5)
        result = "todo" if right else ("done" if gave_stance else "skipped")
        stance = None
        if gave_stance:
            stance = "agree" if rng.random() < agree_rate[rid] else "disagree"
        swipes.append({"swipe_id": f"S{len(swipes) + 1:05d}", "expert_id": eid, "risk_id": rid,
                       "stance_on_card": stance, "direction": "right" if right else "left",
                       "result": result, "swiped_at": at})

        def add_stance(value, when, version, prev):
            sid = f"ST{len(stances) + 1:05d}"
            stances.append({"stance_id": sid, "expert_id": eid, "risk_id": rid, "stance": value,
                            "version": version, "changed_opinion": version == 2,
                            "previous_stance_id": prev, "given_at": when,
                            "name_hidden_from_acaps": bool(level_of[eid] == "known_to_acaps" and rng.random() < 0.1),
                            "match_type": m["match_type"], "match_weight": m["match_weight"]})
            return sid

        def add_comment(kind, text, when, source_id=None):
            comments.append({"comment_id": f"C{len(comments) + 1:05d}", "risk_id": rid, "expert_id": eid,
                             "kind": kind, "text": text, "source_id": source_id,
                             "ai_draft_used": source_id is not None, "reply_to": None, "posted_at": when})

        first_stance_id = add_stance(stance, at, 1, None) if stance else None

        if result == "todo":
            done = rng.random() < 0.6
            todos.append({"expert_id": eid, "risk_id": rid, "added_at": at,
                          "status": "done" if done else "open",
                          "completed_at": None})
            if done:
                when = min(at + timedelta(days=int(rng.integers(0, 4))), last)
                todos[-1]["completed_at"] = when
                if stance is None and rng.random() < 0.9:
                    stance = "agree" if rng.random() < agree_rate[rid] else "disagree"
                    first_stance_id = add_stance(stance, when, 1, None)
                if stance is not None:
                    text = rng.choice(AGREE_TEXT if stance == "agree" else DISAGREE_TEXT)
                    src_id = None
                    if rng.random() < 0.25:  # attached an article or paper, AI drafted the summary
                        src_id = f"SRC{len(sources) + 1:04d}"
                        draft = f"The source reports developments relevant to this risk. {text}"
                        edited = rng.random() < 0.7
                        final = draft.replace("The source reports", "This source shows") if edited else draft
                        sources.append({"source_id": src_id, "expert_id": eid, "risk_id": rid,
                                        "source_type": rng.choice(["article", "research_paper", "report"]),
                                        "title": rng.choice(SOURCE_TITLES),
                                        "url": f"https://example.org/sources/{src_id.lower()}",
                                        "ai_summary_draft": draft, "final_text": final,
                                        "edited_by_expert": edited, "added_at": when})
                        text = final
                    add_comment("answer", text, when, src_id)

        # change of opinion: allowed once, appears as "Changed opinion" in the same discussion
        if first_stance_id and rng.random() < 0.08:
            when = min(at + timedelta(days=int(rng.integers(1, 5))), last)
            new_value = "disagree" if stance == "agree" else "agree"
            add_stance(new_value, when, 2, first_stance_id)
            add_comment("changed_opinion", rng.choice(CHANGE_TEXT), when)

        # forecast on the risk's question (only experts who answered the card)
        if first_stance_id and rng.random() < 0.7:
            q = questions.loc[questions["risk_id"] == rid].iloc[0]
            base = active.loc[rid, "acaps_p"] if pd.notna(active.loc[rid, "acaps_p"]) else 0.5
            p = float(np.clip(base + rng.normal(0, 0.15) + 0.1 * t["sim_bias"], 0.02, 0.98))
            dont_know = rng.random() < 0.05
            lvl = "dont_know" if dont_know else nearest_level(p, level_p)
            forecasts.append({"question_id": q["question_id"], "expert_id": eid, "answer_level": lvl,
                              "probability": None if dont_know else level_p[lvl],
                              "match_type": m["match_type"], "match_weight": m["match_weight"],
                              "submitted_at": min(at + timedelta(days=int(rng.integers(0, 3))), last)})

    # read-only views of discussions outside the expert's countries and domains
    approved = experts.loc[experts["status"] == "approved", "expert_id"]
    eligible = act_matches.groupby("expert_id")["risk_id"].apply(set)
    for eid in approved:
        outside = sorted(set(active.index) - eligible.get(eid, set()))
        for rid in rng.choice(outside, size=min(len(outside), int(rng.integers(0, 4))), replace=False):
            views.append({"expert_id": eid, "risk_id": rid,
                          "viewed_at": _rand_date(rng, win.loc[rid, "opens"], today)})

    return (pd.DataFrame(swipes), pd.DataFrame(todos), pd.DataFrame(stances), pd.DataFrame(comments),
            pd.DataFrame(sources), pd.DataFrame(forecasts), pd.DataFrame(views))


def build_likes(comments, stances, truth, cfg, rng):
    """Members of a risk's community like comments; better experts get a few more likes."""
    today = _ts(cfg["today"])
    likes = []
    members = stances.groupby("risk_id")["expert_id"].apply(lambda s: sorted(set(s)))
    for _, c in comments.iterrows():
        pool = [e for e in members.get(c["risk_id"], []) if e != c["expert_id"]]
        if not pool:
            continue
        p = 0.1 + 0.25 * truth.loc[c["expert_id"], "sim_comment_quality"]
        for e in pool:
            if rng.random() < p:
                likes.append({"comment_id": c["comment_id"], "expert_id": e,
                              "liked_at": _rand_date(rng, c["posted_at"], today)})
    return pd.DataFrame(likes, columns=["comment_id", "expert_id", "liked_at"])


def build_backtest_forecasts(risks, matches, questions, truth, cfg, rng):
    """Forecasts on past risks. Skilled experts and better-matched experts are more accurate."""
    level_p = level_probabilities(cfg["prob_scheme"])
    relevance = {"country_and_domain": 1.0, "country_only": 0.7, "domain_only": 0.5}
    hq = questions[questions["is_backtest"]].set_index("risk_id")
    acaps_p = risks.set_index("risk_id")["acaps_p"]
    rows = []
    for _, m in matches[matches["risk_id"].isin(hq.index)].iterrows():
        eid, rid = m["expert_id"], m["risk_id"]
        if eid not in truth.index or rng.random() > 0.3 + 0.4 * truth.loc[eid, "sim_activity"]:
            continue
        t, q = truth.loc[eid], hq.loc[rid]
        o = int(q["outcome"])
        prior = acaps_p.get(rid) if pd.notna(acaps_p.get(rid)) else 0.5
        z = (_logit(prior) + t["sim_skill"] * 2.0 * relevance[m["match_type"]] * (2 * o - 1)
             + t["sim_bias"] + rng.normal(0, t["sim_noise"]))
        dont_know = rng.random() < 0.03
        lvl = "dont_know" if dont_know else nearest_level(float(_sigmoid(z)), level_p)
        rows.append({"question_id": q["question_id"], "expert_id": eid, "answer_level": lvl,
                     "probability": None if dont_know else level_p[lvl],
                     "match_type": m["match_type"], "match_weight": m["match_weight"],
                     "submitted_at": q["opens"] + timedelta(days=int(rng.integers(0, 14)))})
    return pd.DataFrame(rows)


def build_display_names(stances, comments, windows, rng):
    """One display name per expert per risk: the same inside that risk's discussion, and never reused
    by that expert on another risk, so two discussions cannot be linked through a name."""
    pairs = pd.concat([stances[["expert_id", "risk_id"]], comments[["expert_id", "risk_id"]]]).drop_duplicates()
    win = windows.set_index("risk_id")
    names = [f"{a} {b}" for a in ADJECTIVES for b in ANIMALS]
    used_by = {}
    rows = []
    for rid, grp in pairs.groupby("risk_id"):
        order = rng.permutation(len(names))
        taken = set()
        for eid in grp["expert_id"]:
            mine = used_by.setdefault(eid, set())
            name = next(names[k] for k in order if names[k] not in taken and names[k] not in mine)
            taken.add(name)
            mine.add(name)
            rows.append({"expert_id": eid, "risk_id": rid, "display_name": name,
                         "valid_from": win.loc[rid, "opens"], "valid_to": win.loc[rid, "closes"]})
    return pd.DataFrame(rows)


def mark_hidden_names(stances, comments, forecasts, questions):
    """A name hidden on a risk stays hidden on that expert's comments and forecast there.

    ACAPS still gets every answer: only the name is hidden.
    """
    hidden = stances[stances["name_hidden_from_acaps"]]
    hidden = set(zip(hidden["expert_id"], hidden["risk_id"]))
    risk_of = questions.set_index("question_id")["risk_id"]
    comments = comments.assign(name_hidden_from_acaps=[pair in hidden for pair in zip(comments["expert_id"], comments["risk_id"])])
    forecasts = forecasts.assign(name_hidden_from_acaps=[(e, risk_of[q]) in hidden for e, q in zip(forecasts["expert_id"], forecasts["question_id"])])
    return comments, forecasts


def apply_written_comments(comments, sources, path):
    """Swaps the demo risk's simulated comments for hand-written ones, which stay synthetic.

    The simulation only has 26 stock sentences, and an expert reading the demo risk would notice.
    A source's text follows the comment it is attached to.
    """
    written = pd.read_csv(path, encoding="utf-8").set_index("comment_id")["text"]
    comments = comments.assign(text=comments["comment_id"].map(written).fillna(comments["text"]))
    attached = comments[comments["comment_id"].isin(written.index)].dropna(subset=["source_id"])
    text_of = attached.set_index("source_id")["text"]
    new_text = sources["source_id"].map(text_of)
    sources = sources.assign(ai_summary_draft=new_text.fillna(sources["ai_summary_draft"]),
                             final_text=new_text.fillna(sources["final_text"]))
    return comments, sources


def add_changed_forecasts(forecasts, stances, questions, cfg):
    """An expert who changes their opinion also moves their forecast one step the same way."""
    forecasts = forecasts.assign(version=1, previous_forecast_id=None)
    level_p = level_probabilities(cfg["prob_scheme"])
    question_of = questions.set_index("risk_id")["question_id"]
    first = {(f["expert_id"], f["question_id"]): f for _, f in forecasts.iterrows()}
    rows = []
    for _, s in stances[stances["changed_opinion"]].iterrows():
        old = first.get((s["expert_id"], question_of[s["risk_id"]]))
        if old is None or old["answer_level"] not in LEVELS:
            continue
        step = LEVELS.index(old["answer_level"]) + (1 if s["stance"] == "agree" else -1)
        if not 0 <= step < len(LEVELS):
            continue
        rows.append({**old.to_dict(), "forecast_id": f"F{len(forecasts) + len(rows) + 1:05d}",
                     "answer_level": LEVELS[step], "probability": level_p[LEVELS[step]],
                     "submitted_at": max(old["submitted_at"], s["given_at"]),
                     "version": 2, "previous_forecast_id": old["forecast_id"]})
    return pd.concat([forecasts, pd.DataFrame(rows)], ignore_index=True)


def build_notifications(matches, stances, comments, forecasts, questions, windows, cfg, rng):
    """The alerts each expert has received. Private message alerts will come with private chat."""
    today = _ts(cfg["today"])
    rows = []
    fresh = windows[windows["opens"] >= today - timedelta(days=NEW_RISK_DAYS)]
    for _, m in matches.merge(fresh, on="risk_id").iterrows():
        rows.append(("new_risk", m["expert_id"], m["risk_id"], m["opens"]))
    for (eid, rid), joined in stances.groupby(["expert_id", "risk_id"])["given_at"].min().items():
        later = comments[(comments["risk_id"] == rid) & (comments["expert_id"] != eid)
                         & (comments["posted_at"] > joined)]
        if len(later):
            rows.append(("reply", eid, rid, later["posted_at"].max()))
    past = questions[questions["is_backtest"]].set_index("question_id")
    answered = forecasts[forecasts["question_id"].isin(past.index) & forecasts["answer_level"].isin(LEVELS)]
    for _, f in answered.iterrows():
        q = past.loc[f["question_id"]]
        rows.append(("result", f["expert_id"], q["risk_id"], q["resolves_on"]))
    table = pd.DataFrame(rows, columns=["kind", "expert_id", "risk_id", "created_at"])
    table = table.sort_values(["created_at", "expert_id", "kind", "risk_id"], ignore_index=True)

    def read_on(created):
        recent = (today - created).days <= UNREAD_DAYS
        return None if recent and rng.random() < 0.5 else _rand_date(rng, created, today)

    table["read_at"] = pd.to_datetime([read_on(c) for c in table["created_at"]])
    table.insert(0, "notification_id", [f"N{i + 1:05d}" for i in range(len(table))])
    return table[["notification_id", "expert_id", "kind", "risk_id", "created_at", "read_at"]]


def build_discussion_reads(stances, cfg, rng):
    """When each expert last opened a discussion they joined, which sets their unread count."""
    today = _ts(cfg["today"])
    joined = stances.groupby(["expert_id", "risk_id"])["given_at"].min().reset_index()
    joined["last_read_at"] = [_rand_date(rng, when, today) for when in joined["given_at"]]
    return joined[["expert_id", "risk_id", "last_read_at"]]


# ======================================================================= build everything
def build_all(export_path, cfg=CONFIG):
    rng = np.random.default_rng(cfg["seed"])
    risks, risk_countries, risk_categories, categories, triggers = build_reference(export_path, cfg, rng)
    experts, identity, ecountries, edomains, docs, anon_hist, recovery_codes = build_experts(
        risks, risk_countries, risk_categories, cfg, rng)
    moderators = build_moderators()

    # hidden simulation values (never part of the app)
    truth = pd.DataFrame({
        "expert_id": experts["expert_id"],
        "sim_skill": rng.uniform(0, 1, len(experts)).round(2),
        "sim_bias": rng.normal(0, 0.3, len(experts)).round(2),
        "sim_noise": rng.uniform(0.3, 1.0, len(experts)).round(2),
        "sim_activity": rng.beta(2, 2, len(experts)).round(2),
    })
    truth["sim_comment_quality"] = (0.6 * truth["sim_skill"] + 0.4 * rng.uniform(0, 1, len(truth))).round(2)
    truth = truth.set_index("expert_id")

    matches = expert_matches(experts, ecountries, edomains, risk_countries, risk_categories, cfg)
    risks, windows, questions = build_windows_and_questions(risks, cfg, rng)

    # the demo expert: approved, matches the demo risk on country and domain, and has the most past
    # risks to forecast on, so the rank and results have something to show
    cfg = dict(cfg)
    dm = matches[(matches["risk_id"] == cfg["demo_risk"]) & (matches["match_type"] == "country_and_domain")]
    past = questions.loc[questions["is_backtest"], "risk_id"]
    past_matches = matches[matches["risk_id"].isin(past)].groupby("expert_id").size()
    by_past = past_matches.reindex(dm["expert_id"]).fillna(0).sort_values(ascending=False, kind="stable")
    cfg["_demo_expert"] = by_past.index[0] if len(by_past) else None
    if cfg["_demo_expert"] is not None and cfg.get("demo_skill") is not None:
        # moves only this expert's past forecasts: skill changes no random draw behind anyone else's answers
        truth.loc[cfg["_demo_expert"], "sim_skill"] = cfg["demo_skill"]

    swipes, todos, stances, comments, sources, act_forecasts, views = build_activity(
        risks, matches, windows, questions, experts, cfg, rng, truth)
    likes = build_likes(comments, stances, truth, cfg, rng)
    hist_forecasts = build_backtest_forecasts(risks, matches, questions, truth, cfg, rng)
    forecasts = pd.concat([act_forecasts, hist_forecasts], ignore_index=True)
    forecasts.insert(0, "forecast_id", [f"F{i + 1:05d}" for i in range(len(forecasts))])
    forecasts = add_changed_forecasts(forecasts, stances, questions, cfg)
    comments, forecasts = mark_hidden_names(stances, comments, forecasts, questions)
    data_dir = Path(export_path).parent
    today = _ts(cfg["today"])
    suggestions = load_suggestions(data_dir / "suggested_cards.csv")
    demo_answers = pd.read_csv(data_dir / "demo_expert_answers.csv", encoding="utf-8")
    added = add_demo_answers(cfg["_demo_expert"], demo_answers, cfg["demo_later"],
                             {"swipes": swipes, "todos": todos, "stances": stances, "comments": comments,
                              "forecasts": forecasts},
                             questions, windows, matches, level_probabilities(cfg["prob_scheme"]))
    swipes, todos, stances, comments, forecasts = (added[k] for k in ("swipes", "todos", "stances", "comments", "forecasts"))

    display_names = build_display_names(stances, comments, windows, rng)
    comments, sources = apply_written_comments(comments, sources, data_dir / "r1043_comments.csv")

    # a separate generator, so these tables cannot shift any value simulated above
    screen_rng = np.random.default_rng(cfg["seed"] + 1)
    notifications = build_notifications(matches, stances, comments, forecasts, questions, windows, cfg, screen_rng)
    discussion_reads = build_discussion_reads(stances, cfg, screen_rng)

    extra_rng = np.random.default_rng(cfg["seed"] + 2)
    replies = build_replies(comments, stances, cfg["_demo_expert"], cfg["demo_risk"], today, extra_rng,
                            data_dir / "r1043_replies.csv")
    comments = pd.concat([comments, replies], ignore_index=True)
    moderator_messages = build_moderator_messages(windows, cfg["demo_risk"], today, extra_rng)
    chat_summaries = build_chat_summaries(questions, forecasts, risks, "M03")
    todos = mark_removed_todos(todos, cfg["_demo_expert"], extra_rng)

    tables = {
        "categories": categories, "countries": load_countries(Path(export_path).parent / "country_regions.csv"),
        "risks": risks, "risk_countries": risk_countries,
        "risk_categories": risk_categories, "triggers": triggers,
        "experts": experts, "expert_identity": identity, "expert_countries": ecountries,
        "expert_domains": edomains, "application_documents": docs, "anonymity_history": anon_hist,
        "moderators": moderators, "expert_risk_matches": matches, "display_names": display_names,
        "risk_windows": windows, "forecast_questions": questions,
        "card_swipes": swipes, "todo_items": todos, "stances": stances, "comments": comments,
        "sources": sources, "comment_likes": likes, "forecasts": forecasts,
        "suggestions": suggestions, "discussion_views": views,
        "notifications": notifications, "discussion_reads": discussion_reads,
        "moderator_messages": moderator_messages, "chat_summaries": chat_summaries,
    }
    # The plain recovery codes are never saved, not even in the simulation file: only their hash is kept
    truth = truth.reset_index()
    truth["is_demo_expert"] = truth["expert_id"] == cfg["_demo_expert"]
    return tables, truth


# ======================================================================= checks and saving
FOREIGN_KEYS = [
    ("risk_countries", "risk_id", "risks", "risk_id"),
    ("risk_countries", "country", "countries", "country"),
    ("expert_countries", "country", "countries", "country"),
    ("notifications", "expert_id", "experts", "expert_id"),
    ("notifications", "risk_id", "risks", "risk_id"),
    ("discussion_reads", "expert_id", "experts", "expert_id"),
    ("discussion_reads", "risk_id", "risks", "risk_id"),
    ("risk_categories", "risk_id", "risks", "risk_id"),
    ("risk_categories", "category_id", "categories", "category_id"),
    ("triggers", "risk_id", "risks", "risk_id"),
    ("expert_identity", "expert_id", "experts", "expert_id"),
    ("expert_countries", "expert_id", "experts", "expert_id"),
    ("expert_domains", "expert_id", "experts", "expert_id"),
    ("expert_domains", "category_id", "categories", "category_id"),
    ("application_documents", "expert_id", "experts", "expert_id"),
    ("anonymity_history", "expert_id", "experts", "expert_id"),
    ("expert_risk_matches", "expert_id", "experts", "expert_id"),
    ("expert_risk_matches", "risk_id", "risks", "risk_id"),
    ("display_names", "expert_id", "experts", "expert_id"),
    ("display_names", "risk_id", "risks", "risk_id"),
    ("risk_windows", "risk_id", "risks", "risk_id"),
    ("forecast_questions", "risk_id", "risks", "risk_id"),
    ("card_swipes", "expert_id", "experts", "expert_id"),
    ("card_swipes", "risk_id", "risks", "risk_id"),
    ("todo_items", "expert_id", "experts", "expert_id"),
    ("stances", "expert_id", "experts", "expert_id"),
    ("stances", "risk_id", "risks", "risk_id"),
    ("comments", "expert_id", "experts", "expert_id"),
    ("comments", "risk_id", "risks", "risk_id"),
    ("comments", "source_id", "sources", "source_id"),
    ("sources", "expert_id", "experts", "expert_id"),
    ("comment_likes", "comment_id", "comments", "comment_id"),
    ("comment_likes", "expert_id", "experts", "expert_id"),
    ("forecasts", "question_id", "forecast_questions", "question_id"),
    ("forecasts", "expert_id", "experts", "expert_id"),
    ("suggestions", "expert_id", "experts", "expert_id"),
    ("suggestions", "reviewed_by", "moderators", "moderator_id"),
    ("comments", "reply_to", "comments", "comment_id"),
    ("moderator_messages", "risk_id", "risks", "risk_id"),
    ("moderator_messages", "moderator_id", "moderators", "moderator_id"),
    ("chat_summaries", "risk_id", "risks", "risk_id"),
    ("chat_summaries", "moderator_id", "moderators", "moderator_id"),
    ("discussion_views", "expert_id", "experts", "expert_id"),
    ("discussion_views", "risk_id", "risks", "risk_id"),
]


def validate(tables):
    """Every link between tables points to something that exists. Returns a list of problems."""
    problems = []
    for child, ccol, parent, pcol in FOREIGN_KEYS:
        c, p = tables[child], tables[parent]
        if c.empty or ccol not in c.columns:
            continue
        vals = c[ccol].dropna()
        parent_vals = set(p[pcol]) if pcol in p.columns else set()
        missing = set(vals) - parent_vals
        if missing:
            problems.append(f"{child}.{ccol} -> {parent}.{pcol}: {len(missing)} missing, e.g. {sorted(missing)[:3]}")
    # rules from the concept
    st = tables["stances"]
    if len(st) and (st.groupby(["expert_id", "risk_id"])["version"].max() > 2).any():
        problems.append("an expert changed an opinion more than once")
    fc = tables["forecasts"]
    if len(fc) and (fc.groupby(["expert_id", "question_id"])["version"].max() > 2).any():
        problems.append("an expert changed a forecast more than once")
    dn = tables["display_names"]
    if len(dn) and dn.duplicated(["risk_id", "display_name"]).any():
        problems.append("two experts share a display name on the same risk")
    if len(dn) and dn.duplicated(["expert_id", "display_name"]).any():
        problems.append("an expert reuses a display name on another risk")
    ex = tables["experts"]
    gone = ex[(ex["anonymity_level"] == "verified_deleted") & (ex["status"] != "pending")]
    if gone[["application_comment", "education_level", "education_field"]].notna().any().any():
        problems.append("verified_deleted experts still have application details")
    ident = tables["expert_identity"].merge(tables["experts"][["expert_id", "anonymity_level", "status"]])
    leak = ident[(ident["anonymity_level"] == "verified_deleted") & (ident["status"] != "pending")
                 & ident["full_name"].notna()]
    if len(leak):
        problems.append(f"{len(leak)} verified_deleted experts still have personal data")
    leak_mail = ident[(ident["anonymity_level"] == "verified_deleted") & (ident["status"] != "pending")
                      & ident["contact_email"].notna()]
    if len(leak_mail):
        problems.append(f"{len(leak_mail)} verified_deleted experts still have an email address")
    for name, t in tables.items():
        if "recovery_code" in t.columns:
            problems.append(f"{name} contains plain recovery codes")
    if tables["risks"]["urgency_colour"].isin(["Light green"]).any():
        problems.append("a risk is green, but every risk should be yellow or above")
    return problems


def save_all(tables, truth, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, t in tables.items():
        t.to_csv(out_dir / f"{name}.csv", index=False)
    sim = out_dir / "_simulation"
    sim.mkdir(exist_ok=True)
    truth.to_csv(sim / "expert_truth.csv", index=False)
    return sorted(p.name for p in out_dir.glob("*.csv"))


# ======================================================================= the file for the app
def _iso(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    if isinstance(v, (pd.Timestamp,)):
        return None if pd.isna(v) else v.strftime("%Y-%m-%d")
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def _clean(obj):
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    return _iso(obj)


MIN_COUNTRY_ANSWERS = 3
NEW_RISK_DAYS = 7
UNREAD_DAYS = 14


def group_answer(latest, min_country=MIN_COUNTRY_ANSWERS):
    """The group numbers on a card, from each expert's latest stance on one risk.

    weighted_agree is the agree share in percent, with each vote counted by its match weight, so a
    vote from an expert matched on country and domain counts for more than a domain-only vote.
    The country line is empty under min_country answers: in a smaller group it could show how one
    person voted.
    """
    agreed = latest["stance"] == "agree"
    from_country = latest["match_type"] != "domain_only"
    enough_from_country = from_country.sum() >= min_country
    total_weight = latest["match_weight"].sum()
    agree_weight = latest.loc[agreed, "match_weight"].sum()
    return {"answers": int(len(latest)),
            "agree": int(agreed.sum()),
            "disagree": int((latest["stance"] == "disagree").sum()),
            "weighted_agree": int(round(100 * agree_weight / total_weight)) if total_weight else None,
            "country_answers": int(from_country.sum()) if enough_from_country else None,
            "country_agree": int((agreed & from_country).sum()) if enough_from_country else None}


def expert_demo_bundle(tables, truth, cfg=CONFIG):
    """Everything the expert screens need for the demo expert: deck, details, communities, read-only."""
    today = _ts(cfg["today"])
    demo_rows = truth[truth["is_demo_expert"]]
    if demo_rows.empty:
        raise ValueError("No demo expert found: no approved expert matches the demo risk on country and domain")
    eid = demo_rows["expert_id"].iloc[0]
    T = tables
    risks = T["risks"].set_index("risk_id")
    win = T["risk_windows"].set_index("risk_id")
    mine = T["expert_risk_matches"][T["expert_risk_matches"]["expert_id"] == eid]
    active_ids = set(risks.index[risks["status"] == "Active"])
    eligible = mine[mine["risk_id"].isin(active_ids)].set_index("risk_id")

    names = T["display_names"].set_index(["expert_id", "risk_id"])["display_name"]
    likes = T["comment_likes"].groupby("comment_id").size()
    src = T["sources"].set_index("source_id") if len(T["sources"]) else pd.DataFrame()
    reads = T["discussion_reads"]
    last_read = reads[reads["expert_id"] == eid].set_index("risk_id")["last_read_at"]

    def community(rid, limit=None):
        st = T["stances"][T["stances"]["risk_id"] == rid]
        latest = st.sort_values("version").groupby("expert_id").tail(1)
        cm = T["comments"].query("risk_id == @rid and kind != 'reply'").sort_values("posted_at")
        items = []
        for _, c in cm.iterrows():
            s = None
            if pd.notna(c["source_id"]) and c["source_id"] in src.index:
                s = {"title": src.loc[c["source_id"], "title"], "url": src.loc[c["source_id"], "url"]}
            items.append({"comment_id": c["comment_id"],
                          "display_name": names.get((c["expert_id"], rid), "Expert"),
                          "kind": "Changed opinion" if c["kind"] == "changed_opinion" else "Answer",
                          "text": c["text"], "likes": int(likes.get(c["comment_id"], 0)),
                          "source": s, "posted_at": c["posted_at"]})
        others = cm[cm["expert_id"] != eid]
        unread = int((others["posted_at"] > last_read[rid]).sum()) if rid in last_read.index else len(others)
        return {**group_answer(latest), "name": risks.loc[rid, "community_name"], "unread": unread,
                "comments": items[:limit] if limit else items}

    answered = set(T["stances"][T["stances"]["expert_id"] == eid]["risk_id"])
    saved = set(T["todo_items"][T["todo_items"]["expert_id"] == eid]["risk_id"])
    deck = []
    for rid, m in eligible.iterrows():
        if rid in answered | saved:
            continue
        r, w = risks.loc[rid], win.loc[rid]
        deck.append({"risk_id": rid, "title": r["title"], "short_explanation": r["short_explanation"],
                     "country": r["country"], "category": r["category"], "category_image": r["category_image"],
                     "urgency": r["urgency"], "colour": r["urgency_colour"], "colour_hex": r["urgency_hex"],
                     "label": r["urgency_label"], "urgency_score": r["urgency_score"],
                     "closes": w["closes"], "days_left": int((w["closes"] - today).days),
                     "match_type": m["match_type"], "community_name": r["community_name"]})
    deck.sort(key=lambda c: (-(c["urgency_score"] or 0), c["days_left"]))

    details = {}
    q = T["forecast_questions"].set_index("risk_id")
    for card in deck:
        rid = card["risk_id"]
        r = risks.loc[rid]
        trig = T["triggers"][T["triggers"]["risk_id"] == rid]
        details[rid] = {
            "rationale": r["rationale"], "acaps_probability": r["acaps_probability"],
            "risk_level": r["risk_level"], "risk_trend": r["risk_trend"], "priority_needs": r["priority_needs"],
            "triggers": [{"trigger_id": t["trigger_id"], "title": t["title"], "description": t["description"],
                          "posted_by": "ACAPS"}
                         for _, t in trig.iterrows()],
            "forecast": {"question_id": q.loc[rid, "question_id"], "text": q.loc[rid, "question_text"],
                         "horizon_months": q.loc[rid, "horizon_months"], "closes": q.loc[rid, "closes"],
                         "resolves_on": q.loc[rid, "resolves_on"],
                         "options": LEVELS + ["dont_know"]},
            "community": community(rid),
        }

    read_only = []
    for rid in sorted(active_ids - set(eligible.index)):
        r = risks.loc[rid]
        read_only.append({"risk_id": rid, "title": r["title"], "country": r["country"],
                          "category": r["category"], "community": community(rid, limit=5)})

    ec = T["expert_countries"][T["expert_countries"]["expert_id"] == eid]
    ed = T["expert_domains"][T["expert_domains"]["expert_id"] == eid]
    ex = T["experts"].set_index("expert_id").loc[eid]
    bundle = {
        "synthetic": True,
        "generated_for": cfg["today"],
        "expert": {
            "expert_id": eid, "anonymity_level": ex["anonymity_level"],
            "countries": ec[["country", "status"]].to_dict("records"),
            "domains": [{"category": CAT_NAME[int(d)], "status": s} for d, s in zip(ed["category_id"], ed["status"])],
            "rank": None,  # filled by the ranking algorithm
        },
        "deck": deck,
        "details": details,
        "todo": [],
        "read_only": read_only,
        "answer_levels": LEVELS + ["dont_know"],
    }
    return _clean(bundle)

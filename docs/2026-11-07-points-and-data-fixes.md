# Points and Data Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the synthetic data reproducible and correctly categorised, then add points, a rank, a results list and a better card order to the data the expert app reads.

**Architecture:** Two fixes and one rule change go into the existing generator, `src/synthetic_data.py`. A new pure module, `src/points.py`, turns resolved forecasts into points and ranks. A new one-command script, `src/build_demo_data.py`, regenerates all tables and writes `data/synthetic/ranks.csv` and `app/data/expert_demo.json`.

**Tech Stack:** Python 3.12, pandas 3.0, numpy, pytest 9. Jupyter is not installed on this machine, so notebook 05 cannot be re-run here.

**Spec:** The decisions agreed in the chat with Valeri on 2026-11-06 and 2026-11-07, listed under "Decisions" below.

## Global Constraints

- Tasks 1-3 go on `daria/data-fixes` and Tasks 4-5 on `valeri/points-and-rank`. Nothing is pushed until its owner asks.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `CONTEXT.md` stays uncommitted unless Valeri asks.
- `data/synthetic/_simulation/expert_truth.csv` is for testing only. The app and `ranks.csv` never contain `sim_` values.
- `app/data/expert_demo.json` names no expert other than the demo expert.
- Experts never see a Brier number, and nothing compares experts with ACAPS.
- The repo's Python files use CRLF line endings. Change them with an editor tool, not `sed`.

## Who does what

| Tasks | Owner | State |
|---|---|---|
| 1-3 (seed fix, category fix, demo expert rule) | Daria | Not started |
| 4 (points) | Valeri | Done on `valeri/points-and-rank` |
| 5 (one-command build) | Valeri | Steps 1-3 done. Steps 4-7 wait for Tasks 1-3 to be merged |
| 6 (docs and team note) | Not decided | Do after Task 5 |

Do not run `python src/build_demo_data.py` before Tasks 1-3 are in: it overwrites the data with an unfixed build. Both branches create `tests/conftest.py` with identical content, so that file does not conflict when they merge.

## Decisions

| Topic | Decision |
|---|---|
| Rank purpose | Demo only, not a full algorithm |
| Points | Very likely / Very unlikely +3 right, -7 wrong. Likely / Unlikely +2 right, -3 wrong. Even chance 0. Don't know not scored |
| "Right" | Both directions: Unlikely on something that did not happen earns the same as Likely on something that did |
| Rank | Total points, every approved expert, no minimum |
| Outcomes | ACAPS records each outcome once and points are calculated. The demo uses the outcomes already in the export |
| Good comment | A moderator marks it "spot on" for +5, more than any right forecast. The demo has one hand-written example, labelled as an example, which counts in the total |
| `expert.rank` | `{"points": n, "position": n, "out_of": n, "calls": n, "correct": n}` |
| Results | A `results` list in `expert_demo.json`. The screen is optional and is Diana's |
| Card order | Urgency, then own country + domain, then own country, then domain |
| Matching | Country and/or domain, using all of a risk's categories |
| Label | No "Super estimator" label |
| Dropped | `rank_history`, contribution score, match weights in the rank, top risks per country |
| Not in this plan | Analyst view, profile screen, approvals (Diana and ACAPS) |
| Demo expert | Must have a track record. The rule picks the R1043 country-and-domain expert with the most past risks, because E007 has no scored forecasts once categories are fixed |

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/synthetic_data.py` | Modify | Seed fix, category matching, overrides, demo expert rule |
| `data/risk_category_overrides.csv` | Create | Hand-checked categories for the 28 active risks |
| `src/points.py` | Create | Points, ranks, deck order, results |
| `src/build_demo_data.py` | Create | One command that regenerates everything |
| `tests/conftest.py` | Create | Puts `src/` on the import path |
| `tests/test_categories.py` | Create | Category matching and overrides |
| `tests/test_points.py` | Create | Points, ranks, deck order, results |
| `tests/test_build.py` | Create | Determinism and the finished demo data |
| `data/synthetic/*.csv`, `app/data/expert_demo.json` | Regenerate | Output |
| `requirements.txt`, `.gitignore` | Modify | pytest and its cache |
| `data/data_model/data_model.md`, `data/data_model/data_model.html` | Modify | Document the new rules |
| `notebooks/data/05_generate_synthetic_data.ipynb` | Modify | Warn about the save cell |

---

### Task 1: Seed fix

**Files:**
- Create: `tests/conftest.py`, `tests/test_build.py`
- Modify: `src/synthetic_data.py:426`, `requirements.txt`, `.gitignore`

**Interfaces:**
- Consumes: `build_all(export_path, cfg)` and `CONFIG` from `src/synthetic_data.py`
- Produces: `tests/conftest.py`, which later test files rely on for imports

- [ ] **Step 1: Prepare the branch**

```bash
cd /c/Users/bai4o/hack4good8_aisheep
git fetch origin
git status -sb
git checkout -b daria/data-fixes origin/main
```

Expected: if `git fetch` brought in new commits, stop and show Valeri what Daria changed before going on.

- [ ] **Step 2: Add pytest**

Add a line `pytest` to `requirements.txt`, and add these lines to `.gitignore` under `# Python`:

```
.pytest_cache/
```

- [ ] **Step 3: Write the failing test**

Create `tests/conftest.py`:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
```

Create `tests/test_build.py`:

```python
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FINGERPRINT = """
import hashlib, sys
sys.path.insert(0, "src")
from synthetic_data import CONFIG, build_all
tables, _ = build_all("data/risk-radar-export.csv", CONFIG)
print(hashlib.sha256("".join(t.to_csv(index=False) for t in tables.values()).encode()).hexdigest())
"""


def fingerprint(hash_seed):
    env = {**os.environ, "PYTHONHASHSEED": hash_seed, "PYTHONDONTWRITEBYTECODE": "1"}
    return subprocess.run([sys.executable, "-c", FINGERPRINT], cwd=ROOT, env=env, capture_output=True,
                          text=True, check=True).stdout.strip()


def test_the_same_seed_gives_the_same_data_in_every_python_process():
    assert fingerprint("1") == fingerprint("2")
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `python -m pytest tests/test_build.py -q`
Expected: FAIL, the two fingerprints differ.

- [ ] **Step 5: Apply the fix**

In `src/synthetic_data.py`, inside `expert_matches`, change:

```python
        for rid in set(rc.index) | set(rk.index):
```

to:

```python
        for rid in sorted(set(rc.index) | set(rk.index)):
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `python -m pytest tests/test_build.py -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add requirements.txt .gitignore tests/conftest.py tests/test_build.py src/synthetic_data.py docs/2026-11-07-points-and-data-fixes.md
git commit -F - <<'EOF'
Make the synthetic data reproducible

expert_matches looped over a set of strings, so its order changed with
Python's hash seed and every run produced different data.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Category fix

**Files:**
- Create: `data/risk_category_overrides.csv`, `tests/test_categories.py`
- Modify: `src/synthetic_data.py` (imports, `CATEGORY_KEYWORDS`, `classify_categories`, `build_reference`)

**Interfaces:**
- Consumes: `CATEGORIES` from `src/synthetic_data.py`
- Produces: `load_category_overrides(path) -> dict[str, list[int]]` and `classify_categories(text) -> list[int]`

- [ ] **Step 1: Create the hand-checked categories**

Valeri must have checked these before this step. The main category comes first. R1071 (forest fires and haze) has no fitting category, so it stays as the fallback.

Create `data/risk_category_overrides.csv`:

```csv
risk_id,categories
R1037,Armed conflict; Displacement
R1038,Armed conflict; Displacement
R1042,Armed conflict; Displacement
R1043,Cross-border insecurity; Armed conflict; Displacement
R1044,Drought; Food insecurity
R1045,Drought; Food insecurity
R1046,Drought; Food insecurity
R1047,Drought; Flood; Food insecurity
R1048,Armed conflict; Displacement
R1049,Armed conflict; Displacement
R1051,Economic crisis / prices; Food insecurity
R1052,Armed conflict; Political crisis
R1053,Armed conflict; Economic crisis / prices
R1054,Infrastructure failure; Armed conflict
R1055,Displacement; Cross-border insecurity
R1058,Drought; Food insecurity
R1059,Armed conflict; Political crisis
R1061,Armed conflict; Political crisis; Displacement
R1062,Cross-border insecurity; Armed conflict
R1065,Cross-border insecurity; Armed conflict; Displacement
R1066,Armed conflict; Cross-border insecurity; Displacement
R1067,Armed conflict
R1068,Armed conflict; Political crisis
R1069,Armed conflict; Displacement
R1071,Fallback (no match)
R1072,Armed conflict; Displacement
R1073,Displacement; Political crisis
R1074,Armed conflict; Political crisis
```

- [ ] **Step 2: Write the failing tests**

Create `tests/test_categories.py`:

```python
from pathlib import Path

import pandas as pd

from synthetic_data import CATEGORIES, classify_categories, load_category_overrides

ROOT = Path(__file__).resolve().parent.parent
OVERRIDES = ROOT / "data" / "risk_category_overrides.csv"
ID = {c[1]: c[0] for c in CATEGORIES}


def test_dam_matches_a_dam_but_not_damage():
    assert ID["Infrastructure failure"] in classify_categories("drone attacks hit the Merowe Dam")
    assert ID["Infrastructure failure"] not in classify_categories("storm damage to homes")


def test_war_does_not_match_inside_other_words():
    assert ID["Armed conflict"] not in classify_categories("early warning for the harvest")


def test_food_insecurity_is_not_armed_conflict():
    assert classify_categories("trade limits deepen food insecurity")[0] == ID["Economic crisis / prices"]
    assert ID["Armed conflict"] not in classify_categories("deepen food insecurity")


def test_drought_wins_over_flood():
    assert classify_categories("El Nino drought and floods in the north")[0] == ID["Drought"]


def test_no_keyword_falls_back_to_zero():
    assert classify_categories("nothing relevant here") == [0]


def test_overrides_give_main_category_first():
    overrides = load_category_overrides(OVERRIDES)
    assert overrides["R1054"] == [ID["Infrastructure failure"], ID["Armed conflict"]]
    assert overrides["R1071"] == [0]


def test_overrides_cover_every_active_risk():
    export = pd.read_csv(ROOT / "data" / "risk-radar-export.csv")
    active = set(export.loc[export["Status"] == "Active", "Risk ID"])
    assert active == set(load_category_overrides(OVERRIDES))


def test_missing_overrides_file_means_no_overrides(tmp_path):
    assert load_category_overrides(tmp_path / "missing.csv") == {}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python -m pytest tests/test_categories.py -q`
Expected: FAIL with `ImportError: cannot import name 'load_category_overrides'`.

- [ ] **Step 4: Add the import**

In `src/synthetic_data.py`, add this line after `from datetime import timedelta`:

```python
from pathlib import Path
```

- [ ] **Step 5: Replace the keywords**

Replace everything from the comment `# Keywords searched in the risk title and triggers.` to the end of the `CATEGORY_KEYWORDS` list with:

```python
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
```

- [ ] **Step 6: Replace the body of `classify_categories` and add two helpers after it**

Replace the three body lines of `classify_categories` (keep its `def` and docstring), and add the helpers directly below it:

```python
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
```

- [ ] **Step 7: Use them in `build_reference`**

Replace this block:

```python
    # categories: use a category column if the export has one, otherwise keywords
    cat_rows = []
    for i, r in df.iterrows():
        if "category" in df.columns and pd.notna(r.get("category")):
            text = str(r["category"])
        else:
            text = f'{r.get("risk_title", "")} {r.get("triggers", "")}'
        hits = classify_categories(text)
        for rank, cid in enumerate(hits):
```

with:

```python
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
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `python -m pytest tests/test_categories.py -q`
Expected: 8 passed.

- [ ] **Step 9: Commit**

```bash
git add data/risk_category_overrides.csv tests/test_categories.py src/synthetic_data.py
git commit -F - <<'EOF'
Fix risk categories

Keywords matched inside words, searched trigger text and let "rainfall"
beat drought, so only 3 of 28 active risks had the right main category.
Active risks now use a hand-checked file and keywords match whole words
in the title first.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Demo expert rule

**Files:**
- Modify: `src/synthetic_data.py` (`build_all`), `tests/test_build.py`

**Interfaces:**
- Consumes: `build_all`, which returns `(tables, truth)`, where `truth` has `expert_id` and `is_demo_expert`
- Produces: a demo expert with scored past forecasts

- [ ] **Step 1: Write the failing test**

Add to the imports of `tests/test_build.py`:

```python
from synthetic_data import CONFIG, build_all
```

Add at the end of the file:

```python
def test_demo_expert_matches_the_demo_risk_and_has_past_forecasts():
    tables, truth = build_all(ROOT / "data" / "risk-radar-export.csv", CONFIG)
    demo = truth.loc[truth["is_demo_expert"], "expert_id"].iloc[0]
    matches = tables["expert_risk_matches"]
    assert ((matches.expert_id == demo) & (matches.risk_id == "R1043")
            & (matches.match_type == "country_and_domain")).any()
    forecasts = tables["forecasts"]
    assert ((forecasts.expert_id == demo) & forecasts.question_id.str.startswith("QH-")).sum() >= 20
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/test_build.py -q`
Expected: FAIL, because E007 has 0 past forecasts once categories are fixed.

- [ ] **Step 3: Change the rule**

In `build_all`, replace:

```python
    # the demo expert: approved, in the demo risk's country and its main category
    cfg = dict(cfg)
    dm = matches[(matches["risk_id"] == cfg["demo_risk"]) & (matches["match_type"] == "country_and_domain")]
    cfg["_demo_expert"] = dm["expert_id"].iloc[0] if len(dm) else None
```

with:

```python
    # the demo expert: approved, matches the demo risk on country and domain, and has the most past
    # risks to forecast on, so the rank and results have something to show
    cfg = dict(cfg)
    dm = matches[(matches["risk_id"] == cfg["demo_risk"]) & (matches["match_type"] == "country_and_domain")]
    past = questions.loc[questions["is_backtest"], "risk_id"]
    past_matches = matches[matches["risk_id"].isin(past)].groupby("expert_id").size()
    by_past = past_matches.reindex(dm["expert_id"]).fillna(0).sort_values(ascending=False, kind="stable")
    cfg["_demo_expert"] = by_past.index[0] if len(by_past) else None
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests -q`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/synthetic_data.py tests/test_build.py
git commit -F - <<'EOF'
Pick a demo expert with a track record

The rank and results need past forecasts, and the first matching expert
has none now that cross-border risks are labelled correctly.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Points, rank, card order and results

**Files:**
- Create: `src/points.py`, `tests/test_points.py`, `tests/conftest.py` (same content as in Task 1)

**Interfaces:**
- Consumes: `_short(text, max_chars)` from `src/synthetic_data.py`
- Produces:
  - `score_forecasts(forecasts, questions) -> DataFrame` with `expert_id, question_id, risk_id, answer_level, outcome, resolves_on, points, is_call, correct_call`
  - `build_ranks(scored, experts, bonuses=None) -> DataFrame` with `expert_id, points, position, forecast_points, bonus_points, forecasts, calls, correct`
  - `rank_for_app(ranks, expert_id) -> dict`
  - `sort_deck(deck) -> list`
  - `build_results(scored, expert_id, risks, export, spot_on=None) -> list`
  - `SPOT_ON_BONUS = 5`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_points.py`:

```python
import pandas as pd
import pytest

from points import (POINTS, SPOT_ON_BONUS, build_ranks, build_results, rank_for_app, score_forecasts, sort_deck,
                    what_happened)

BANDS = {"very_unlikely": 0.1, "unlikely": 0.3, "even_chance": 0.5, "likely": 0.7, "very_likely": 0.9}


def forecasts():
    return pd.DataFrame({
        "expert_id": ["E1", "E1", "E1", "E1", "E2", "E2"],
        "question_id": ["Q1", "Q2", "Q3", "Q4", "Q1", "Q2"],
        "answer_level": ["very_likely", "unlikely", "dont_know", "likely", "even_chance", "very_likely"],
    })


def questions():
    return pd.DataFrame({
        "question_id": ["Q1", "Q2", "Q3", "Q4"], "risk_id": ["R1", "R2", "R3", "R4"],
        "outcome": [1, 0, 1, None], "resolves_on": ["2026-01-01", "2026-02-01", "2026-03-01", "2027-01-01"],
    })


def experts():
    return pd.DataFrame({"expert_id": ["E1", "E2", "E3", "E4"],
                         "status": ["approved", "approved", "approved", "pending"]})


@pytest.mark.parametrize("level", BANDS)
@pytest.mark.parametrize("outcome", [0, 1])
def test_points_table_is_the_brier_score_in_readable_form(level, outcome):
    assert POINTS[level][outcome] == pytest.approx(12.5 * (0.25 - (BANDS[level] - outcome) ** 2))


def test_saying_unlikely_about_something_that_did_not_happen_earns_points():
    scored = score_forecasts(forecasts(), questions())
    row = scored[(scored.expert_id == "E1") & (scored.question_id == "Q2")].iloc[0]
    assert row.points == 2 and row.correct_call


def test_a_wrong_strong_call_costs_seven():
    scored = score_forecasts(forecasts(), questions())
    assert scored[(scored.expert_id == "E2") & (scored.question_id == "Q2")].iloc[0].points == -7


def test_dont_know_and_open_questions_are_not_scored():
    scored = score_forecasts(forecasts(), questions())
    assert set(scored.question_id) == {"Q1", "Q2"}


def test_even_chance_scores_zero_and_is_not_a_call():
    scored = score_forecasts(forecasts(), questions())
    row = scored[(scored.expert_id == "E2") & (scored.question_id == "Q1")].iloc[0]
    assert row.points == 0 and not row.is_call and not row.correct_call


def test_ranks_include_every_approved_expert_and_no_one_else():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts())
    assert set(ranks.expert_id) == {"E1", "E2", "E3"}
    assert ranks.set_index("expert_id").loc["E3", "points"] == 0


def test_most_points_comes_first_and_a_negative_total_comes_last():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts()).set_index("expert_id")
    assert (ranks.loc["E1", "points"], ranks.loc["E1", "position"]) == (5, 1)
    assert (ranks.loc["E3", "points"], ranks.loc["E3", "position"]) == (0, 2)
    assert (ranks.loc["E2", "points"], ranks.loc["E2", "position"]) == (-7, 3)


def test_ties_share_a_position():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), {"E3": 5}).set_index("expert_id")
    assert ranks.loc["E1", "position"] == ranks.loc["E3", "position"] == 1
    assert ranks.loc["E2", "position"] == 3


def test_the_spot_on_bonus_is_worth_more_than_any_right_forecast():
    assert SPOT_ON_BONUS > max(max(v.values()) for v in POINTS.values())


def test_rank_for_app_has_the_agreed_format():
    ranks = build_ranks(score_forecasts(forecasts(), questions()), experts(), {"E1": 5})
    assert rank_for_app(ranks, "E1") == {"points": 10, "position": 1, "out_of": 3, "calls": 2, "correct": 2}


def card(risk_id, score, match, days):
    return {"risk_id": risk_id, "urgency_score": score, "match_type": match, "days_left": days}


def test_deck_sorts_by_urgency_then_match_then_closing_date():
    deck = [card("a", 2, "country_and_domain", 1), card("b", 3, "domain_only", 1),
            card("c", 3, "country_only", 9), card("d", 3, "country_and_domain", 9),
            card("e", 3, "country_and_domain", 2)]
    assert [c["risk_id"] for c in sort_deck(deck)] == ["e", "d", "c", "b", "a"]


def test_what_happened_prefers_hazard_text_and_removes_links():
    row = {"hazard_materialisation": "Clashes began ([UN](https://example.org)).",
           "impact_materialisation_description": "Other text."}
    assert what_happened(row) == "Clashes began (UN)."


def test_what_happened_is_none_when_acaps_wrote_nothing():
    assert what_happened({"hazard_materialisation": float("nan"),
                          "impact_materialisation_description": float("nan")}) is None


def results(spot_on=None):
    risks = pd.DataFrame({"risk_id": ["R1", "R2"], "title": ["One", "Two"], "country": ["Chad", "Mali"]})
    export = pd.DataFrame({"risk_id": ["R1", "R2"], "hazard_materialisation": ["It happened.", None],
                           "impact_materialisation_description": [None, None]})
    return build_results(score_forecasts(forecasts(), questions()), "E1", risks, export, spot_on)


def test_results_show_what_the_expert_said_and_what_happened():
    items = {i["risk_id"]: i for i in results()}
    assert items["R1"]["you_said"] == "very_likely"
    assert items["R1"]["outcome"] == "Happened"
    assert items["R1"]["what_happened"] == "It happened."
    assert items["R1"]["points"] == 3
    assert items["R2"]["outcome"] == "Did not happen"
    assert items["R2"]["what_happened"] is None


def test_the_spot_on_example_comes_first_and_is_labelled():
    items = results({"risk_id": "R1", "text": "My reading."})
    assert items[0]["risk_id"] == "R1"
    assert items[0]["comment"] == {"text": "My reading.", "spot_on": True, "example": True}
    assert items[0]["bonus_points"] == SPOT_ON_BONUS
    assert items[1]["comment"] is None
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/test_points.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'points'`.

- [ ] **Step 3: Write the implementation**

Create `src/points.py`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests/test_points.py -q`
Expected: 24 passed (10 of them are the parametrised points table).

- [ ] **Step 5: Commit**

```bash
git add src/points.py tests/test_points.py
git commit -F - <<'EOF'
Add points, rank, card order and results

The points table is the Brier score in a readable form, so experts earn
points when an outcome is recorded without ever seeing a Brier number.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: One-command build and the new data

**Files:**
- Create: `src/build_demo_data.py`, `tests/test_demo_data.py`
- Regenerate: `data/synthetic/*.csv`, `app/data/expert_demo.json`
- Create: `data/synthetic/ranks.csv`

**Interfaces:**
- Consumes: everything from Task 4, plus `build_all`, `validate`, `save_all`, `expert_demo_bundle`, `_clean`, `CONFIG` and `load_risks`
- Produces: `build(config=CONFIG) -> (tables, truth, ranks, bundle)` and `SPOT_ON_EXAMPLE`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_demo_data.py`, separate from `tests/test_build.py` so the two branches do not conflict. Start it with these imports:

```python
import json
import re

import pytest

from build_demo_data import SPOT_ON_EXAMPLE, build
from points import SPOT_ON_BONUS
```

Add at the end of the file:

```python
@pytest.fixture(scope="module")
def built():
    return build()


def test_every_approved_expert_is_ranked(built):
    tables, _, ranks, _ = built
    assert set(ranks.expert_id) == set(tables["experts"].query("status == 'approved'").expert_id)


def test_ranks_hold_no_simulation_values(built):
    assert not [c for c in built[2].columns if c.startswith("sim_")]


def test_demo_expert_has_a_track_record_and_matching_rank(built):
    _, _, ranks, bundle = built
    rank = bundle["expert"]["rank"]
    row = ranks.set_index("expert_id").loc[bundle["expert"]["expert_id"]]
    assert row.forecasts > 0
    assert rank["points"] == row.points == row.forecast_points + SPOT_ON_BONUS
    assert rank["out_of"] == len(ranks)


def test_demo_points_add_up_from_the_results(built):
    bundle = built[3]
    total = sum(r["points"] + r["bonus_points"] for r in bundle["results"])
    assert total == bundle["expert"]["rank"]["points"]


def test_deck_opens_on_the_demo_risk(built):
    assert built[3]["deck"][0]["risk_id"] == "R1043"


def test_the_spot_on_example_comes_first_in_the_results(built):
    first = built[3]["results"][0]
    assert first["risk_id"] == SPOT_ON_EXAMPLE["risk_id"]
    assert first["comment"]["example"] is True


def test_the_app_file_shows_no_other_expert(built):
    bundle = built[3]
    ids = set(re.findall(r"\bE\d{3}\b", json.dumps(bundle)))
    assert ids == {bundle["expert"]["expert_id"]}


def test_active_risks_use_the_checked_categories(built):
    risks = built[0]["risks"].set_index("risk_id")
    assert risks.loc["R1054", "category"] == "Infrastructure failure"
    assert risks.loc["R1045", "category"] == "Drought"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/test_build.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'build_demo_data'`.

- [ ] **Step 3: Write the script**

Create `src/build_demo_data.py`:

```python
"""
build_demo_data.py - rebuilds all the data with one command:

    python src/build_demo_data.py

It does what notebook 05 does, then adds the points: data/synthetic/ranks.csv, plus expert.rank,
results and the card order in app/data/expert_demo.json. Run this, not the notebook's save cell,
because the notebook writes the app file without any of those.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from points import SPOT_ON_BONUS, build_ranks, build_results, rank_for_app, score_forecasts, sort_deck
from risk_tools import load_risks
from synthetic_data import CONFIG, _clean, build_all, expert_demo_bundle, save_all, validate

EXPORT = ROOT / "data" / "risk-radar-export.csv"
OUT_DIR = ROOT / "data" / "synthetic"
APP_FILE = ROOT / "app" / "data" / "expert_demo.json"

# Hand-written and synthetic: past risks have no comments, so this one shows how a comment that
# named the real reason earns the spot-on bonus. The app labels it as an example.
SPOT_ON_EXAMPLE = {
    "risk_id": "R1056",
    "text": "Tensions inside the camps could turn into clashes soon, but I don't expect that to cut aid access.",
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
    bundle["deck"] = sort_deck(bundle["deck"])
    bundle["expert"]["rank"] = rank_for_app(ranks, demo_expert)
    bundle["results"] = build_results(scored, demo_expert, tables["risks"], load_risks(EXPORT), SPOT_ON_EXAMPLE)
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests -q`
Expected: 42 passed.

If the only failure is "has no scored forecast on R1056", the category labels were edited and the demo expert changed. Pick a resolved risk that expert forecast correctly, in one of their own countries, and rewrite `SPOT_ON_EXAMPLE` to fit what ACAPS recorded.

- [ ] **Step 5: Regenerate the data**

Run: `python src/build_demo_data.py`

Expected, with the labels in Task 2 unchanged:

```
Demo expert: E041 {'points': 45, 'position': 14, 'out_of': 76, 'calls': 20, 'correct': 19}
Deck: ['R1043', 'R1066', 'R1062', 'R1038', 'R1069', ...]
Results: 31
```

- [ ] **Step 6: Check the pitch number**

Run:

```bash
python -c "import pandas as pd; r=pd.read_csv('data/synthetic/ranks.csv'); t=pd.read_csv('data/synthetic/_simulation/expert_truth.csv').set_index('expert_id'); print('top 8 %.2f, everyone %.2f' % (t.loc[r.head(8).expert_id].sim_skill.mean(), t.loc[r.expert_id].sim_skill.mean()))"
```

Expected: `top 8 0.81, everyone 0.56`.

- [ ] **Step 7: Commit**

```bash
git add data/synthetic app/data/expert_demo.json
git commit -F - <<'EOF'
Add one-command build and regenerate the data

The demo expert is now E041, with a rank, 31 results and a deck that
opens on R1043. All synthetic tables change because the seed fix,
categories and demo expert all feed the generator.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Update the docs and notebook warning

**Files:**
- Modify: `data/data_model/data_model.md`, `data/data_model/data_model.html`, `src/synthetic_data.py:2`, `notebooks/data/05_generate_synthetic_data.ipynb`

**Interfaces:**
- Consumes: the finished behaviour from Tasks 1-5
- Produces: documentation that matches the code

- [ ] **Step 1: Update the data model introduction**

In `data/data_model/data_model.md`, replace:

```
There are 25 tables in six groups. Notebook `05_generate_synthetic_data` (code in `src/synthetic_data.py`) builds all of them; the files are in `data/synthetic/`.
```

with:

```
There are 25 tables in six groups, plus `ranks`. `python src/build_demo_data.py` builds all of them; the files are in `data/synthetic/`.
```

- [ ] **Step 2: Update the categories rule**

Replace:

```
The export has no category column, so each risk gets its categories from keywords in its title and triggers.
```

with:

```
The export has no category column. The 28 active risks use the hand-checked `data/risk_category_overrides.csv`; every other risk gets its categories from keywords in its title, or its triggers if the title matches nothing.
```

- [ ] **Step 3: Add the new rules**

Add these bullets after the "**ACAPS sets the answering window**" bullet:

```markdown
- **Card order.** Urgency first, then own country and domain, then own country, then domain.
- **Points.** Experts earn points when ACAPS records what happened. Experts never see a Brier number.

  | Answer | Right | Wrong |
  |---|---|---|
  | Very likely / Very unlikely | +3 | -7 |
  | Likely / Unlikely | +2 | -3 |
  | Even chance | 0 | 0 |
  | Don't know | not scored | not scored |

  "Right" works in both directions. A comment a moderator marks "spot on" earns +5. The demo has one hand-written example, labelled as an example, because past risks have no comments.
```

- [ ] **Step 4: Document `ranks`**

Add this section directly before `## 6. Simulation only`:

```markdown
### `ranks`
Every approved expert's total points. Fields: `expert_id`, `points`, `position`, `forecast_points`, `bonus_points`, `forecasts`, `calls`, `correct`. Built by `src/build_demo_data.py`, not the notebook. Each expert sees only their own row, as `expert.rank` in the app file.

```

- [ ] **Step 5: Remove the old "later" row from both files**

In `data/data_model/data_model.md`, delete:

```
| `ranks`, `rank_history` | Output of the ranking algorithm (Valeri) |
```

In `data/data_model/data_model.html`, delete:

```html
        <tr><td><code>ranks</code>, <code>rank_history</code></td><td>Output of the ranking algorithm; each expert sees only their own rank</td></tr>
```

- [ ] **Step 6: Fix the wrong path to the docs**

In `data/data_model/data_model.html`, change `<code>docs/data_model.md</code>` to `<code>data/data_model/data_model.md</code>`.

In `src/synthetic_data.py`, line 2, change `(docs/data_model.md)` to `(data/data_model/data_model.md)`.

- [ ] **Step 7: Warn about the notebook's save cell**

In `notebooks/data/05_generate_synthetic_data.ipynb`, replace the markdown cell `## 4. Save` with:

```markdown
## 4. Save
**For the final data, run `python src/build_demo_data.py` instead of this cell.** This cell writes an app file with no rank, no results and the old card order. The numbers printed in this notebook are from before the category fix until someone re-runs it.
```

Use the NotebookEdit tool so the rest of the notebook is untouched.

- [ ] **Step 8: Run all the tests and check what changed**

Run: `python -m pytest tests -q`
Expected: 42 passed.

Run: `git status -s`
Expected: only the four files in this task are modified, plus `CONTEXT.md` still untracked.

- [ ] **Step 9: Commit**

```bash
git add data/data_model/data_model.md data/data_model/data_model.html src/synthetic_data.py notebooks/data/05_generate_synthetic_data.ipynb
git commit -F - <<'EOF'
Document points, card order and the new build command

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 10: Tell the team**

Give Valeri this note to send, and ask Valeri whether to push the branch:

> The data has changed. The demo expert is now E041 (Chad and Algeria, Armed conflict and Infrastructure failure), not E007, and all synthetic tables have new values. `expert.rank` is now `{"points", "position", "out_of", "calls", "correct"}`, `results` is a new list, and the deck opens on R1043. To regenerate, run `python src/build_demo_data.py`, not notebook 05's save cell. Don't run notebook 03: it overwrites `experts.csv` with the old format.

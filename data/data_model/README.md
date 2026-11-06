# Ground Truth — a trusted expert loop for ACAPS

**Hackathon for Good #8 · ACAPS challenge "Ground Truth" · The Hague, 6-8 November 2026**

Ground Truth is a desktop and mobile platform where vetted humanitarian experts react to ACAPS risk analyses for the countries they know, discuss them with peers and forecast what will happen, in a few minutes per risk and with full control over their anonymity.

## The problem

ACAPS rates humanitarian risks on probability and impact and publishes them in its Risk List. The experts closest to a crisis often sense a shift before any report shows it, but that knowledge stays in informal conversations and disappears. ACAPS has no structured, trusted way to ask a group of experts whether its analysis is right, what is missing and how likely things are, and no way to learn whose judgement proves reliable.

## What we built

The expert journey:

1. **Swipe cards.** The app opens on short, colour-coded cards, one per risk in the expert's country panels. Red means very urgent, light green not so urgent, always with a text label too. The expert swipes right on the risks they can judge and skips the rest.
2. **Check-in.** For a picked risk, the expert agrees or disagrees with ACAPS's analysis, optionally rates each trigger, and adds a short comment or a source.
3. **Group view.** Once enough experts have answered, they see the anonymised result and can revise their answer (the Delphi method: answer alone first, then see the group, which limits groupthink).
4. **Forecast.** A two-month question on a five-level scale (very unlikely to very likely, or "I don't know") that mirrors ACAPS's own probability scale.
5. **Moderator view.** ACAPS sees where experts agree or are split, reviews suggested triggers, and approves a summary before anything is shared.

The full concept, including notifications for anonymous experts, ranks, offline mode and certificates, is in `docs/` (Ground Truth platform concept).

## Anonymity

Every expert is approved by ACAPS, then chooses one of three levels: known to ACAPS, verified anonymous, or verified and then deleted (identity checked at approval, then removed). Contributions are always anonymous to the public. In the data, answers only carry an internal ID; real names live in one separate table that only ACAPS can open. Details in `docs/data_model.md`.

## How we use the ACAPS data

- **The content of the app.** Real risks, ratings and triggers from the Risk Radar export, with risk **R1043** (eastern Chad) as the demo.
- **Testing the scoring on real outcomes.** The export records what happened to 104 resolved risks. Scored with the Brier score (lower is better), ACAPS's own ratings score **0.215**, better than always guessing 50% (**0.250**).
- **Testing the scoreboard.** With simulated experts on those 104 real outcomes, the Brier score ranks the most skilled experts on top (rank correlation of −0.82 between hidden skill and score). The experts are simulated; the outcomes are real.

All experts, answers and forecasts in this repo are **synthetic**. No personal data of real experts is used.

## Repository structure

| Folder | Contents |
|---|---|
| `data/` | The ACAPS Risk Radar export (CSV and Excel) and its README |
| `data/processed/` | Clean tables made by notebook 02: risks, one row per trigger, resolved risks, R1043 demo data |
| `data/synthetic/` | Simulated experts, answers, scores and the R1043 demo panel |
| `docs/` | Challenge brief and documentation from ACAPS, our data model and platform concept |
| `notebooks/` | Data exploration and preparation, scoring test and demo content (run in order) |
| `src/` | `risk_tools.py`: shared functions for loading, trigger parsing, probability mapping, Brier scoring and synthetic experts |
| `references/` | ACAPS risk methodology (PDF and infographic) |
| `app/` | The demo interface (to be added) |

## How to run

```bash
conda env create -f environment.yml
conda activate hfg8
```

Without conda: `python -m venv venv`, activate it, then `pip install -r requirements.txt`.

Then run the notebooks in order:

| Notebook | What it does |
|---|---|
| `01_explore_risks` | Checks the export against the documented numbers and lists questions for ACAPS |
| `02_prepare_data` | Saves the clean tables to `data/processed/` |
| `03_synthetic_experts_scoring` | Tests the Brier-score scoreboard on 104 real outcomes |
| `04_demo_content` | Builds the synthetic R1043 panel for the demo screens |

## Still to confirm with ACAPS

- Which probability bands to use for the forecast scale (the two ACAPS methodology documents differ)
- The minimum number of answers before the group view opens
- Whether "verified, then deleted" is acceptable, and how those experts should be notified

## Team

| Name | Role |
|---|---|
| Daria | Data and data model |
| Valeri | Aggregation and scoring |
| Diana | Design and app |
| Desi | Pitch and research |

## Licence and data

Code under the MIT licence (see `LICENSE`). ACAPS data is used under ACAPS' terms of use.

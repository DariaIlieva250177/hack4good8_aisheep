# CLAUDE.md: context for AI coding assistants

This is **ACAPS Community**, a team's solution to the ACAPS Ground Truth challenge at Hackathon for Good #8 (6-8 November 2026, The Hague). Start with `README.md`. The challenge itself is in `docs/challenge-brief.md` and `docs/evaluation-criteria.md`.

## Parts

- `src/`: Python that builds the simulated tables, points, ranks and the expert app's data file. `python src/build_demo_data.py` rebuilds everything.
- `tests/`: `python -m pytest tests`.
- `frontend/`: the expert app, the website and ACAPS's analyst view (React, Vite, TypeScript). The expert app reads data only through `src/data/api.ts`; the analyst view is in `src/analyst/`, at `/analyst`.
- `analyst/acaps_community_analyst_view.html`: a single-file copy of the analyst view.
- `data/risk-radar-export.csv`: the ACAPS Risk Radar export, 139 risks across 57 countries. Demo risk: **R1043** (Chad/Sudan cross-border insecurity).
- `data/synthetic/`: the generated tables. `data/data_model/data_model.md` explains them.

## Rules

- Never use personal data of real experts. Every expert, vote and comment is synthetic.
- Rebuild data with `build_demo_data.py`, not the notebooks: notebook 05 writes the app file without ranks.
- In the analyst view, every answer shows the expert's code, which opens their account. The account shows name, email and organisation only for experts who aren't fully anonymous; for "Verified, then deleted", ACAPS keeps only the code and the activity. Other experts and the public never see codes or identities.
- ACAPS data is used under ACAPS' terms of use.

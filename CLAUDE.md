# CLAUDE.md: context for AI coding assistants

This is **Ground Truth**, a team's solution to the ACAPS challenge at Hackathon for Good #8 (6-8 November 2026, The Hague). Start with `README.md`. The challenge itself is in `docs/challenge-brief.md` and `docs/evaluation-criteria.md`.

## Parts

- `src/`: Python that builds the simulated tables, points, ranks and the expert app's data file. `python src/build_demo_data.py` rebuilds everything.
- `tests/`: `python -m pytest tests`.
- `frontend/`: the expert app and the website (React, Vite, TypeScript). Screens read data only through `src/data/api.ts`.
- `analyst/moderator_mockup_v3.html`: ACAPS's desktop moderator view, one file with its data embedded.
- `data/risk-radar-export.csv`: the ACAPS Risk Radar export, 139 risks across 57 countries. Demo risk: **R1043** (Chad/Sudan cross-border insecurity).
- `data/synthetic/`: the generated tables. `data/data_model/data_model.md` explains them.

## Rules

- Never use personal data of real experts. Every expert, vote and comment is synthetic.
- Rebuild data with `build_demo_data.py`, not the notebooks: notebook 03 writes `experts.csv` in an old format, and notebook 05 writes the app file without ranks.
- A moderator must never see an expert code next to an answer. Answers show only the match level.
- ACAPS data is used under ACAPS' terms of use.

# Ground Truth

A small, moderated network of humanitarian experts who check and forecast ACAPS risk analyses in a few minutes, while each expert controls their own anonymity.

Built for [ACAPS](https://www.acaps.org/) at Hackathon for Good #8, The Hague, 6-8 November 2026. Read the [challenge brief](docs/challenge-brief.md).

**See it:** [add the link to the screens here]

## The problem

ACAPS rates risks that could start a humanitarian crisis or sharply worsen one. Its analysts work from public sources and a few expert conversations, then publish. The people closest to a crisis often sense a risk before it reaches a report, but that knowledge stays in informal chats, and ACAPS cannot learn whose judgement holds up. These experts are busy, and some work in sensitive places, so they won't use a tool that takes their time or exposes them.

## How it works

The demo follows R1043, cross-border insecurity in eastern Chad.

1. **ACAPS approves each expert** for the countries and domains they know. An expert can hold one or several of each, because expertise often comes from where someone has lived and worked.
2. **Risks arrive as cards.** An expert gets a card when a risk matches their country or domain. Cards are ordered by urgency, then by how well the risk matches the expert. Swiping right saves a card to the To-do list, and swiping left skips it.
3. **A short answer.** From To-do, the expert agrees or disagrees, says how likely the risk is, and can add a written answer and sources.
4. **The discussion.** Answering opens that risk's chat, where experts read each other's answers, like them and reply. Nobody sees how others voted until the chat closes.
5. **The group view.** When the chat closes, experts see the moderator's summary, the share who agree, what country experts said, and the panel's forecast.
6. **The outcome.** ACAPS records what happened, and experts get an alert, see the result and earn points.

### What ACAPS gets from each risk

Every expert's vote counts, but a vote from someone who knows the country and the domain counts for more.

| Expert's match to the risk | Weight |
|---|---|
| Country and domain | 1.0 |
| Country only | 0.6 |
| Domain only | 0.4 |

When the chat closes, the app shows two lines. These are the R1043 numbers in the demo, from simulated votes:

> **80% agree**
> 5 of 6 Chad experts agree

Country experts are the small panel ACAPS asked for, and domain-only experts add a wider view at a lower weight. The country line stays empty under 3 answers, because in a smaller group it could show how one person voted.

### What the moderator does

ACAPS's moderator works on a desktop view, [`analyst/moderator_mockup_v3.html`](analyst/moderator_mockup_v3.html). It is one file: open it in a browser, with nothing to install.

| Screen | What it holds |
|---|---|
| Picture | A map of the open risks. Click a country to open its page |
| Country | Each risk next to how many experts agree with ACAPS and how likely most think it is, what experts say across the country's risks, links to other risks, and the country's panel |
| Open risks | Votes, answers, likes and turnout on every open risk |
| Approvals | People who applied, with what they sent. Approve or deny each country and field |
| Workspace | One risk: what experts say, grouped by subject with the best-matched experts first, the ACAPS updates and triggers, and report notes |
| Connect | Links between risks, each with a stated cause, which the moderator confirms or rejects |
| Panel | Panel numbers, ranks by code, and each expert's account |
| Upload a risk | A new risk, with a preview of the card and a count of the experts who will get it |

The AI summaries and groupings in the demo were written in advance, and nothing reaches the report notes until a person accepts it. Experts appear to the moderator by code, never by name, and a code never appears next to an answer. An answer shows only the match level, such as "Knows the country", and every such group has at least 3 experts.

### Anonymity

The expert chooses a level at registration and can change it in settings. Nothing an expert writes is ever shown to the public.

| Level | What ACAPS keeps |
|---|---|
| Known to ACAPS | Personal data. The expert can hide their name on a single answer, and ACAPS still sees and uses the answer |
| Verified anonymous | Personal data in a separate table that is never shown in the app |
| Verified, then deleted | No personal data after review. Contact details, documents, the application comment and education are deleted, and only a hash of the recovery code stays |

Other experts see a display name that is different on every risk, so two discussions cannot be linked through a name. Accounts recover with a secret 12-word code, so no email is needed.

### Points and rank

| Forecast | Right | Wrong |
|---|---|---|
| Very likely or Very unlikely | +3 | -7 |
| Likely or Unlikely | +2 | -3 |
| Even chance | 0 | 0 |

"Right" works in both directions: Unlikely on something that did not happen earns the same as Likely on something that did. A spot-on comment earns +5. The demo has one hand-set example, and the app has no screen for choosing them yet.

Each risk's chat has a deadline set by ACAPS, when answers lock and experts see the group results. Points come later, when the risk happens or its months run out, and use each expert's last answer from before the date it happened, so nobody earns points by reading the news.

Rank is the average points per scored forecast, so answering more cannot buy a higher position. An expert needs 5 scored forecasts to get a position. Each expert sees only their own rank, and ACAPS sees all of them.

## Does the scoring work?

We tested it on the real outcomes of 104 past ACAPS risks, using 76 simulated experts whose skill we set in advance.

- Rank matched the skill we set closely, with a rank correlation of 0.76.
- The top 8 experts had an average skill of 0.79, against 0.57 for all 67 experts with a position.

This shows the scoring can find skilled experts when they exist. It says nothing about how real experts will do, because the simulation was told how skilled each expert is.

## What is real and what is simulated

| Real, from the ACAPS Risk Radar export | Simulated |
|---|---|
| 139 risks across 57 countries, including 28 active risks and 104 past risks with known outcomes | Every expert, vote, comment and forecast |
| Triggers, ratings and what happened | Approvals, anonymity choices and display names |

No real person is in the data. The expert comments, replies and suggested cards are sample text. We set the demo expert's skill high, so the Ranking screen shows a top place.

## Before a pilot

The app runs on generated files, with no server or real login yet, so anything done in it lasts until the page reloads. These questions are still open:

- **Forecast questions need a clear rule.** Each question must say what counts as happening. The conditions in ACAPS's triggers are a good starting point.
- **Points arrive late.** They only come with outcomes, and the pilot runs for about two months, so experts need another reason to return before then. Alert data exists, but nothing delivers alerts yet.
- **Country panels come first.** In the simulated data, a typical risk has only 2 or 3 answers from country experts, and one open risk has none.
- **The weights are an assumption.** ACAPS should test them during the pilot. The simulation cannot show that local experts are more accurate, because we set that ourselves.
- **Verified anonymous depends on access.** The identity table shares an ID with the answers, so ACAPS must limit who can open it.
- **Anonymity needs two settings.** The data model has levels for what ACAPS sees, but the app only lets experts choose what other experts see.

## Run it

Tested on Python 3.12.

```bash
pip install -r requirements.txt
python src/build_demo_data.py   # rebuilds data/synthetic/ and app/data/
python -m pytest tests          # 171 tests

cd frontend
npm install
npm run dev
```

Use `build_demo_data.py` to rebuild the data. The save cell in notebook 05 writes the app file without ranks, and notebook 03 overwrites `experts.csv` with an old format.

## What's in this repo

| Path | What it holds |
|---|---|
| `src/synthetic_data.py` | Builds the simulated tables |
| `src/points.py` | Points, ranks, card order and results |
| `src/expert_stats.py` | Contributions and alerts for the screens |
| `src/screen_tables.py` | Replies, moderator messages, summaries and the demo expert's starting point |
| `src/app_bundle.py` | Builds the file the expert app reads |
| `src/build_demo_data.py` | Rebuilds everything with one command |
| `data/data_model/data_model.md` | The data model and the rules behind it |
| `data/synthetic/` | The generated tables |
| `app/data/expert_demo.json` | Everything the expert app reads for the demo expert |
| `frontend/` | The expert app and website: React and TypeScript, reading through `src/data/api.ts` |
| `analyst/moderator_mockup_v3.html` | ACAPS's moderator view |
| `tests/` | Tests for the build, points, anonymity and group numbers |
| `docs/` | Challenge brief, data dictionary and evaluation criteria |
| `notebooks/data/` | Data exploration and preparation |

## License

MIT, see [LICENSE](LICENSE). ACAPS data is used under [ACAPS' terms of use](https://www.acaps.org/en/about/terms-of-use).

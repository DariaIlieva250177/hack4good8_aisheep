# Data model

How the app stores ACAPS risks, experts and their contributions. Each section below is one table: what it stores, what it is used for, and who fills it.

All expert data during the hackathon is **synthetic**. No personal data of real experts is used.

## How to read the tables

- **PK** (primary key) is the table's own ID.
- **FK** (foreign key) is an ID that points to another table.
- Answers only ever store an `expert_id`. Real names live in one separate table (`EXPERT_IDENTITY`), so no screen can show them by accident.

The tables fall into five groups:

| Group | Tables |
|---|---|
| From ACAPS (read only) | `RISKS`, `TRIGGERS` |
| People | `EXPERTS`, `EXPERT_IDENTITY`, `PANELS`, `PANEL_MEMBERS` |
| Contributions | `ROUNDS`, `RESPONSES`, `TRIGGER_VOTES`, `SUGGESTED_TRIGGERS` |
| Results | `ROUND_SUMMARIES` |
| Forecasting | `FORECAST_QUESTIONS`, `FORECASTS`, `SCORES` |

---

## From ACAPS (read only)

### `RISKS`

| Field | Type | Notes |
|---|---|---|
| `risk_id` | string, PK | e.g. `R1043` |
| `title` | string | |
| `country` | string | can list several countries |
| `acaps_probability` | string | Very Low ... Very High |
| `acaps_p` | float | the same as a number (0-1), bands to confirm with ACAPS |
| `risk_level` | string | Low, Medium, High |
| `status` | string | Active, Materialised, Not materialised |
| `outcome` | int | 1 = happened, 0 = did not, empty = still active or unknown |

- **Stores:** one row per ACAPS risk.
- **Used for:** the risk shown on the check-in card, and the outcomes used for scoring.
- **Filled by:** notebook `02_prepare_data`, from the ACAPS Risk Radar export.
- **Example:** `R1043` · Chad · High · 0.70 · Active · outcome empty.

### `TRIGGERS`

| Field | Type | Notes |
|---|---|---|
| `trigger_id` | string, PK | e.g. `R1043 - T0618` |
| `risk_id` | string, FK → `RISKS` | |
| `title` | string | |
| `description` | string | |

- **Stores:** one row per trigger, linked to its risk.
- **Used for:** the trigger lines on the check-in card, where experts vote likely, not likely or don't know.
- **Filled by:** notebook `02_prepare_data`, which splits the trigger text.
- **Example:** `T0618` · `R1043` · "Expansion of cross-border attacks and insecurity".

---

## People

### `EXPERTS`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, PK | e.g. `E07` |
| `pseudonym` | string | e.g. Heron |
| `anonymity_level` | string | `known_to_acaps`, `pseudonymous`, `anonymous` |
| `language` | string | e.g. English, French |

- **Stores:** the public side of an expert.
- **Used for:** everything the app shows about an expert. Answers point here, never to a real name.
- **Filled by:** the expert, when joining.
- **Example:** `E07` · Heron · anonymous · English.

### `EXPERT_IDENTITY`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, PK, FK → `EXPERTS` | |
| `name` | string | |
| `organisation` | string | |
| `email` | string | |

- **Stores:** real name, organisation and email.
- **Used for:** only ACAPS contacting or verifying experts who chose "known to ACAPS". Fully anonymous experts have **no row** here.
- **Filled by:** the expert, only if their chosen level allows it.
- **Why separate:** keeping real names in their own table means no screen can show them by accident.

### `PANELS`

| Field | Type | Notes |
|---|---|---|
| `panel_id` | string, PK | e.g. `P-TCD` |
| `country` | string | the country or context |
| `moderator` | string | the ACAPS moderator |

- **Stores:** one row per small expert group, usually one per country.
- **Used for:** keeping groups small (5-10 experts) and moderated, as the brief asks. Check-ins and questions go to a panel.
- **Filled by:** ACAPS.
- **Example:** `P-TCD` · Chad · moderator Alex.

### `PANEL_MEMBERS`

| Field | Type | Notes |
|---|---|---|
| `panel_id` | string, FK → `PANELS` | |
| `expert_id` | string, FK → `EXPERTS` | |

- **Stores:** which expert is in which panel. One expert can be in several panels.
- **Used for:** deciding who gets which check-in, and who counts towards the group view.
- **Filled by:** ACAPS, when inviting experts.
- **Example:** `P-TCD` · `E07`.

---

## Contributions

### `ROUNDS`

| Field | Type | Notes |
|---|---|---|
| `round_id` | string, PK | e.g. `RD1043-1` |
| `panel_id` | string, FK → `PANELS` | |
| `risk_id` | string, FK → `RISKS` | |
| `round_number` | int | 1, 2, ... |
| `opens` | date | |
| `closes` | date | |

- **Stores:** one check-in on one risk for one panel.
- **Used for:** the Delphi process. In round 1 experts answer independently. In round 2, after seeing the group view, they can refine their answers.
- **Filled by:** ACAPS, or automatically when a new analysis is published.
- **Example:** `RD1043-1` · Chad panel · `R1043` · round 1 · 6-13 Nov.

### `RESPONSES`

| Field | Type | Notes |
|---|---|---|
| `response_id` | string, PK | e.g. `RS001` |
| `round_id` | string, FK → `ROUNDS` | |
| `expert_id` | string, FK → `EXPERTS` | |
| `comment` | string | optional, one line |
| `anonymity_used` | string | the level the expert chose when answering |
| `submitted` | date | |

- **Stores:** one expert's answer in one round.
- **Used for:** the record that an expert took part. Trigger votes, suggestions and forecasts hang off it.
- **Filled by:** the expert, by pressing "Send my view".
- **Why `anonymity_used`:** if the expert changes their level later, you still know what they agreed to when answering.

### `TRIGGER_VOTES`

| Field | Type | Notes |
|---|---|---|
| `response_id` | string, FK → `RESPONSES` | |
| `trigger_id` | string, FK → `TRIGGERS` | |
| `vote` | string | `likely`, `not_likely`, `dont_know` |

- **Stores:** one vote per trigger per response.
- **Used for:** the "how many agree" bars in the group view, and the agreement column in the moderator view.
- **Filled by:** the expert, by tapping on the check-in card.
- **Example:** `RS001` · `T0618` · likely.

### `SUGGESTED_TRIGGERS`

| Field | Type | Notes |
|---|---|---|
| `suggestion_id` | string, PK | |
| `response_id` | string, FK → `RESPONSES` | |
| `text` | string | |
| `status` | string | `new`, `accepted`, `rejected` |

- **Stores:** ideas an expert adds about what's missing.
- **Used for:** the "what's missing" part of ground truthing. Accepted suggestions can become real triggers in ACAPS's analysis, which is the loop back to ACAPS.
- **Filled by:** the expert writes it, and the moderator sets the status.
- **Example:** "Seasonal flooding blocks aid routes" · new.

---

## Results

### `ROUND_SUMMARIES`

| Field | Type | Notes |
|---|---|---|
| `round_id` | string, FK → `ROUNDS` | |
| `summary` | string | |
| `approved` | bool | |
| `published` | date | |

- **Stores:** the moderator's written summary of a round.
- **Used for:** the summary text in the group view, and the only thing ever shown publicly (once approved).
- **Filled by:** the moderator, possibly starting from an AI draft (allowed behind the scenes).
- **Note:** the group numbers (median, how many agree) are **not stored**. They are calculated from the answers when the screen opens, so they stay up to date and cannot leak individual answers.

---

## Forecasting

### `FORECAST_QUESTIONS`

| Field | Type | Notes |
|---|---|---|
| `question_id` | string, PK | e.g. `Q1043-A` |
| `risk_id` | string, FK → `RISKS` | |
| `trigger_id` | string, FK → `TRIGGERS` | optional, if the question is about one trigger |
| `question` | string | a clear yes-or-no question |
| `horizon_months` | int | e.g. 6, or shorter for the pilot |
| `closes` | date | no more forecasts after this |
| `resolves_on` | date | when the answer is decided |
| `resolution_rule` | string | how the answer is decided |
| `status` | string | `open`, `closed`, `resolved` |
| `outcome` | int | 1 or 0 once resolved |

- **Stores:** a yes-or-no question with a deadline and a rule for deciding the answer.
- **Used for:** turning ACAPS's analysis into something that can be scored.
- **Filled by:** ACAPS, or generated from risks and triggers. The moderator sets the outcome.
- **Example:** `Q1043-A` · "Will cross-border attacks into eastern Chad increase before 30 April 2027?" · 6 months · open · rule: "Yes if ACAPS marks R1043 as materialised".

### `FORECASTS`

| Field | Type | Notes |
|---|---|---|
| `forecast_id` | string, PK | |
| `question_id` | string, FK → `FORECAST_QUESTIONS` | |
| `expert_id` | string, FK → `EXPERTS` | |
| `response_id` | string, FK → `RESPONSES` | optional, the check-in it was given in |
| `probability` | float | 0-1 |
| `submitted` | date | |

- **Stores:** one expert's probability for one question. Every update is a new row with its own date, so the history is kept.
- **Used for:** the probability slider on the check-in card, the group forecast, and later the scoring.
- **Filled by:** the expert, using the slider.
- **Example:** `F001` · `Q1043-A` · Heron · 0.70 · 6 Nov, then `F014` · 0.80 · 20 Dec.

### `SCORES`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, FK → `EXPERTS` | |
| `question_id` | string, FK → `FORECAST_QUESTIONS` | |
| `brier` | float | (forecast − outcome)², lower is better |
| `scored_on` | date | |

- **Stores:** each expert's Brier score on each resolved question.
- **Used for:** the scoreboard and an expert's own track record.
- **Filled by:** automatically, when a question resolves (the calculation tested in notebook `03_synthetic_experts_scoring`).
- **Example:** Heron · `Q1043-A` · (0.80 − 1)² = 0.04.

---

## Who sees what

| Data | The expert | Other panel experts | ACAPS moderator | Public |
|---|---|---|---|---|
| `EXPERT_IDENTITY` | own only | never | only if "known to ACAPS" | never |
| Individual `RESPONSES`, votes, forecasts | own only | never | yes, by pseudonym | never |
| Group numbers (median, how many agree) | yes | yes, after a minimum number of answers | yes | never |
| `ROUND_SUMMARIES` | yes | yes | writes and approves | only if approved |
| `SCORES` / scoreboard | own score | to decide | yes, by pseudonym | never |

## How it all works together

ACAPS risks and triggers (`RISKS`, `TRIGGERS`) go to small groups of pseudonymous experts (`EXPERTS`, `PANELS`) in check-ins (`ROUNDS`). Their votes, ideas and forecasts are saved without names (`RESPONSES`, `TRIGGER_VOTES`, `SUGGESTED_TRIGGERS`, `FORECASTS`), summarised by ACAPS (`ROUND_SUMMARIES`), and scored once questions resolve (`FORECAST_QUESTIONS`, `SCORES`).

## Open questions for ACAPS

1. Minimum number of answers before the group view is shown (suggestion: 3).
2. Whether moderators may see pseudonyms of fully anonymous experts.
3. Whether experts can change past answers, or only answer again in a new round.
4. Forecast horizon for the two-month pilot: six months, or shorter questions too?
5. Who resolves forecast questions, and which forecast counts (the last one before closing, or an average).
6. Whether the scoreboard is shown to other experts, or only to the expert and ACAPS.

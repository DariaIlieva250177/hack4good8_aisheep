# Data model

How Ground Truth stores ACAPS risks, experts and their contributions. Each section is one table: its fields, what it stores, what it is used for and who fills it.

The model has two parts:

- **Demo tables:** everything the hackathon demo needs. These are built now.
- **Later tables:** the rest of the platform concept, listed at the end. They are designed but not built during the hackathon.

All expert data during the hackathon is **synthetic**. No personal data of real experts is used.

## How to read the tables

- **PK** (primary key) is the table's own ID. **FK** (foreign key) points to another table.
- Answers only ever store an `expert_id`. Real names live in one separate table (`EXPERT_IDENTITY`), so no screen can show them by accident.
- Settings that are still to be confirmed with ACAPS (probability bands, minimum answers, urgency thresholds) are kept in one place in the code, so a decision is a one-line change.

| Group | Demo tables |
|---|---|
| From ACAPS (read only) | `RISKS`, `TRIGGERS` |
| People | `EXPERTS`, `EXPERT_IDENTITY`, `PANELS`, `PANEL_MEMBERS` |
| Browsing | `CARD_SWIPES` |
| Contributions | `ROUNDS`, `RESPONSES`, `TRIGGER_VOTES`, `SUGGESTED_TRIGGERS` |
| Results | `ROUND_SUMMARIES` |
| Forecasting | `FORECAST_QUESTIONS`, `FORECASTS`, `SCORES` |

---

## From ACAPS (read only)

### `RISKS`

| Field | Type | Notes |
|---|---|---|
| `risk_id` | string, PK | e.g. `R1043` |
| `title` | string | shown on the card |
| `country` | string | can list several countries |
| `risk_type` | string | new emerging risk, deterioration of an existing crisis, or future impact of a hazard |
| `acaps_probability` | string | Very Low ... Very High |
| `acaps_p` | float | the same as a number (0-1); bands to confirm with ACAPS |
| `risk_level` | string | Low, Medium, High |
| `risk_trend` | string | Improved, Stable, Deteriorated (filled for about 55% of risks) |
| `priority_needs` | string | sectors most likely affected, e.g. Food security, Protection, WASH |
| `status` | string | Active, Materialised, Not materialised |
| `outcome` | int | 1 = happened, 0 = did not, empty = still active or unknown |
| `urgency` | string | worked out for the card colour, see "Card urgency colours" below |

- **Stores:** one row per ACAPS risk.
- **Used for:** the swipe cards, the check-in, and the outcomes used for scoring.
- **Filled by:** notebook `02_prepare_data`, from the ACAPS Risk Radar export. `urgency` is calculated.
- **Example:** `R1043` · Chad · High · Deteriorated · Active · urgency `very_urgent`.

### `TRIGGERS`

| Field | Type | Notes |
|---|---|---|
| `trigger_id` | string, PK | e.g. `R1043 - T0618` |
| `risk_id` | string, FK → `RISKS` | |
| `title` | string | |
| `description` | string | |

- **Stores:** one row per trigger, linked to its risk.
- **Used for:** the trigger lines in the check-in, where experts vote likely, not likely or don't know.
- **Filled by:** notebook `02_prepare_data`, which splits the trigger text.
- **Example:** `T0618` · `R1043` · "Expansion of cross-border attacks and insecurity".

---

## People

### `EXPERTS`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, PK | e.g. `E07` |
| `pseudonym` | string | e.g. Heron |
| `anonymity_level` | string | `known_to_acaps`, `verified_anonymous`, `verified_deleted` |
| `approved` | bool | approved by ACAPS |
| `rank` | string | Observer, Tracker, Sentinel, Beacon |
| `language` | string | e.g. English, French |

- **Stores:** the side of an expert the app works with. It never holds a real name.
- **Used for:** everything the app shows about an expert.
- **Filled by:** the expert when joining; ACAPS sets `approved`; `rank` is recalculated automatically.
- **Example:** `E07` · Heron · `verified_deleted` · approved · Sentinel · English.

The three anonymity levels:

| Level | What ACAPS keeps | What peers see | What the public sees |
|---|---|---|---|
| `known_to_acaps` | Identity stored | Pseudonym | Nothing personal, ever |
| `verified_anonymous` | Identity stored, never shown in the app | Pseudonym | Nothing personal, ever |
| `verified_deleted` | Identity checked at approval, then deleted | Pseudonym | Nothing personal, ever |

### `EXPERT_IDENTITY`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, PK, FK → `EXPERTS` | |
| `name` | string | |
| `organisation` | string | |
| `email` | string | |

- **Stores:** real name, organisation and email.
- **Used for:** ACAPS approving, contacting and verifying experts.
- **Filled by:** the expert at sign-up.
- **Rule:** for `verified_deleted` experts, the row is deleted after approval, so there is **no row** for them afterwards.

### `PANELS`

| Field | Type | Notes |
|---|---|---|
| `panel_id` | string, PK | e.g. `P-TCD` |
| `country` | string | the country or context |
| `moderator` | string | the ACAPS moderator |

- **Stores:** one small expert group per country, around 5 to 10 people.
- **Used for:** deciding which cards and check-ins an expert sees.
- **Filled by:** ACAPS.

### `PANEL_MEMBERS`

| Field | Type | Notes |
|---|---|---|
| `panel_id` | string, FK → `PANELS` | |
| `expert_id` | string, FK → `EXPERTS` | |

- **Stores:** which expert is in which panel. Panels follow expertise, not only nationality, so one expert can be in several.
- **Filled by:** ACAPS, when inviting experts.

---

## Browsing

### `CARD_SWIPES`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, FK → `EXPERTS` | |
| `risk_id` | string, FK → `RISKS` | |
| `action` | string | `pick` (swipe right) or `skip` (swipe left) |
| `swiped` | date | |

- **Stores:** each swipe on a risk card.
- **Used for:** the expert's queue of picked risks. ACAPS sees only skip **counts** per risk, which show where a panel lacks knowledge, never who skipped.
- **Filled by:** the expert, by swiping (or the buttons on desktop).
- **Example:** `E07` · `R1043` · pick · 6 Nov.

### Card urgency colours

`urgency` on `RISKS` decides the card colour. Every card also shows the text label and an icon, so colour is never the only signal.

| `urgency` | Colour | Label | When |
|---|---|---|---|
| `very_urgent` | Red | Very urgent | High risk that is deteriorating, or a check-in closing within 48 hours |
| `urgent` | Orange | Urgent | High risk |
| `watch` | Yellow | Watch | Medium risk |
| `not_urgent` | Light green | Not so urgent | Low risk, or a risk that is improving |

The thresholds are a setting, to confirm with ACAPS.

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
- **Used for:** the Delphi process. In round 1 experts answer independently; after seeing the group view they can revise.
- **Filled by:** ACAPS, or automatically when a risk is published or updated.

### `RESPONSES`

| Field | Type | Notes |
|---|---|---|
| `response_id` | string, PK | e.g. `RS001` |
| `round_id` | string, FK → `ROUNDS` | |
| `expert_id` | string, FK → `EXPERTS` | |
| `stance` | string | `agree` or `disagree` with ACAPS's analysis |
| `comment` | string | optional, short |
| `source_url` | string | optional article or paper |
| `ai_draft_used` | bool | true if the comment started as an AI draft from the source; the expert always edits and approves it |
| `hidden_from_acaps` | bool | per-answer anonymity for `known_to_acaps` experts |
| `anonymity_used` | string | the expert's level when answering |
| `version` | int | 1 = first answer, 2 = revised answer, ... |
| `revises_response_id` | string, FK → `RESPONSES` | the earlier answer this one replaces; empty for version 1 |
| `submitted` | date | |

- **Stores:** one expert's answer in one round. A revised answer is a **new row**, so the first answer is kept and ACAPS can see how views moved.
- **Used for:** the group view (how many agree), the moderator view, and the record that an expert took part.
- **Filled by:** the expert, by pressing "Send my view".
- **Rule:** when `hidden_from_acaps` is true, no ACAPS screen shows which expert gave the answer. It still counts towards the expert's track record automatically.

### `TRIGGER_VOTES`

| Field | Type | Notes |
|---|---|---|
| `response_id` | string, FK → `RESPONSES` | |
| `trigger_id` | string, FK → `TRIGGERS` | |
| `vote` | string | `likely`, `not_likely`, `dont_know` |

- **Stores:** one vote per trigger per response (optional for the expert).
- **Used for:** the "how many think this trigger is likely" bars in the group view.

### `SUGGESTED_TRIGGERS`

| Field | Type | Notes |
|---|---|---|
| `suggestion_id` | string, PK | |
| `response_id` | string, FK → `RESPONSES` | |
| `text` | string | |
| `status` | string | `new`, `accepted`, `rejected` |

- **Stores:** triggers an expert thinks ACAPS missed, added during a check-in.
- **Used for:** the "what's missing" part of ground truthing. Accepted ones feed back into ACAPS's analysis.
- **Filled by:** the expert writes it; the moderator sets the status.

---

## Results

### `ROUND_SUMMARIES`

| Field | Type | Notes |
|---|---|---|
| `round_id` | string, FK → `ROUNDS` | |
| `summary` | string | |
| `approved` | bool | |
| `published` | date | |

- **Stores:** the moderator's written summary of a round, possibly started from an AI draft.
- **Used for:** the summary in the group view, and the only thing ever shown publicly (once approved).
- **Note:** group numbers (how many agree, median forecast) are **not stored**. They are calculated from `RESPONSES` and `FORECASTS` when the screen opens, and only once the minimum number of answers is reached (a setting, suggested: 3).

---

## Forecasting

### `FORECAST_QUESTIONS`

| Field | Type | Notes |
|---|---|---|
| `question_id` | string, PK | e.g. `Q1043-A` |
| `risk_id` | string, FK → `RISKS` | |
| `trigger_id` | string, FK → `TRIGGERS` | optional, if the question is about one trigger |
| `question` | string | a clear yes-or-no question |
| `horizon_months` | int | 2 by default, to fit the two-month pilot |
| `closes` | date | no more forecasts after this |
| `resolves_on` | date | when the answer is decided |
| `resolution_rule` | string | how the answer is decided |
| `status` | string | `open`, `closed`, `resolved` |
| `outcome` | int | 1 or 0 once resolved |

- **Example:** `Q1043-A` · "Will cross-border attacks into eastern Chad increase in the next two months?" · 2 months · open.

### `FORECASTS`

| Field | Type | Notes |
|---|---|---|
| `forecast_id` | string, PK | |
| `question_id` | string, FK → `FORECAST_QUESTIONS` | |
| `expert_id` | string, FK → `EXPERTS` | |
| `response_id` | string, FK → `RESPONSES` | the check-in it was given in |
| `answer_level` | string | `very_unlikely`, `unlikely`, `even_chance`, `likely`, `very_likely`, `dont_know` |
| `probability` | float | worked out from `answer_level`; empty for `dont_know` |
| `submitted` | date | |

The five-level scale mirrors ACAPS's own probability scale. The percentages are a setting, to confirm with ACAPS:

| `answer_level` | `probability` |
|---|---|
| `very_unlikely` | 0.10 |
| `unlikely` | 0.30 |
| `even_chance` | 0.50 |
| `likely` | 0.70 |
| `very_likely` | 0.90 |
| `dont_know` | empty, not scored |

### `SCORES`

| Field | Type | Notes |
|---|---|---|
| `expert_id` | string, FK → `EXPERTS` | |
| `question_id` | string, FK → `FORECAST_QUESTIONS` | |
| `brier` | float | (probability − outcome)², lower is better |
| `scored_on` | date | |

- **Scoring method:** the **Brier score**. It rewards honest forecasts and is easy to explain: 0 is perfect, 0.25 is always guessing 50%. It was tested in notebook `03_synthetic_experts_scoring` on 104 real ACAPS outcomes.
- **Simple accuracy** ("right on 8 of 10 forecasts") is shown as an extra in each expert's yearly overview, but ranks use the Brier score.
- **Filled by:** automatically, when a question resolves.

---

## Who sees what

| Data | The expert | Other panel experts | ACAPS moderator | Public |
|---|---|---|---|---|
| `EXPERT_IDENTITY` | own only | never | yes, except `verified_deleted` (no row exists) | never |
| Individual responses, votes, forecasts | own only | never | yes, by pseudonym, unless `hidden_from_acaps` | never |
| Card swipes | own only | never | skip counts per risk only | never |
| Group numbers | yes | yes, after the minimum number of answers | yes | never |
| `ROUND_SUMMARIES` | yes | yes | writes and approves | only if approved |
| Rank and scores | own | rank next to pseudonym, if ACAPS agrees | yes, by pseudonym | never |

---

## Later tables (designed, not built in the demo)

| Table | Main fields | Purpose |
|---|---|---|
| `APPROVALS` | expert_id, decision, decided_by, date | Record of ACAPS approving each expert |
| `NOTIFICATION_TOKENS` | random_code, device_token, platform | Device alerts, stored apart from answers |
| `NOTIFICATION_ADDRESSES` | random_code, email | Opt-in email alerts, held by a separate service |
| `DISCUSSION_POSTS` | post_id, round_id, expert_id, side (for or against), text, reply_to | The structured discussion |
| `SIGNALS` | signal_id, expert_id, country, type (new risk or missing trigger), text, status | Input raised outside a check-in |
| `RANK_HISTORY` | expert_id, rank, from_date, to_date | How ranks change over the past 12 months |
| `CERTIFICATES` | certificate_id, expert_id, reason, verification_code, issued | Recognition, including for anonymous experts |
| `CLIENT_REQUESTS` | request_id, client, question, service_level, round_id, status | Expert panel analysis on request |

---

## Open questions for ACAPS

1. Is `verified_deleted` acceptable, and which notification channels would ACAPS accept for those experts?
2. Which probability bands should the forecast scale use: the infographic or the methodology PDF?
3. What is the minimum number of answers before the group view opens (suggested: 3)?
4. May moderators see pseudonyms of fully anonymous experts?
5. Which data should set a card's urgency colour?
6. Should other experts see ranks next to pseudonyms?

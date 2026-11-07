# Data model

How Ground Truth stores ACAPS risks, experts and everything experts do in the app. There are 31 tables in seven groups. `python src/build_demo_data.py` builds all of them; the files are in `data/synthetic/`. Notebook `05_generate_synthetic_data` builds the first 28, but not the points tables in group 7.

**Real** ACAPS data: risks, countries, triggers, outcomes. **Synthetic**: everything about experts. No real person is in the data.

## The rules behind the model

- **Domains** are the 15 risk categories (cross-border insecurity, armed conflict, displacement, ... aid and funding cuts, plus 0 = no match). The export has no category column, so each risk gets its categories from keywords in its title and triggers.
- **Matching.** An expert sees a risk as a card if it matches an **approved** country **or** an approved domain. If it matches neither, the expert can only read that risk's discussion.

  | Match | Starting weight |
  |---|---|
  | Country and domain | 1.0 |
  | Country only | 0.6 |
  | Domain only | 0.4 |

  The weights set how much a vote counts in the weighted total on each card, so a vote from an expert matched on country and domain counts for more than a domain-only vote. They do not change the rank. They are a starting assumption for ACAPS to test in the pilot.
- **Group answers on a card.** Each card shows the plain counts, the weighted total, and a separate line for experts matched on the risk's country. That line stays empty under 3 answers, because in a smaller group it could show how one person voted.
- **Approval** happens per country and per domain. The moderator can deny any of them.
- **Anonymity.** The expert chooses the level at registration and can change it in settings:
  - **known to ACAPS:** personal data kept; the expert can hide their name from ACAPS on a single answer. ACAPS still sees and uses the answer, just not who gave it.
  - **verified anonymous:** personal data kept in `expert_identity` and never shown in the app. It shares an `expert_id` with the expert's answers, so this rests on who at ACAPS can open that table.
  - **verified, then deleted:** personal data, documents, the application comment and education are needed for approval, then deleted.

  Changing level only applies to new answers. Past answers stay as they were given, so an answer ACAPS could see stays visible to ACAPS.

  **Account recovery works like a crypto wallet.** At registration every expert gets a secret recovery code (12 words), shown once. Only that code lets them reset a forgotten password. ACAPS stores just a salted hash of the code, so nobody at ACAPS can read it. If the code is lost, the account cannot be recovered. No email is needed for recovery, so emails are deleted together with the other personal data for "verified, then deleted".
- **Display names** are kept in their own table, not in `experts`. In a discussion an expert always has an alias. It stays the same throughout one risk so people can debate with them, changes on the next risk, and is never reused, so two discussions cannot be linked through a name.
- **Swipes:**

  | Action | Result |
  |---|---|
  | Agree or disagree, then right | Answer saved, to-do item for a longer comment |
  | Agree or disagree, then left | Answer saved, done |
  | No answer, then right | To-do item, answer later |
  | No answer, then left | Skipped |

- **Changing an opinion** is allowed **once**. The new stance and forecast are saved as version 2, and a "Changed opinion" comment appears in the same discussion.
- **Community.** Everyone answers alone. An expert joins a risk's community after their first answer, even just agree or disagree, and only then sees comments and group numbers.
- **Two endings.** Each risk has a chat with a deadline set by ACAPS. When it passes, answers lock and experts see the group results. The risk itself ends later, when it happens or when its N months run out, which counts as did not happen. Then experts get an alert and see what happened and their points.
- **Points.** When ACAPS closes a risk that happened, it records the date it happened. Points use each expert's last answer from before that date. If a risk happens while its chat is still open, later answers still reach ACAPS but earn nothing, because by then anyone can read the news.
- **Urgency** sets the card colour and the order of the to-do list. Every risk is at least yellow; there is no green:

  | Urgency | Colour | When |
  |---|---|---|
  | Very urgent | Red | High risk that is deteriorating, or its chat closes within 2 days |
  | Urgent | Orange | High risk |
  | Watch | Yellow | Every other risk |

- **Triggers come from ACAPS.** Every risk shows the triggers ACAPS already posted. Experts can suggest a missing one; it joins the list only after ACAPS accepts it, and the app never shows which expert suggested it.
- **ACAPS opens each risk**, sets its chat deadline and its horizon (N months), and can edit the forecast question.

---

## 1. ACAPS data (real)

### `categories`
| Field | Notes |
|---|---|
| `category_id` | 0-14 |
| `name` | e.g. Cross-border insecurity |
| `image_description` | what the card image shows |
| `file_name` | e.g. `cat-border` |

### `risks`
| Field | Notes |
|---|---|
| `risk_id` | e.g. `R1043` |
| `title`, `short_explanation`, `rationale` | the card shows title and short explanation (first two sentences) |
| `country`, `iso`, `risk_type` | |
| `acaps_probability`, `acaps_p` | the word and the number (bands to confirm with ACAPS) |
| `impact`, `risk_level`, `risk_trend` | |
| `expected_exposure`, `priority_needs` | |
| `status`, `outcome` | outcome 1 = happened, 0 = did not, empty = still open |
| `category_id`, `category`, `category_image` | main category and its image |
| `community_name` | short name of the risk's discussion, built from the country and category |
| `urgency`, `urgency_colour`, `urgency_hex`, `urgency_label`, `urgency_score` | for active risks only; red, orange or yellow |

### `countries`
Every country in the data, for the contributions map. Fields: `country`, `iso_numeric` (the map's code, kept as text), `region`. From `data/country_regions.csv`.

### `risk_countries`
One row per risk per country, because a risk can cover several countries. Fields: `risk_id`, `country`.

### `risk_categories`
All categories a risk matches. Fields: `risk_id`, `category_id`, `is_primary`.

### `triggers`
| Field | Notes |
|---|---|
| `trigger_id`, `risk_id`, `title`, `description` | |
| `source` | `acaps` for triggers ACAPS posted (from the export, most of them), `expert_suggestion` for accepted suggestions |
| `suggestion_id`, `suggested_by` | only for accepted suggestions; never shown in the app |
| `added_at` | when ACAPS accepted a suggestion |

---

## 2. Registration and approval (synthetic)

### `experts`
| Field | Notes |
|---|---|
| `expert_id` | e.g. `E001`; no name or display name here |
| `status` | `pending`, `approved`, `rejected` |
| `anonymity_level` | current level |
| `education_level`, `education_field` | from the registration form; empty after approval for verified, then deleted |
| `application_comment` | the short comment; empty after approval for verified, then deleted |
| `registered_at`, `reviewed_at`, `reviewed_by` | |
| `language` | |

### `expert_identity`
| Field | Notes |
|---|---|
| `expert_id` | |
| `recovery_code_hash`, `recovery_code_salt` | the hash of the expert's secret recovery code, never the code itself |
| `recovery_code_created_at` | |
| `contact_email` | empty after approval for verified, then deleted |
| `full_name`, `organisation` | empty after approval for verified, then deleted |
| `personal_data_deleted_at` | when the personal data was removed |

### `expert_countries` and `expert_domains`
One row per country or domain the expert asked for. Fields: `expert_id`, `country` or `category_id`, `status` (`pending`, `approved`, `denied`), `reviewed_by`, `reviewed_at`, `denial_reason`.

### `application_documents`
| Field | Notes |
|---|---|
| `document_id`, `expert_id` | |
| `doc_type` | diploma, certificate, cv, publication |
| `supports_category_id` | which domain it supports |
| `file_name` | empty once deleted |
| `uploaded_at`, `deleted_at` | |

### `anonymity_history`
Every level an expert has had. Fields: `expert_id`, `level`, `valid_from`, `valid_to`, `changed_in` (`registration` or `settings`).

### `moderators`
ACAPS staff, without names. Fields: `moderator_id`, `role` (approver, moderator, both), `label`.

---

## 3. Matching and names

### `expert_risk_matches`
Which risks each approved expert can answer. Fields: `expert_id`, `risk_id`, `match_type`, `match_weight`. Risks missing here for an expert are read only for them.

### `display_names`
Fields: `expert_id`, `risk_id`, `display_name`, `valid_from`, `valid_to`. Names are unique within a risk and differ between risks.

---

## 4. What ACAPS publishes

### `risk_windows`
When a risk's chat is open. Fields: `window_id`, `risk_id`, `opens`, `closes` (the deadline, when answers lock), `set_by`.

### `forecast_questions`
| Field | Notes |
|---|---|
| `question_id`, `risk_id` | `Q-...` for open risks, `QH-...` for past risks |
| `question_text`, `original_text` | ACAPS can edit the question |
| `horizon_months` | N, chosen by ACAPS |
| `created_by`, `edited_by`, `edited_at` | |
| `opens`, `closes`, `resolves_on` | `closes` is the chat deadline, `resolves_on` is the end of the N months |
| `happened_on` | the date it happened, entered by ACAPS when closing; empty if it did not. The export has no such date, so past risks use `resolves_on` |
| `status`, `outcome` | `open` or `resolved`; outcome once resolved |
| `is_backtest` | true for past risks with real outcomes, used to test scoring |

---

## 5. What experts do (synthetic)

### `card_swipes`
Fields: `swipe_id`, `expert_id`, `risk_id`, `stance_on_card` (agree, disagree or empty), `direction` (left or right), `result` (`todo`, `done`, `skipped`), `swiped_at`.

### `todo_items`
Fields: `expert_id`, `risk_id`, `added_at`, `status` (`open` or `done`), `completed_at`. The app sorts open items by urgency.

### `stances`
| Field | Notes |
|---|---|
| `stance_id`, `expert_id`, `risk_id` | |
| `stance` | `agree` or `disagree` |
| `version`, `changed_opinion`, `previous_stance_id` | version 2 = the one allowed change |
| `given_at` | |
| `name_hidden_from_acaps` | per-answer anonymity: ACAPS sees the answer but not who gave it |
| `match_type`, `match_weight` | how well the expert matches this risk |

### `comments`
| Field | Notes |
|---|---|
| `comment_id`, `risk_id`, `expert_id` | the display name comes from `display_names` |
| `kind` | `answer` or `changed_opinion` |
| `text` | |
| `source_id`, `ai_draft_used` | when the comment started from an AI summary of a source |
| `reply_to` | for threaded discussion later |
| `posted_at` | |
| `name_hidden_from_acaps` | true when the expert hid their name on this risk |

### `sources`
| Field | Notes |
|---|---|
| `source_id`, `expert_id`, `risk_id` | |
| `source_type`, `title`, `url` | |
| `ai_summary_draft` | what the AI wrote |
| `final_text` | what the expert approved |
| `edited_by_expert`, `added_at` | |

### `comment_likes`
Fields: `comment_id`, `expert_id`, `liked_at`. Only members of that risk's community can like.

### `forecasts`
| Field | Notes |
|---|---|
| `forecast_id`, `question_id`, `expert_id` | |
| `version`, `previous_forecast_id` | version 2 = the one allowed change, moved one step towards the new opinion |
| `answer_level` | very unlikely, unlikely, even chance, likely, very likely, or don't know |
| `probability` | from the answer level (0.1 to 0.9); empty for don't know |
| `match_type`, `match_weight` | |
| `submitted_at` | |
| `name_hidden_from_acaps` | true when the expert hid their name on this risk |

### `suggestions`
| Field | Notes |
|---|---|
| `suggestion_id`, `expert_id` | |
| `type` | `missing_trigger` or `new_risk` |
| `risk_id` | for missing triggers |
| `country`, `category_id` | for new risks |
| `title`, `description`, `created_at` | |
| `status`, `reviewed_by`, `reviewed_at` | accepted triggers are added to `triggers` |

### `discussion_views`
Read-only views of discussions outside an expert's countries and domains. Fields: `expert_id`, `risk_id`, `viewed_at`.

### `notifications`
The alerts an expert receives. Fields: `notification_id`, `expert_id`, `kind`, `risk_id`, `created_at`, `read_at` (empty = unread). Kinds: `new_risk`, `reply`, `result`. `private_message` joins them when private chat is built.

### `discussion_reads`
When an expert last opened a discussion they joined. Fields: `expert_id`, `risk_id`, `last_read_at`. Comments by others after that time are their unread count.

---

## 6. Simulation only

### `_simulation/expert_truth.csv`
The hidden skill, bias, noise, activity and comment quality of each synthetic expert, which one is the demo expert, and the plain recovery codes so the team can test the recovery screen. It's used only for **testing**; the app never reads it.

---

## 7. Points and screen numbers

Built by `src/build_demo_data.py`, not the notebook. Each expert sees only their own rows.

### `ranks`
Every approved expert's points. Position goes by average points per scored forecast, and experts under 5 scored forecasts have no position yet. Fields: `expert_id`, `points`, `average_points`, `position`, `forecast_points`, `bonus_points`, `forecasts`, `calls`, `correct`.

### `group_ranks`
Each expert's position inside their approved countries and domains, using the same average. Groups under 3 ranked experts are left out. Fields: `expert_id`, `group_type` (`country` or `domain`), `group`, `position`, `out_of`.

### `contributions`
How much each expert contributed per country. A risk across two countries counts in both. Fields: `expert_id`, `country`, `region`, `votes`, `comments`, `sources`, `forecasts`, `total`.

---

## Who sees what

| Data | The expert | Other experts | ACAPS moderator | Public |
|---|---|---|---|---|
| `expert_identity` | own | never | only if personal data is kept | never |
| Stances, comments, forecasts | own | in the risk's community, under that risk's display name | yes, without the name if the expert hid it | never |
| Rank | **own only** | never | yes | never |
| Swipes, to-do items | own | never | skip counts per risk only | never |
| Discussions outside own countries and domains | read only | | yes | never |

---

## Later (designed, not generated yet)

| Table | Purpose |
|---|---|
| `discussion_threads`, `private_messages` | Public threads and private discussions between two experts |
| `notification_tokens`, `notification_addresses` | How alerts reach anonymous experts, stored apart from answers |
| `client_requests` | Expert panel analysis on request |
| `moderation_log` | Every approval, denial and edit by ACAPS staff |

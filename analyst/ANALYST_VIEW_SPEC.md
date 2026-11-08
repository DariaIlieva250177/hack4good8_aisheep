# ACAPS analyst view: feature spec

Desktop-only web view for ACAPS analysts and moderators. It lays out expert input so the analyst can decide; it never draws conclusions itself. The prototype is `acaps_analyst_view.html` (one file, vanilla JS). Rebuild the features below in any style.

## Principles
- A tool, not an analysis: show what experts said, compared with ACAPS. No platform verdicts ("worsening", "high risk overall").
- Moderators see experts by a stable **expert ID** (for example `E-0412`), never by the per-risk pseudonym peers see. Real names only for experts who chose "Known to ACAPS".
- Red is reserved for risk level. Use the expert app's tokens (`frontend/src/styles/tokens.css`): logo blue `#0196BA`, glass surfaces, dark teal by default with a light theme.
- Mark synthetic data as such.

## Navigation (top bar)
Countries · Expert accounts · Experts to approve (badge) · New risks and triggers (badge) · Upload a risk. Theme switch: Dark / Light.

## 1. Countries (start page)
- World map. Countries with active risks are coloured by how expert forecasts moved since the last monthly snapshot (mostly higher / unchanged / lower); others grey.
- Hover: country name and movement. Click: open the country page.
- Below the map: the same countries as name buttons (no numbers).

## 2. Country page
- Header: country name; facts: active risks, expert answers, share of answers agreeing with ACAPS.
- **AI draft summary** of the experts' answers: first two sentences visible, "Read more", status "Checked / Not checked by a moderator", button "See all answers".
- **Do experts agree with ACAPS?** One block per risk: risk level, "n of panel answered", the full ACAPS statement (as on the expert's card), agree/disagree bar with counts. Left edge coloured by risk level. Click: risk detail.
  - "Compare with: Now only / End of October / End of September": dashed marker for the earlier agreement, "was 71%", and a short list of risks whose agreement changed.
- **Agree and disagree, month by month**: one small histogram per risk. Each month: agree bar above a zero line, disagree bar below, with counts.
- **Cross-border links**: the country in the centre, linked countries around it (dashed if they have no active ACAPS risk). Hover a linked country: tooltip listing which risks connect them and a one-line reason. Click: open that country.
- **What experts raised**: topics grouped by AI, with the number of answers. Click: an example quote with the expert ID and a link to the answers.
- **Triggers mentioned in answers** (picked out by AI): ACAPS triggers experts referred to, with the number of answers; click to read them.

## 3. Risk detail (side panel)
- ID, countries, "n of panel answered", ACAPS level and probability, topics.
- Question 1, "Do you agree with this statement?": the statement and the agree/disagree split.
- Question 2, this round's likelihood question, with the count per answer (Very unlikely, Unlikely, Neutral, Likely, Very likely) and ACAPS's probability.
- Agree/disagree histogram by month.
- **Likelihood, round by round**: the question can change each round, so each round is shown separately with its own question and answer counts (current round open, earlier rounds collapsible). Never plotted as one line.
- All answers and replies (see 4).
- Analyst actions: flag for the next update; ask the experts a question (sent to that risk's experts); a private note.

## 4. Answers and replies (side panel, "See all answers")
- Grouped by risk. Each answer: expert ID (clickable), Agree/Disagree, likelihood answer, text, likes, replies nested under it.
- Under each ID: "x of y resolved forecasts right". Experts with a strong record (8+ resolved, 75%+ right) get a highlighted card and a "Strong track record" badge; answers are sorted best record first.
- AI draft summary at the top with "Mark summary as checked" and "Edit summary".

## 5. Expert accounts
- Tiles: approved experts, active this week, average accuracy, privacy levels (bar).
- Chart: answers and agreement per month.
- List of experts by ID: privacy level, rank, countries, accuracy, activity. Filter by privacy level; sort by most accurate or most active.
- **Expert account** (opened from the list or by clicking an ID under any comment; "Back" returns to the answers):
  - Privacy level, rank, place on their panel ("#2 of 6 on the Chad panel").
  - Who they are: Known to ACAPS shows name, organisation, education, documents. Verified anonymous: "details kept for verification only". Verified, then deleted: no personal details at all.
  - Rank ladder with rules; statistics (resolved forecasts right, accuracy, answers, replies, likes received, rounds joined); accuracy by month; approved countries and topics; certificates; latest answers.

### Ranks
| Rank | Rule |
|---|---|
| New | Fewer than 5 resolved forecasts |
| Active | 5 or more resolved forecasts |
| Trusted | 10 or more resolved, at least 70% right |
| Top expert | 15 or more resolved, at least 80% right |

## 6. Experts to approve
- Queue of applicants: label, requested countries and domains, applied date.
- Detail: privacy level, background, documents, Approve/Deny per country and per domain, optional note, "Send decision", "Approve all". Reminder that "Verified, then deleted" applicants' details are deleted after approval.

## 7. New risks and triggers
- Queue of expert suggestions not yet in ACAPS's list, marked New risk or New trigger, with country, number of experts who raised it, first raised date, and "No active risk there" where relevant.
- Detail: what experts wrote; closest existing risk (or the risk a trigger is for).
- Actions: Add as new risk, Add as trigger, Dismiss.

## 8. Upload a risk
- Form: risk statement, countries, area on the card, main topic, risk level, probability, triggers (add more), rationale, answering window (from/until), time frame for the likelihood question.
- Live preview of the card as experts will see it, plus the two questions they will answer.
- "Who receives it": experts matching country and topic, country only, topic only.
- Publish to experts / Save draft; list of items published from the page.
- Import from a Risk Radar export (.csv): find active risks, preview, publish all.

## Data
- Real: risk titles, countries, categories (`data/risk_category_overrides.csv`), ACAPS levels and probabilities.
- From the expert app (`frontend/src/data/mock.ts`): answers, replies, likes, panel sizes, round summaries.
- Synthetic: monthly history, expert IDs and track records, applicants, suggestions, link reasons, AI summaries and topics.
- Needed in a real backend: monthly snapshot per risk (agree/disagree counts, that round's likelihood question and answer counts), stable expert ID with track record, privacy level, applications, suggestions.

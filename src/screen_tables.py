"""
screen_tables.py - the tables that exist for the screens: what the moderator writes, replies under
answers, suggestions from the "Add your own card" form, and the demo expert's starting point.

Everything here is synthetic. These tables use fixed files or their own random generator, so no
value simulated in synthetic_data.py moves because of them.
"""
from datetime import timedelta

import pandas as pd

LEVEL_WORDS = {"very_unlikely": "very unlikely", "unlikely": "unlikely", "even_chance": "an even chance",
               "likely": "likely", "very_likely": "very likely"}
STEP_WORDS = list(LEVEL_WORDS.values())
REPLY_RATE = 0.3
MESSAGE_RATE = 0.4
REMOVED_RATE = 0.15

REPLY_TEXT = [
    "Good point. Do you have a source for this?",
    "I see this too in the areas I know.",
    "That matches what partners are telling me.",
    "I read this differently, but it's worth watching.",
    "Interesting. How recent is this?",
    "Agree, and it could move faster than the analysis expects.",
    "I'd want a second source before relying on this.",
    "This fits the pattern from last year.",
    "Thanks for sharing. It changes how I read the triggers.",
    "Not what I'm hearing, but conditions differ a lot by area.",
]
MESSAGE_TEXT = [
    "This chat is open until {date}. Short answers are welcome.",
    "Thank you for the answers so far. Sources help, if you have one.",
    "The chat closes on {date}. You can still add to your answer before then.",
    "We are reading everything here. Please flag anything the analysis is missing.",
]


def load_suggestions(path):
    """Cards experts sent to ACAPS. The moderator approves or rejects each one, then posts it."""
    table = pd.read_csv(path, encoding="utf-8", parse_dates=["created_at", "reviewed_at"])
    table["posted_risk_id"] = None
    return table


def add_demo_answers(expert_id, answers, later, frames, questions, windows, matches, level_p):
    """Gives the demo expert a starting point: some answered risks and some saved for later.

    An empty To-do and Community would hide most of the app. The demo risk stays unanswered, so its
    numbers do not move and the demo can open on it.
    """
    frames = dict(frames)
    match = matches[matches["expert_id"] == expert_id].set_index("risk_id")
    question_of = questions.set_index("risk_id")["question_id"]
    opens = windows.set_index("risk_id")["opens"]
    swipes, todos, stances, comments, forecasts = [], [], [], [], []

    def swipe(rid, when):
        n = len(frames["swipes"]) + len(swipes) + 1
        swipes.append({"swipe_id": f"S{n:05d}", "expert_id": expert_id, "risk_id": rid, "stance_on_card": None,
                       "direction": "right", "result": "todo", "swiped_at": when})

    for _, a in answers.iterrows():
        rid = a["risk_id"]
        saved, answered = opens[rid], opens[rid] + timedelta(days=1)
        kind = {"match_type": match.loc[rid, "match_type"], "match_weight": match.loc[rid, "match_weight"]}
        swipe(rid, saved)
        todos.append({"expert_id": expert_id, "risk_id": rid, "added_at": saved, "status": "done",
                      "completed_at": answered})
        stances.append({"stance_id": f"ST{len(frames['stances']) + len(stances) + 1:05d}", "expert_id": expert_id,
                        "risk_id": rid, "stance": a["stance"], "version": 1, "changed_opinion": False,
                        "previous_stance_id": None, "given_at": answered, "name_hidden_from_acaps": False, **kind})
        comments.append({"comment_id": f"C{len(frames['comments']) + len(comments) + 1:05d}", "risk_id": rid,
                         "expert_id": expert_id, "kind": "answer", "text": a["text"], "source_id": None,
                         "ai_draft_used": False, "reply_to": None, "posted_at": answered,
                         "name_hidden_from_acaps": False})
        forecasts.append({"forecast_id": f"F{len(frames['forecasts']) + len(forecasts) + 1:05d}",
                          "question_id": question_of[rid], "expert_id": expert_id,
                          "answer_level": a["answer_level"], "probability": level_p[a["answer_level"]],
                          "submitted_at": answered, "version": 1, "previous_forecast_id": None,
                          "name_hidden_from_acaps": False, **kind})
    for rid in later:
        swipe(rid, opens[rid])
        todos.append({"expert_id": expert_id, "risk_id": rid, "added_at": opens[rid], "status": "open",
                      "completed_at": None})

    added = {"swipes": swipes, "todos": todos, "stances": stances, "comments": comments, "forecasts": forecasts}
    return {k: pd.concat([frames[k], pd.DataFrame(rows)], ignore_index=True) for k, rows in added.items()}


def build_replies(comments, stances, demo_expert, demo_risk, today, rng, written_path):
    """Replies under answers: hand-written on the demo risk, stock sentences elsewhere."""
    answered = stances[stances["expert_id"] != demo_expert].groupby("risk_id")["expert_id"].unique()
    hidden = stances[stances["name_hidden_from_acaps"]]
    hidden = set(zip(hidden["expert_id"], hidden["risk_id"]))
    parents = comments.set_index("comment_id", drop=False)
    rows = []

    def add(parent, text):
        taken = {r["expert_id"] for r in rows if r["reply_to"] == parent["comment_id"]} | {parent["expert_id"]}
        others = [e for e in answered[parent["risk_id"]] if e not in taken]
        if not others:
            return
        eid = str(rng.choice(others))
        posted = min(today, parent["posted_at"] + timedelta(days=int(rng.integers(0, 3))))
        rows.append({"comment_id": f"C{len(comments) + len(rows) + 1:05d}", "risk_id": parent["risk_id"],
                     "expert_id": eid, "kind": "reply", "text": text, "source_id": None, "ai_draft_used": False,
                     "reply_to": parent["comment_id"], "posted_at": posted,
                     "name_hidden_from_acaps": (eid, parent["risk_id"]) in hidden})

    for _, reply in pd.read_csv(written_path, encoding="utf-8").iterrows():
        add(parents.loc[reply["reply_to"]], reply["text"])
    for _, parent in comments[comments["risk_id"] != demo_risk].iterrows():
        if rng.random() < REPLY_RATE and parent["expert_id"] != demo_expert:
            add(parent, str(rng.choice(REPLY_TEXT)))
    return pd.DataFrame(rows)


def build_moderator_messages(windows, demo_risk, today, rng):
    """What the moderator posted to a chat. The app shows the latest one in the chat list."""
    rows = []
    for _, w in windows.sort_values("risk_id").iterrows():
        if w["risk_id"] != demo_risk and rng.random() >= MESSAGE_RATE:
            continue
        closes = w["closes"]
        text = str(rng.choice(MESSAGE_TEXT)).format(date=f"{closes.day} {closes:%B}")
        rows.append({"message_id": f"MM{len(rows) + 1:03d}", "risk_id": w["risk_id"], "moderator_id": w["set_by"],
                     "text": text, "posted_at": min(today, w["opens"] + timedelta(days=int(rng.integers(1, 4))))})
    return pd.DataFrame(rows)


def build_chat_summaries(questions, forecasts, risks, moderator_id):
    """The moderator's wrap-up at the top of a closed chat. A real one would be written by hand."""
    latest = forecasts[forecasts["answer_level"].isin(LEVEL_WORDS)]
    latest = latest.sort_values("version", kind="stable").groupby(["expert_id", "question_id"]).tail(1)
    rated = risks.set_index("risk_id")["acaps_probability"]
    rows = []
    for _, q in questions[questions["is_backtest"]].iterrows():
        answers = latest[latest["question_id"] == q["question_id"]]["answer_level"]
        ended = "It happened." if q["outcome"] == 1 else "It did not happen."
        if answers.empty:
            text = f"No expert sent a forecast on this risk. {ended}"
        else:
            # the same average as "Panel forecast" on the closed chat, so the two always agree
            average = answers.map(lambda level: list(LEVEL_WORDS).index(level) + 1).mean()
            rating = rated[q["risk_id"]]
            acaps = f"ACAPS rated the probability {rating.lower()}. " if isinstance(rating, str) else ""
            text = (f"{len(answers)} experts sent a forecast. The panel forecast was "
                    f"{STEP_WORDS[int(average + 0.5) - 1]}. {acaps}{ended}")
        rows.append({"summary_id": f"CS{len(rows) + 1:03d}", "risk_id": q["risk_id"], "moderator_id": moderator_id,
                     "text": text, "written_at": q["closes"]})
    return pd.DataFrame(rows)


def mark_removed_todos(todos, demo_expert, rng):
    """Some experts trash a card from To-do. ACAPS only ever sees how many did."""
    removed = [status == "open" and eid != demo_expert and rng.random() < REMOVED_RATE
               for status, eid in zip(todos["status"], todos["expert_id"])]
    return todos.assign(status=todos["status"].where(~pd.Series(removed, index=todos.index), "removed"))

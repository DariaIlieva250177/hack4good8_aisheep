"""
app_bundle.py - what the expert app reads: every card and chat for the demo expert.
The file never names another expert: answers carry only the alias peers see.
"""
import re

import pandas as pd

from synthetic_data import ADJECTIVES, ANIMALS, LEVELS, _clean, group_answer

LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)\s\\]+)\\?\)")
SPREAD = {level: i for i, level in enumerate(LEVELS)}
VERDICT = {"agree": "yes", "disagree": "no"}


def _text(value):
    return value if isinstance(value, str) and value.strip() and value.strip().lower() != "nan" else None


def split_citations(text):
    """Moves inline citations out of ACAPS text, so the app can list them as sources instead."""
    sources = [{"label": label, "url": url} for label, url in LINK.findall(text)]
    clean = re.sub(r"\(\s*[,;\s]*\)", "", LINK.sub("", text))
    return re.sub(r"\s+([.,;:])", r"\1", clean).strip(), sources


def paragraphs(value):
    """An export text field as clean paragraphs, plus the sources cited in it."""
    if not _text(value):
        return [], []
    text, sources = split_citations(value.replace("\r\n", "\n"))
    return [p.strip() for p in text.split("\n") if p.strip()], sources


def _latest_update(value):
    lines = paragraphs(value)[0]
    if not lines:
        return None
    date = re.search(r"\d{2}/\d{2}/\d{4}", lines[0])
    if not date:
        return {"date": None, "text": lines}
    body = []
    for line in lines[1:]:
        if line.upper().startswith("UPDATE"):
            break
        body.append(line)
    return {"date": date.group(), "text": body}


def _source_links(row):
    links = [{"label": re.sub(r"^www\.", "", url.split("/")[2]), "url": url}
             for url in (_text(row.get("source")) or "").split() if url.startswith("http")]
    for column in ("current_vulnerability_coping_capacities_sources", "expected_impact_sources"):
        links += split_citations(_text(row.get(column)) or "")[1]
    return links


def analysis_for(row):
    """The ACAPS write-up for one risk, in the shape of the Answer screen."""
    rationale, cited = paragraphs(row.get("rationale"))
    vulnerability, more = paragraphs(row.get("current_vulnerability_coping_capacities"))
    impact, others = paragraphs(row.get("expected_impact"))
    needs = _text(row.get("priority_needs")) or ""
    sources = {s["url"]: s for s in [*_source_links(row), *cited, *more, *others]}
    return {"trend": _text(row.get("risk_trend")), "priority_needs": [n.strip() for n in needs.split(",") if n.strip()],
            "rationale": rationale, "update": _latest_update(row.get("rationale_update")),
            "vulnerability": vulnerability, "expected_impact": impact, "sources": list(sources.values())}


def _short_area(country):
    names = [c.strip() for c in country.split(",")]
    return names[0] if len(names) == 1 else f"{names[0]} and {len(names) - 1} more"


def cards_for(risk_ids, tables, export, full):
    """One card per risk. Only the risks in `full` carry the long ACAPS analysis, to keep the file small."""
    risks = tables["risks"].set_index("risk_id")
    written = export.set_index("risk_id")
    triggers = tables["triggers"].groupby("risk_id")
    cards = {}
    for rid in sorted(risk_ids):
        r = risks.loc[rid]
        listed = triggers.get_group(rid) if rid in triggers.groups else pd.DataFrame(columns=["trigger_id", "title", "description"])
        cards[rid] = {"risk_id": rid, "title": r["title"], "country": r["country"], "area": _short_area(r["country"]),
                      "category": r["category"], "image": str(r["category_image"]).replace("cat-", ""),
                      "level": r["risk_level"], "urgency": r["urgency"],
                      "probability": r["acaps_probability"], "impact": r["impact"],
                      "exposure": r["expected_exposure"], "status": r["status"],
                      "triggers": [{"id": t["trigger_id"], "title": t["title"], "description": t["description"]}
                                   for _, t in listed.iterrows()],
                      "analysis": analysis_for({**written.loc[rid].to_dict(), **r.to_dict()}) if rid in full else None}
    return cards


def _forecast_steps(tables):
    """Each expert's latest forecast as a 1 to 5 step, by question."""
    forecasts = tables["forecasts"]
    latest = forecasts[forecasts["answer_level"].isin(SPREAD)]
    latest = latest.sort_values("version", kind="stable").groupby(["expert_id", "question_id"]).tail(1)
    return latest.assign(step=latest["answer_level"].map(SPREAD).astype(int) + 1)


def chats_for(open_ids, closed, tables, demo_expert):
    """One chat per risk. Open chats carry the discussion, closed ones the result."""
    T = tables
    risks = T["risks"].set_index("risk_id")
    questions = T["forecast_questions"].set_index("risk_id")
    names = T["display_names"].set_index(["expert_id", "risk_id"])["display_name"]
    steps = _forecast_steps(T)
    likes = T["comment_likes"].groupby("comment_id").size()
    sources = T["sources"].set_index("source_id")["url"]
    reads = T["discussion_reads"]
    last_read = reads[reads["expert_id"] == demo_expert].set_index("risk_id")["last_read_at"]
    summaries = T["chat_summaries"].set_index("risk_id")["text"]
    messages = T["moderator_messages"].sort_values("posted_at").groupby("risk_id").tail(1).set_index("risk_id")
    replies = T["comments"][T["comments"]["kind"] == "reply"].groupby("reply_to")
    top_level = T["comments"][T["comments"]["kind"] != "reply"].sort_values("posted_at")
    labels = T["countries"]

    def spread(rid):
        counts = steps[steps["question_id"] == questions.loc[rid, "question_id"]]["step"].value_counts()
        return [int(counts.get(step, 0)) for step in range(1, 6)]

    def alias(eid, rid):
        return names.get((eid, rid), "Expert")

    def comment_rows(rid, verdicts, forecast_of):
        rows = []
        for _, c in top_level[(top_level["risk_id"] == rid) & (top_level["expert_id"] != demo_expert)].iterrows():
            under = replies.get_group(c["comment_id"]) if c["comment_id"] in replies.groups else None
            rows.append({"id": c["comment_id"], "name": alias(c["expert_id"], rid), "text": c["text"],
                         "verdict": VERDICT.get(verdicts.get(c["expert_id"])), "forecast": forecast_of.get(c["expert_id"]),
                         "likes": int(likes.get(c["comment_id"], 0)),
                         "source": sources.get(c["source_id"]) if pd.notna(c["source_id"]) else None,
                         "replies": [] if under is None else [{"id": r["comment_id"], "name": alias(r["expert_id"], rid),
                                                               "text": r["text"]} for _, r in under.iterrows()]})
        return rows

    chats = {}
    for rid in sorted(open_ids):
        stances = T["stances"][T["stances"]["risk_id"] == rid]
        latest = stances.sort_values("version").groupby("expert_id").tail(1)
        group = group_answer(latest)
        country = risks.loc[rid, "country"]
        group["country"] = country if country in set(labels["country"]) else None
        mine = steps[steps["question_id"] == questions.loc[rid, "question_id"]]
        rows = comment_rows(rid, latest.set_index("expert_id")["stance"].to_dict(),
                            mine.set_index("expert_id")["step"].to_dict())
        others = top_level[(top_level["risk_id"] == rid) & (top_level["expert_id"] != demo_expert)]
        unread = int((others["posted_at"] > last_read[rid]).sum()) if rid in last_read.index else len(others)
        last = None
        if rid in messages.index:
            last = {"author": "Moderator", "text": messages.loc[rid, "text"]}
        elif len(others):
            final = others.iloc[-1]
            last = {"author": alias(final["expert_id"], rid), "text": final["text"]}
        chats[rid] = {"name": risks.loc[rid, "community_name"], "members": group["answers"],
                      "closes": questions.loc[rid, "closes"], "resolves_on": questions.loc[rid, "resolves_on"],
                      "unread": unread, "group": group, "forecasts": spread(rid), "last_message": last,
                      "summary": None, "outcome": None, "comments": rows}
    for result in closed:
        rid = result["risk_id"]
        counts = spread(rid)
        chats[rid] = {"name": risks.loc[rid, "community_name"], "members": sum(counts),
                      "closes": questions.loc[rid, "closes"], "resolves_on": questions.loc[rid, "resolves_on"],
                      "unread": 0, "group": None, "forecasts": counts, "last_message": None,
                      "summary": summaries.get(rid),
                      "outcome": {"happened": result["outcome"] == "Happened", "what_happened": result["what_happened"],
                                  "you_said": result["you_said"], "points": result["points"],
                                  "bonus_points": result["bonus_points"], "correct_call": result["correct_call"]},
                      "comments": []}
    return chats


def my_answers(tables, demo_expert, results):
    """The demo expert's own answers: the open risks they answered and their past forecasts."""
    T = tables
    steps = _forecast_steps(T)
    questions = T["forecast_questions"].set_index("question_id")["risk_id"]
    mine = steps[steps["expert_id"] == demo_expert]
    step_of = dict(zip(mine["question_id"].map(questions), mine["step"]))
    comments = T["comments"]
    written = comments[comments["expert_id"] == demo_expert].set_index("risk_id")["text"]
    stances = T["stances"][T["stances"]["expert_id"] == demo_expert]
    rows = [{"risk_id": s["risk_id"], "verdict": VERDICT[s["stance"]], "forecast": int(step_of[s["risk_id"]]),
             "text": written.get(s["risk_id"], "")} for _, s in stances.iterrows()]
    rows += [{"risk_id": r["risk_id"], "verdict": None, "forecast": int(step_of[r["risk_id"]]),
              "text": (r["comment"] or {}).get("text", "")} for r in results]
    return rows


def names_for(expert, risk_ids, tables):
    """The demo expert's display name on every risk in the app. Where they took part, it is their name in
    the data. Elsewhere it is the next free name in a fixed order, never used by another expert on that
    risk or by them on another risk, so their discussions cannot be linked through a name."""
    dn = tables["display_names"]
    have = dn[dn["expert_id"] == expert].set_index("risk_id")["display_name"].to_dict()
    taken_on = dn.groupby("risk_id")["display_name"].agg(set).to_dict()
    pool = [f"{a} {b}" for a in ADJECTIVES for b in ANIMALS]
    used = set(have.values())
    names = {}
    for i, rid in enumerate(sorted(risk_ids)):
        if rid in have:
            names[rid] = have[rid]
            continue
        blocked = used | taken_on.get(rid, set())
        start = (i * 37) % len(pool)
        names[rid] = next(n for n in pool[start:] + pool[:start] if n not in blocked)
        used.add(names[rid])
    return names


def add_screens(bundle, tables, export):
    """Adds what the connected screens read to the expert's file."""
    demo_expert = bundle["expert"]["expert_id"]
    answers = my_answers(tables, demo_expert, bundle["results"])
    todo = tables["todo_items"]
    later = todo[(todo["expert_id"] == demo_expert) & (todo["status"] == "open")]["risk_id"].tolist()
    open_ids = set(tables["risks"].query("status == 'Active'")["risk_id"])
    all_ids = open_ids | {r["risk_id"] for r in bundle["results"]}
    countries = tables["expert_countries"]
    approved = countries[(countries["expert_id"] == demo_expert) & (countries["status"] == "approved")]["country"]
    bundle["expert"]["panel"] = approved.iloc[0]
    bundle["expert"]["chats_joined"] = len(answers)
    bundle["todo"] = later
    bundle["my_answers"] = answers
    bundle["cards"] = cards_for(all_ids, tables, export, open_ids)
    bundle["expert"]["names"] = names_for(demo_expert, bundle["cards"], tables)
    bundle["chats"] = chats_for(open_ids, bundle["results"], tables, demo_expert)
    return bundle

# Moderator dashboard: what the research says

How to make the desktop moderator app easy to read, good to look at and pleasant to use every day. Researched on 7 November 2026 for the team building it.

Each section gives the finding, then what it means for us. "Our reading" marks our own inference, not something a source says.

## The short version

1. **Answer one question first.** The home screen says what changed and what needs the moderator, in a sentence, at the top left.
2. **Overview, then country, then risk.** Each level has less breadth and more detail.
3. **Every number gets a comparison.** A number alone says nothing.
4. **Flag little, and say why.** Each flag gives its reason and an action, and can be dismissed.
5. **Let the queue end.** The moderator should be able to finish and see "all caught up".
6. **Make the insight hold evidence against it, not only for it.**
7. **Show that the work mattered.** Link each insight to its report and to the experts who helped.
8. **Let the data be the decoration.** Use few colours, no gauges and no pie charts.

## 1. What a dashboard is for

- NN/g defines dashboards as a "single-page view that imparts at-a-glance information on which users can act quickly". Analytical ones "help users identify the need for further thought, investigation, research, or analysis". Their goal is "not to facilitate exploration". ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/))
- Stephen Few says the single screen "need not be comprehensive in and of itself, but it must provide the overview that is needed". ([Few](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf))
- The UK Government Analysis Function warns that dashboards "put the burden of understanding data and important messages onto the users" and "can overwhelm users". It suggests asking "What decisions will users make based on the dashboard?" and "Will users have the time to get insight out of dashboards?" ([Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-building-and-managing-dashboards/))
- The same guidance says a report "could give the ability for analysts to provide commentary, which could be more useful if the subject area is sensitive or changeable". That matches ACAPS writing a report from what the moderator reads.

**For us:** the app points to what deserves thought, and the insight and report hold the thinking. We have not yet asked an ACAPS analyst what decisions they would make from this screen, so that is the first thing to test.

## 2. Layout

- Shneiderman's rule is "overview first, zoom and filter, then details on demand". ([Shneiderman 1996](https://drum.lib.umd.edu/items/155a868e-fb83-4115-9899-9187ea8c0498/full))
- The Analysis Function says to use "an inverted pyramid structure, with your most important headline content up front and detailed information in other tabs", so users reach data "in as few steps as possible". It also says to avoid internal and horizontal scrolling. ([Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility/))
- Few calls the top left the most prominent position and criticises spending it on a logo and navigation. "Data that should be compared ought to be arranged and visually designed to encourage comparisons."
- A review of 144 dashboards names the matching patterns: hierarchical structure for drilling down, stratified layout for top-down order, and table layout to "retrieve and relate specific information". ([Bach et al.](https://dashboarddesignpatterns.github.io/patterns.html))
- In an eye-tracking study, people spent the most time on text, above all the title. ([Borkin et al.](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall))

**For us:**
- **Overview:** one screen on a laptop, with no scrolling inside panels. The top left holds a sentence such as "3 things need you. Sudan worsened most."
- **Country page:** a table, because the job is comparing risks.
- **Titles state the finding:** "Sudan's routes and power supply under pressure", not "Sudan summary".

## 3. Visual design

- **Position and length show amounts best.** NN/g recommends bars, lines and scatter plots. Pie and donut charts "should be avoided most of the time", and gauges "consume a lot of precious space".
- **Colour only reinforces.** It should "only be used to reinforce information that is already communicated in a different way". NN/g cites about 4.5% of people with some colour blindness.
- **Numbers need context.** Few asks "Compared to what? Is this good or bad?"
- **One thing stands out.** "When everything is visually prominent, nothing stands out."
- **Beauty comes from the data.** Few wants to "attractively display the data itself without adding anything whatsoever". Bach et al. leave out decoration altogether.
- **Looks do matter, within limits.** People rate attractive products as more usable, but a pretty design excuses minor problems, "not" large ones. Attractive screens can also hide problems in testing, so watch what people do, not only what they say. ([NN/g](https://www.nngroup.com/articles/aesthetic-usability-effect/))
- **Show what the data is.** Last update, next update, source and disclaimers belong on the page. ([Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility/), [Bach et al.](https://dashboarddesignpatterns.github.io/patterns.html))
- **Accessibility is a requirement for UK government dashboards.** WCAG 2.2 A and AA, full keyboard use, visible focus, and the data available in another form because "No chart is fully accessible". We should meet the same bar.

**For us:**
- **Charts:** put ACAPS and the panel as dots on one line per risk. That shows the gap at a glance and works without colour.
- **Colour:** urgency keeps its existing colours and always has a word beside it.
- **Our reading:** keep Diana's look on the app frame, but use flat, plain surfaces where the data sits, because glass effects compete with numbers.

## 4. Flagging what needs attention

- Google's SRE book says "Every page should be actionable". It adds: "I can only react with a sense of urgency a few times a day before I become fatigued." ([Google SRE](https://sre.google/sre-book/monitoring-distributed-systems/))
- It prefers "a dashboard that monitors all ongoing subcritical problems" over alert emails, and avoids any setup that requires someone to "stare at a screen to watch for problems".
- It warns against alerting because "something seems a bit weird", and avoids "magic" systems in favour of simple, predictable rules.
- A study of 21 practitioners in seven security teams found that checking alarms "can cause alarm burnout and eventually desensitization". It lists five properties alarms need: Reliable, Explainable, Analytical, Contextual and Transferable. Analysts' feedback should improve future alarms. ([Alahmadi et al.](https://www.usenix.org/system/files/sec22-alahmadi.pdf))
- Automation bias appears in novices and experts alike, and training does not reliably prevent it. ([Parasuraman and Manzey](https://pubmed.ncbi.nlm.nih.gov/21077562/))

**For us:**
- **Worth a look:** keep the list short, about five items at most (our reading). Each item says why it is there, what to do, and can be dismissed.
- **Simple rules:** no scores nobody can explain. For example, "7 experts changed their mind this week".
- **Learning from dismissals:** dismissing an item can record a reason, which shows us which rules are noise.
- **Suggested links:** these stay visibly suggestions and show the shared words, so the moderator judges them and does not just accept them.

## 5. Turning evidence into an insight

- Pirolli and Card describe two loops: finding and filtering information, then building a mental model that fits it. Evidence moves from a "shoebox" to an evidence file, then to a schema, hypotheses and a presentation. ([summary slides](https://www3.cs.stonybrook.edu/~mueller/teaching/cse591_visAnalytics/sensemaking.pdf))
- They point to several ways tools help: cutting the cost of scanning and follow-up searches, acting as external memory, and directing attention to "distinguishing evidence" and "non-conforming relations", which works against confirmation bias.
- US intelligence standards ask products to separate evidence from assumptions, state confidence and its basis, note "significant contrary reporting", and name indicators that would change the judgement. ([ICD 203](https://irp.fas.org/dni/icd/icd-203.pdf))
- Research on large displays found that analysts think by arranging evidence in space. ([Andrews et al.](https://www.pnnl.gov/publications/space-think-large-high-resolution-displays-sensemaking)) That is a later idea, not for the first version.

**For us:** the insight page follows the same order.

| Part | Holds |
|---|---|
| Judgement | One sentence, used as the title |
| Why it matters | A few lines from the moderator |
| Linked risks | Each risk's numbers, shown separately |
| Evidence | Saved expert answers and ACAPS text |
| **What doesn't fit** | Answers and risks that go against the judgement |
| What would change it | Triggers to watch |
| Confidence | Low, medium or high, with one line on why |

Saving should take one click from any answer, so reading a risk fills the evidence file as the moderator goes.

## 6. Positive for the people using it

- A study of 238 people and about 12,000 daily diaries found that making progress on meaningful work matters most. Setbacks hit "two to three times stronger" than progress helps. "Small wins" work when the job is "chunked down to manageable pieces". Clear goals, autonomy and low-to-moderate time pressure all help. ([Amabile and Kramer](https://www.library.hbs.edu/working-knowledge/how-small-wins-unleash-creativity))
- Linear's triage inbox shows a queue that can end: each item is accepted, declined or marked duplicate, and snoozing hides it until later. Each action has a keyboard shortcut. ([Linear](https://linear.app/docs/triage))
- Calm technology asks for "the smallest possible amount of attention". ([Calm Tech Institute](https://calmtech.institute/calm-tech-principles))
- Nielsen's heuristics ask for visible status, undo, memory support and shortcuts for experts. ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/))
- A study of 209 survey responses and 38 interviews across news, human rights and humanitarian staff found that "staff really need to feel that there is a point and purpose" to viewing distressing material. It reports that repeated exposure has more impact, and that people should be warned before seeing distressing content. Regular breaks, debriefs and peer support were rated among the most useful help. ([Dubberley et al.](https://firstdraftnews.org/wp-content/uploads/2018/03/trauma_report.pdf))

That study covers graphic images and video. Ground Truth is text, so it applies only partly.

**For us (our reading):**
- **An end state:** "All caught up", with what was done today, instead of an endless feed.
- **Calm wording:** no red "overdue" counters or "you are behind" messages, because setbacks weigh more than progress.
- **Purpose in view:** each insight shows how many experts contributed and which report it fed.
- **Undo:** approve, reject and close can be undone for a short time.
- **Keyboard shortcuts:** for the review queue.
- **Less raw reading:** summaries come first, and answers open on request. That helps with speed and with repeated exposure.
- **No points or streaks for analysts:** the study found "Tangible incentives" barely registered in the diaries, and nothing above supports gamifying this work.

## 7. Naming experts in public reports

- ACAPS's brief says "individual contributions are always anonymous to the public" and asks how to "guarantee that nothing is attributed publicly". ([brief](challenge-brief.md), [criteria](evaluation-criteria.md)) This is a Must.
- OCHA warns that combining details such as location can re-identify people even without names, and that acceptable risk "will typically be lower" in a conflict environment. ([OCHA](https://centre.humdata.org/wp-content/uploads/2019/07/guidance_note_sdc.pdf))

**For us:** report notes carry no expert names.

- **Recognition stays outside the report:** if ACAPS wants to recognise an expert, it can hand them a certificate, and the expert decides whether to share it.
- **Small groups still need care:** a line such as "only 1 Chad expert disagreed" can point to a person even with no name attached.

## 8. What an ACAPS analyst needs to see

The analyst already has the Risk Radar, so the app should not repeat it. Its job is to show what the expert input changes in the radar. Added on 7 November 2026, after reading the documents below in full.

### What the analyst has to do

- A risk profile "typically includes a rationale, triggers, risk level and scores, timeframe, projected humanitarian impacts, pre-existing vulnerabilities and coping capacities, and updates added every month". ([ACAPS overview](../references/acaps-risk-methodology.pdf))
- "assumptions and information gaps should be explicit", and "individual indicators are signals for further review, not proof of deterioration on their own". ([ACAPS overview](../references/acaps-risk-methodology.pdf))
- Risk analysis "should be repeated at regular intervals and the change in risk recorded over time", and reviews should "analyse why previously identified risks did or did not materialise". ([ACAPS 2019 brief, p5](https://www.acaps.org/fileadmin/Dataset/Methodology_files/acaps_technical_brief_introduction_to_risk_analysis_methodology_may_2019.pdf))
- A probability "as low as 30%" may be a concern, so sorting by probability alone would hide risks that matter. ([ACAPS 2019 brief, p5](https://www.acaps.org/fileadmin/Dataset/Methodology_files/acaps_technical_brief_introduction_to_risk_analysis_methodology_may_2019.pdf))
- ACAPS writes "we do not use the terms 'unlikely' and 'likely'", partly so a low or moderate risk is not ignored. ([ACAPS 2019 brief, p11](https://www.acaps.org/fileadmin/Dataset/Methodology_files/acaps_technical_brief_introduction_to_risk_analysis_methodology_may_2019.pdf))
- A situation that "deteriorates at the same pace is considered a trend and not a risk". ACAPS also publishes "developments to watch": changes that "might become risks in the future". ([Global Risk Analysis, Oct 2023, p2](https://www.acaps.org/fileadmin/Data_Product/Main_media/20231018_ACAPS_Global_Risk_Analysis.pdf))
- Seasonal hazards count only with evidence that the season "will be worse than in a normal year", or when response capacity or coping is weak. ([ACAPS 2019 brief, p12](https://www.acaps.org/fileadmin/Dataset/Methodology_files/acaps_technical_brief_introduction_to_risk_analysis_methodology_may_2019.pdf))

### How ACAPS says to treat expert input

From [ACAPS's own 2017 study of expert judgement](https://alnap.org/help-library/resources/expert-judgment-the-use-of-expert-judgment-in-humanitarian-analysis-theory-methods-and/), printed page numbers:

- **What each expert saw:** "the observation bases of the individual experts need to be established and recorded", because this "is critical in the aggregation phase" (p5).
- **Counting is not a summary:** propositions can be counted, "but such frequencies do not constitute a summary" (p6). "Mathematical aggregation masks rationales for particular opinions and the reasons for disagreements" (p47).
- **Dissent is useful:** "analysts should record opposing positions and their rationales, instead of papering over them with rash consensus findings" (p11).
- **Warning signs:** group bias can show when "none of the experts voices a different opinion". Disagreement may come from "ambiguous questions" or from experts working with different data (p54 to p55).
- **Weighting:** the humanitarian setting "makes it near-impossible to 'calibrate'" experts and "weight their opinions arithmetically" (p11), and the study "generally refrain[s]" from it (p82). A lower weight should never come "simply because the estimate is an outlier", only because "the supporting evidence for the estimate is weaker" (p85).

**The client's view wins here:** ACAPS told the team it wants grouped comments, links between risks, and more weight for experts who know both the country and the field, plus their rank. So fit to the risk sets the reading order and rank is shown beside the person. Lower-weight points go lower but are never hidden.

Rowe and Wright reach a similar view from forecasting research. [Their paper](https://www.gwern.net/doc/statistics/prediction/2001-rowe.pdf) recommends the panel's "mean or median estimate" plus "the rationales from all panelists" (p129) and weighting estimates equally (p131). It warns that it "would be a mistake to conduct additional rounds in the hope of forcing consensus" (p131). Later evidence on reasons feedback is mixed: Bolger et al. (2011, search extract only) found reasons changed final forecasts little.

[ICD 203](https://www.dni.gov/files/documents/ICD/ICD-203.pdf), the US intelligence analysis standard, adds two habits: separate underlying information from "assumptions or judgments" (p5), and make clear "how new information or different reasoning led to the judgments" (p6).

### What the real radar shows

Computed from the 28 open risks in the export:

- **Triggers lag the written updates.** On 22 of the 24 open risks with both, the newest written update is newer than the newest trigger update, by a median of 76 days. R1043 has an update from 30 September, while its triggers were last updated on 8 June.
- **Trigger rates are thin.** 25 of 76 open triggers have no completion rate, and only 8 have more than one rate on record.
- **Outcomes have detail.** Of 61 materialised risks, 43 are recorded as hazard and impact, 10 as hazard only, 2 as impact only and 6 are blank.

Our reading: triggers are where expert input can help most, because ACAPS defines them as the observable signal and they are the part of the radar that moves slowest. The date field may partly reflect record keeping, so ACAPS should confirm this.

### Tables that follow from this

| Table | Decision it supports | Status of the data |
|---|---|---|
| Country grid: risks against probability, impact, triggers, missing | Where do I look first? | Needs each answer linked to a radar field |
| Radar against experts, field by field, for one risk | Do I change this rating or text? | Radar side exists, expert side needs the same link |
| Triggers: rate, last updated, what experts report since | Has a trigger moved? | Radar side exists, needs each answer linked to a trigger |
| Positions: claim, what the expert saw, where, when, source | How far do I trust this? | Text and source exist, the observation base is only partly there |
| Panel coverage: who answered, who is close to it, who is silent | Whose view is missing? | Exists in `stances`, `expert_countries`, `expert_domains` |
| Suggestions: hazard, trigger, trend or already on the radar | Add it, watch it or decline it? | Statements exist, the sorting does not |
| Track record: rating, outcome, hazard or impact, why | What did we learn? | Exists in the export, the "why" is free text |

Our reading: the link from an answer to a radar field is the one missing piece behind three tables. It can start as an AI draft that a person confirms.

## 9. Limits of this research

- **Not read:** Steiger et al. on content moderators (blocked), and the original Pirolli and Card paper (unreachable, so the slides above are a secondary source).
- **Read only through search extracts:** Shneiderman, Borkin et al., Parasuraman and Manzey, Andrews et al., Bolger et al.
- **Radar screen not seen:** we have the export, not the radar itself, so section 8 is inferred from documents. The ACAPS 2019 brief is also older than the current overview.
- **Other fields:** most findings come from software, security, government statistics and journalism. We found no study of humanitarian analysts using dashboards.
- **Not tested:** none of this has been tried with ACAPS analysts. A short think-aloud session, which the Analysis Function recommends, would tell us more than further reading.

/*
 * Mock data. Risk fields are copied from data/risk-radar-export.csv (ACAPS Risk Radar).
 * `family`, `image` and `area` are our own tags. Everything else here (experts, answers,
 * counts, rankings, notifications) is synthetic and describes no real person.
 */
import type { Answer, AnswerComment, AppNotification, Community, Ranking, Risk, User } from './types';
import { ANNUAL_AWARDS_AT, ROUND_ENDS_AT } from '../config';
import { TRIGGERS } from './triggers';
import { ANALYSIS } from './analysis';

const DETERIORATION = 'Marked deterioration in an existing crisis';

const RISK_ROWS: Risk[] = [
  {
    id: 'R1043',
    title:
      'Escalating cross-border insecurity linked to the Sudan conflict increases protection risks and humanitarian needs in eastern Chad',
    country: 'Chad',
    type: DETERIORATION,
    level: 'High',
    probability: 'High',
    impact: 4,
    exposure: '>500,000',
    status: 'Active',
    family: 'conflict',
    image: 'border',
    area: 'Eastern Chad',
    answered: 5,
    panelSize: 7,
  },
  {
    id: 'R1066',
    title:
      'Escalating insecurity across the Lake Chad Basin increases displacement, protection risks, and humanitarian access constraints',
    country: 'Chad, Niger, Cameroon, Nigeria',
    type: DETERIORATION,
    level: 'High',
    probability: 'Very High',
    impact: 4,
    exposure: '100,000-250,000',
    status: 'Active',
    family: 'conflict',
    image: 'conflict',
    area: 'Lake Chad Basin',
    answered: 4,
    panelSize: 9,
  },
  {
    id: 'R1055',
    title: 'Mass returns from eastern Chad exacerbate humanitarian needs in West Darfur State',
    country: 'Sudan',
    type: DETERIORATION,
    level: 'Medium',
    probability: 'Medium',
    impact: 3,
    exposure: '100,000-250,000',
    status: 'Active',
    family: 'conflict',
    image: 'displacement',
    area: 'West Darfur',
    answered: 3,
    panelSize: 6,
  },
  {
    id: 'R1051',
    title: 'Interregional trade restrictions disrupt markets and deepen food insecurity in West Kordofan',
    country: 'Sudan',
    type: DETERIORATION,
    level: 'Medium',
    probability: 'Medium',
    impact: 5,
    exposure: '250,000-500,000',
    status: 'Active',
    family: 'economic',
    image: 'economic',
    area: 'West Kordofan',
    answered: 3,
    panelSize: 6,
  },
  {
    id: 'R1054',
    title:
      'RSF drone attacks damage the Merowe Dam and power grid in Northern state, disrupting health, food security, and public services',
    country: 'Sudan',
    type: DETERIORATION,
    level: 'Medium',
    probability: 'Low',
    impact: 5,
    exposure: '250,000-500,000',
    status: 'Active',
    family: 'technological',
    image: 'infrastructure',
    area: 'Northern State',
    answered: 2,
    panelSize: 6,
  },
  {
    id: 'R1045',
    title: 'Forecast below-average Kiremt rains in Ethiopia threaten food production and livelihoods',
    country: 'Ethiopia',
    type: 'New emerging risk',
    level: 'High',
    probability: 'High',
    impact: 4,
    exposure: '>500,000',
    status: 'Active',
    family: 'hydromet',
    image: 'drought',
    area: 'Ethiopia',
    answered: 4,
    panelSize: 8,
  },
  // Not in the card stack or To-do at start: they only appear on the Community
  // page (R1048 and R1049 already answered, R1042 and R1044 never shown).
  {
    id: 'R1048',
    title: 'RSF expansion in Blue Nile state triggers displacement and protection risks',
    country: 'Sudan',
    type: DETERIORATION,
    level: 'High',
    probability: 'High',
    impact: 4,
    exposure: '20,000-100,000',
    status: 'Active',
    family: 'conflict',
    image: 'displacement',
    area: 'Blue Nile',
    answered: 4,
    panelSize: 7,
  },
  {
    id: 'R1049',
    title:
      'RSF restoration of siege on Al Obeid, North Kordofan drives widescale displacement towards White Nile state',
    country: 'Sudan',
    type: DETERIORATION,
    level: 'Medium',
    probability: 'Medium',
    impact: 5,
    exposure: '100,000-250,000',
    status: 'Active',
    family: 'conflict',
    image: 'conflict',
    area: 'North Kordofan',
    answered: 3,
    panelSize: 6,
  },
  {
    id: 'R1042',
    title:
      'Continued coordinated JNIM–FLA attacks and blockades increase protection risks, displacement, and humanitarian access constraints in Mali',
    country: 'Mali',
    type: DETERIORATION,
    level: 'High',
    probability: 'High',
    impact: 4,
    exposure: '>500,000',
    status: 'Active',
    family: 'conflict',
    image: 'conflict',
    area: 'Mali',
    answered: 5,
    panelSize: 8,
  },
  {
    id: 'R1044',
    title: 'Forecast El Niño conditions threaten crop production and worsen food insecurity in Kenya',
    country: 'Kenya',
    type: 'New emerging risk',
    level: 'High',
    probability: 'High',
    impact: 2,
    exposure: '>500,000',
    status: 'Active',
    family: 'hydromet',
    image: 'drought',
    area: 'Kenya',
    answered: 3,
    panelSize: 7,
  },
  // Communities that have already ended (Expired): two you answered, one you didn't.
  {
    id: 'R1037',
    title:
      "Escalating violence between the Sudan People's Liberation Movement and the Sudan People's Liberation Movement-in-Opposition reignites civil war, driving mass displacement and service collapse",
    country: 'South Sudan',
    type: DETERIORATION,
    level: 'High',
    probability: 'High',
    impact: 4,
    exposure: '>500,000',
    status: 'Active',
    family: 'conflict',
    image: 'conflict',
    area: 'South Sudan',
    answered: 6,
    panelSize: 7,
  },
  {
    id: 'R1053',
    title:
      'Long-range RSF drones targeting the eastern supply corridor and Port Sudan disrupt trade and aid delivery in Red Sea state',
    country: 'Sudan',
    type: DETERIORATION,
    level: 'Medium',
    probability: 'Medium',
    impact: 3,
    exposure: '250,000-500,000',
    status: 'Active',
    family: 'technological',
    image: 'infrastructure',
    area: 'Red Sea State',
    answered: 5,
    panelSize: 6,
  },
  {
    id: 'R1046',
    title:
      'El Niño drives drought conditions, increasing food insecurity and heightening humanitarian needs in Madagascar in 2027',
    country: 'Madagascar',
    type: 'New emerging risk',
    level: 'Medium',
    probability: 'Medium',
    impact: 4,
    exposure: '>500,000',
    status: 'Active',
    family: 'hydromet',
    image: 'drought',
    area: 'Madagascar',
    answered: 4,
    panelSize: 6,
  },
];

export const RISKS: Risk[] = RISK_ROWS.map((r) => ({
  ...r,
  triggers: TRIGGERS[r.id] ?? [],
  analysis: ANALYSIS[r.id],
}));

export const ME: User = {
  id: 'u-kestrel',
  pseudonym: 'Kestrel',
  name: 'Sam Demo',
  panel: 'Chad',
  identity: 'pseudonym',
};

/** Order of the card stack (front first) and the To-do list at start. */
export const INITIAL_STACK = ['R1043', 'R1066', 'R1055', 'R1051'];
export const INITIAL_TODO = ['R1045', 'R1054'];

type Seed = Omit<Answer, 'id' | 'riskId'>;

const ANSWERS: Record<string, Seed[]> = {
  R1043: [
    {
      authorId: 'u-heron',
      displayName: 'Heron',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Matches partner reports from the border: new arrivals every week and more incidents on the roads.',
      sources: [],
      isNew: true,
    },
    {
      authorId: 'u-nadia',
      displayName: 'Nadia',
      identity: 'name',
      verdict: 'yes',
      text: 'Right for Ouaddaï, less so further south. Sila has been quieter since the rains.',
      sources: [],
    },
    {
      authorId: 'u-a1',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'yes',
      text: 'Armed groups cross more often. Protection needs are rising faster than the response.',
      sources: [],
      isNew: true,
    },
    {
      authorId: 'u-ibis',
      displayName: 'Ibis',
      identity: 'pseudonym',
      verdict: 'no',
      text: 'The picture is right, but the exposure looks high for the next three months.',
      sources: [],
    },
    {
      authorId: 'u-marabou',
      displayName: 'Marabou',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Sites near the border are over capacity. I would raise the impact.',
      sources: [],
    },
  ],
  R1066: [
    {
      authorId: 'u-weaver',
      displayName: 'Weaver',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Attacks on the islands have picked up again. Access by boat is now very limited.',
      sources: [],
      isNew: true,
    },
    {
      authorId: 'u-a2',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'yes',
      text: 'Displacement towards the towns is visible. Host communities are stretched.',
      sources: [],
    },
    {
      authorId: 'u-tomas',
      displayName: 'Tomas',
      identity: 'name',
      verdict: 'yes',
      text: 'True for the Nigerian side. On the Cameroon side it feels stable for now.',
      sources: [],
    },
    {
      authorId: 'u-heron',
      displayName: 'Heron',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Agree. Road escorts are back on two main routes.',
      sources: [],
    },
  ],
  R1055: [
    {
      authorId: 'u-sunbird',
      displayName: 'Sunbird',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Returns are real, but many people move back and forth across the border.',
      sources: [],
    },
    {
      authorId: 'u-a3',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'no',
      text: 'Needs are high, but “mass” may overstate it outside El Geneina.',
      sources: [],
    },
    {
      authorId: 'u-ibis',
      displayName: 'Ibis',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Water and shelter are the first gaps people mention.',
      sources: [],
    },
  ],
  R1051: [
    {
      authorId: 'u-plover',
      displayName: 'Plover',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Prices of staples in local markets have roughly doubled since the routes closed.',
      sources: [],
    },
    {
      authorId: 'u-a4',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'yes',
      text: 'Some informal trade still gets through, so the gap is uneven.',
      sources: [],
    },
    {
      authorId: 'u-nadia',
      displayName: 'Nadia',
      identity: 'name',
      verdict: 'yes',
      text: 'Traders report fewer trucks and higher fees at checkpoints.',
      sources: [],
    },
  ],
  R1054: [
    {
      authorId: 'u-bustard',
      displayName: 'Bustard',
      identity: 'pseudonym',
      verdict: 'no',
      text: 'Repairs were faster than expected last time. Hospitals run on generators meanwhile.',
      sources: [],
    },
    {
      authorId: 'u-a5',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'no',
      text: 'I don’t see signs of new attacks on the dam itself.',
      sources: [],
    },
  ],
  // Kestrel (you) already answered these two, so they sit in Your communities.
  R1048: [
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 4,
      text: 'Partners in Ed Damazin report new arrivals from the south of the state every week.',
      sources: [],
    },
    {
      authorId: 'u-heron',
      displayName: 'Heron',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Roads to Kurmuk are cut. Aid convoys have stopped for now.',
      sources: [],
      isNew: true,
    },
    {
      authorId: 'u-a7',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'no',
      text: 'Fighting has stalled since the rains. I would lower the probability.',
      sources: [],
    },
  ],
  R1049: [
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      verdict: 'no',
      forecast: 2,
      text: 'Supply routes into Al Obeid are still open from the east. A full siege looks unlikely before the harvest.',
      sources: [],
    },
    {
      authorId: 'u-sunbird',
      displayName: 'Sunbird',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Families are already leaving towards Kosti.',
      sources: [],
    },
  ],
  R1042: [
    {
      authorId: 'u-a8',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'yes',
      text: 'Fuel blockades around Bamako are back. Prices doubled in a week.',
      sources: [],
    },
    {
      authorId: 'u-tomas',
      displayName: 'Tomas',
      identity: 'name',
      verdict: 'yes',
      text: 'Access to Ménaka and Gao by road is very limited.',
      sources: [],
    },
  ],
  R1044: [
    {
      authorId: 'u-hornbill',
      displayName: 'Hornbill',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'The forecast is right for the east, but the highlands may get average rains.',
      sources: [],
    },
    {
      authorId: 'u-weaver',
      displayName: 'Weaver',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Marsabit and Turkana already report poor pasture. Livestock prices are dropping.',
      sources: [],
    },
  ],
  // Ended chats: full correspondence for the summary and final results.
  R1037: [
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 4,
      text: 'Clashes in Upper Nile have spread to Jonglei. Partners have pulled staff out of two counties.',
      sources: [],
    },
    {
      authorId: 'u-heron',
      displayName: 'Heron',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 5,
      text: 'Renk is receiving new arrivals daily. Health facilities in Nasir have closed.',
      sources: [],
    },
    {
      authorId: 'u-nadia',
      displayName: 'Nadia',
      identity: 'name',
      verdict: 'yes',
      forecast: 4,
      text: 'The ceasefire talks stalled again. Both sides are recruiting.',
      sources: [],
    },
    {
      authorId: 'u-a9',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'no',
      forecast: 3,
      text: 'Full civil war is not certain, but localised fighting will keep growing.',
      sources: [],
    },
    {
      authorId: 'u-marabou',
      displayName: 'Marabou',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 4,
      text: 'River transport on the Nile is disrupted, so food prices in Malakal are rising.',
      sources: [],
    },
  ],
  R1053: [
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 3,
      text: 'Port Sudan is still working, but insurance costs for ships have gone up a lot.',
      sources: [],
    },
    {
      authorId: 'u-bustard',
      displayName: 'Bustard',
      identity: 'pseudonym',
      verdict: 'no',
      forecast: 2,
      text: 'No strike on the port since May. Air defences seem to be holding.',
      sources: [],
    },
    {
      authorId: 'u-ibis',
      displayName: 'Ibis',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 3,
      text: 'Aid flights were diverted twice last month. Delays, not a full stop.',
      sources: [],
    },
    {
      authorId: 'u-a10',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'no',
      forecast: 2,
      text: 'Trade volumes are back to normal in the last two weeks.',
      sources: [],
    },
  ],
  R1046: [
    {
      authorId: 'u-hornbill',
      displayName: 'Hornbill',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 4,
      text: 'The south was already dry this year. Another poor season would hit the Grand Sud hard.',
      sources: [],
    },
    {
      authorId: 'u-weaver',
      displayName: 'Weaver',
      identity: 'pseudonym',
      verdict: 'yes',
      forecast: 4,
      text: 'Seed stocks are low in Androy and Anosy.',
      sources: [],
    },
    {
      authorId: 'u-a11',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'no',
      forecast: 3,
      text: 'Too early to be sure: El Niño effects on Madagascar vary a lot.',
      sources: [],
    },
  ],
  R1045: [
    {
      authorId: 'u-hornbill',
      displayName: 'Hornbill',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'Planting is already late in parts of Amhara and Tigray.',
      sources: [],
    },
    {
      authorId: 'u-a6',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      verdict: 'yes',
      text: 'Seasonal outlooks agree on below-average rains in the north.',
      sources: [],
    },
    {
      authorId: 'u-weaver',
      displayName: 'Weaver',
      identity: 'pseudonym',
      verdict: 'yes',
      text: 'The south and west look closer to normal.',
      sources: [],
    },
    {
      authorId: 'u-tomas',
      displayName: 'Tomas',
      identity: 'name',
      verdict: 'yes',
      text: 'Pastoral areas are reporting early livestock movement.',
      sources: [],
    },
  ],
};

/** Synthetic replies under some answers, keyed by answer id. */
const COMMENTS: Record<string, Omit<AnswerComment, 'id'>[]> = {
  'R1043-a0': [
    {
      authorId: 'u-ibis',
      displayName: 'Ibis',
      identity: 'pseudonym',
      text: 'Same from our team in Adré. Do you have numbers for October?',
    },
    {
      authorId: 'u-nadia',
      displayName: 'Nadia',
      identity: 'name',
      text: 'UNHCR’s last update has weekly arrivals, I’ll add it as a source.',
    },
  ],
  'R1043-a1': [
    {
      authorId: 'u-marabou',
      displayName: 'Marabou',
      identity: 'pseudonym',
      text: 'Agree for Sila. Ouaddaï is where it matters most.',
    },
  ],
  'R1066-a0': [
    {
      authorId: 'u-a2',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      text: 'Boat access is down on the Niger side too.',
    },
  ],
  'R1042-a0': [
    {
      authorId: 'u-tomas',
      displayName: 'Tomas',
      identity: 'name',
      text: 'Confirmed. Queues at fuel stations in Bamako since Monday.',
    },
    {
      authorId: 'u-a7',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      text: 'Prices in Ségou are rising too.',
    },
  ],
  'R1042-a1': [
    {
      authorId: 'u-heron',
      displayName: 'Heron',
      identity: 'pseudonym',
      text: 'Air access to Ménaka is also limited now.',
    },
  ],
  'R1044-a0': [
    {
      authorId: 'u-weaver',
      displayName: 'Weaver',
      identity: 'pseudonym',
      text: 'The latest ICPAC outlook supports this split.',
    },
  ],
  'R1048-a1': [
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      text: 'Same in Ed Damazin, the Kurmuk road has been closed since last week.',
    },
  ],
  'R1037-a1': [
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      text: 'Same from Renk. Do we know how many crossed this week?',
    },
    { authorId: 'u-heron', displayName: 'Heron', identity: 'pseudonym', text: 'About 4,000 according to IOM.' },
  ],
  'R1037-a3': [
    {
      authorId: 'u-nadia',
      displayName: 'Nadia',
      identity: 'name',
      text: 'Fair point, but the trend is clearly towards wider fighting.',
    },
  ],
  'R1053-a1': [
    {
      authorId: 'u-ibis',
      displayName: 'Ibis',
      identity: 'pseudonym',
      text: 'True for the port, but flights are another story.',
    },
    {
      authorId: 'u-kestrel',
      displayName: 'Kestrel',
      identity: 'pseudonym',
      text: 'Agree. Delays are the main impact for now.',
    },
  ],
  'R1046-a0': [
    {
      authorId: 'u-a11',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      text: 'WFP’s lean season numbers back this up.',
    },
  ],
  'R1049-a1': [
    {
      authorId: 'u-a5',
      displayName: 'Anonymous expert',
      identity: 'anonymous',
      text: 'IOM tracked over 3,000 arrivals in Kosti this month.',
    },
  ],
};

export function seedAnswers(): Answer[] {
  return Object.entries(ANSWERS).flatMap(([riskId, list]) =>
    list.map((a, i) => {
      const id = `${riskId}-a${i}`;
      return {
        ...a,
        id,
        riskId,
        // Stable made-up like counts, so the demo looks the same every load
        likes: (a.text.length * 7 + i * 3) % 9,
        // Seeds without a forecast get one in line with their verdict
        forecast: a.forecast ?? (a.verdict === 'yes' ? 4 : 2),
        comments: (COMMENTS[id] ?? []).map((c, j) => ({ ...c, id: `${id}-c${j}` })),
      };
    }),
  );
}

// Chat end times, relative to when the app loads so the demo always shows the
// same picture. Timers turn amber under 12 h and red (with seconds) under 1 h.
const H = 3600_000;
const LOADED = Date.now();
const endsIn = (ms: number) => LOADED + ms;

export const COMMUNITIES: Community[] = [
  {
    riskId: 'R1043',
    name: 'Eastern Chad border',
    members: 7,
    unread: 3,
    endsAt: endsIn(2 * 24 * H + 14 * H),
    lastMessage: { author: 'Moderator', text: 'Round 2 is open. Here is the group summary from round 1.' },
  },
  {
    riskId: 'R1066',
    name: 'Lake Chad Basin',
    members: 9,
    unread: 2,
    endsAt: endsIn(9 * H + 40 * 60_000),
    lastMessage: { author: 'Ibis', text: 'Added a source on the displacement towards Maiduguri.' },
  },
  {
    riskId: 'R1055',
    name: 'West Darfur returns',
    members: 6,
    unread: 0,
    endsAt: endsIn(5 * 24 * H + 2 * H),
    lastMessage: { author: 'Sunbird', text: 'I agree with the triggers, but our numbers for returns are lower.' },
  },
  { riskId: 'R1045', name: 'Ethiopia Kiremt rains', members: 8, unread: 4, endsAt: endsIn(25 * H) },
  { riskId: 'R1051', name: 'West Kordofan markets', members: 6, unread: 0, endsAt: endsIn(46 * 60_000 + 51_000) },
  { riskId: 'R1054', name: 'Merowe Dam and grid', members: 6, unread: 1, endsAt: endsIn(3 * 24 * H) },
  {
    riskId: 'R1048',
    name: 'Blue Nile displacement',
    members: 7,
    unread: 1,
    endsAt: endsIn(2 * 24 * H + 14 * H),
    lastMessage: { author: 'Heron', text: 'Roads to Kurmuk are cut. Aid convoys have stopped for now.' },
  },
  {
    riskId: 'R1049',
    name: 'Al Obeid siege',
    members: 6,
    unread: 0,
    endsAt: endsIn(9 * H + 40 * 60_000),
    lastMessage: { author: 'Sunbird', text: 'Families are already leaving towards Kosti.' },
  },
  { riskId: 'R1042', name: 'Mali blockades', members: 8, unread: 0, endsAt: endsIn(25 * H) },
  { riskId: 'R1044', name: 'Kenya El Niño', members: 7, unread: 0, endsAt: endsIn(46 * 60_000 + 51_000) },
  {
    riskId: 'R1037',
    name: 'South Sudan conflict',
    members: 7,
    unread: 0,
    endsAt: endsIn(-2 * 24 * H),
    lastMessage: { author: 'Moderator', text: 'This round has closed. Thank you all, the summary is up.' },
    summary:
      'Most of the panel saw fighting spreading from Upper Nile into Jonglei, with new displacement towards Renk and health facilities closing in Nasir. Experts pointed to stalled ceasefire talks and rising food prices along the Nile. One expert expected localised fighting rather than full civil war, and the group agreed the trend is towards wider conflict.',
  },
  {
    riskId: 'R1053',
    name: 'Port Sudan drones',
    members: 6,
    unread: 0,
    endsAt: endsIn(-5 * 24 * H),
    lastMessage: { author: 'Moderator', text: 'Round closed. See the final results.' },
    summary:
      'The panel was split. Experts agreed that drone threats have raised shipping insurance costs and delayed some aid flights, but several noted there has been no strike on the port since May and trade volumes have recovered. The group saw delays as the main impact rather than a full disruption of the corridor.',
  },
  {
    riskId: 'R1046',
    name: 'Madagascar drought',
    members: 6,
    unread: 0,
    endsAt: endsIn(-3 * 24 * H),
    summary:
      'Experts broadly supported the analysis, citing an already dry year in the Grand Sud and low seed stocks in Androy and Anosy. One expert cautioned that El Niño effects on Madagascar vary and the outcome is still uncertain.',
  },
];

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    kind: 'analysis',
    text: 'New ACAPS analysis for Chad: 2 risks to review',
    time: '5 min ago',
    unread: true,
    to: '/risks',
  },
  {
    id: 'n2',
    kind: 'round',
    text: 'Round 2 is open for Eastern Chad border',
    time: '1 h ago',
    unread: true,
    to: '/community/R1043',
  },
  {
    id: 'n3',
    kind: 'summary',
    text: 'Group summary ready for Lake Chad Basin',
    time: '3 h ago',
    unread: true,
    to: '/community/R1066',
  },
  {
    id: 'n4',
    kind: 'resolved',
    text: 'Your forecast on Ethiopia Kiremt rains has resolved',
    time: 'Yesterday',
    unread: false,
    to: '/ranking',
  },
  {
    id: 'n5',
    kind: 'reply',
    text: 'A peer replied in Lake Chad Basin',
    time: '2 days ago',
    unread: false,
    to: '/community/R1066',
  },
];

export const RANKING: Ranking = {
  rank: 3,
  panelSize: 9,
  panel: 'Chad',
  round: 3,
  roundEndsAt: ROUND_ENDS_AT,
  awardsAt: ANNUAL_AWARDS_AT,
  certificates: [
    { id: 'c1', label: 'First Resolved Forecast', shape: 'drop', awarded: '2026-05-18' },
    { id: 'c2', label: 'Ten Contributions', shape: 'ring', awarded: '2026-09-02' },
    { id: 'c3', label: 'Well Calibrated', shape: 'knot', awarded: '2026-10-30' },
    { id: 'c4', label: 'Super Estimator', shape: 'ring', progress: 'Top 3 for three rounds: 1 of 3' },
  ],
  // Country centroids only, never exact places.
  countries: [
    {
      isoNumeric: '148',
      name: 'Chad',
      region: 'Lake Chad Basin',
      count: 9,
      crises: [
        {
          title:
            'Escalating cross-border insecurity linked to the Sudan conflict increases protection risks and humanitarian needs in eastern Chad',
          exposure: '>500,000',
        },
        {
          title:
            'Escalating insecurity across the Lake Chad Basin increases displacement, protection risks, and humanitarian access constraints',
          exposure: '100,000-250,000',
        },
      ],
    },
    {
      isoNumeric: '729',
      name: 'Sudan',
      region: 'East Africa',
      count: 8,
      crises: [
        {
          title: 'Interregional trade restrictions disrupt markets and deepen food insecurity in West Kordofan',
          exposure: '250,000-500,000',
        },
        {
          title:
            'RSF drone attacks damage the Merowe Dam and power grid in Northern state, disrupting health, food security, and public services',
          exposure: '250,000-500,000',
        },
        {
          title: 'Mass returns from eastern Chad exacerbate humanitarian needs in West Darfur State',
          exposure: '100,000-250,000',
        },
        {
          title: 'RSF expansion in Blue Nile state triggers displacement and protection risks',
          exposure: '20,000-100,000',
        },
        {
          title:
            'RSF restoration of siege on Al Obeid, North Kordofan drives widescale displacement towards White Nile state',
          exposure: '100,000-250,000',
        },
        {
          title:
            'Long-range RSF drones targeting the eastern supply corridor and Port Sudan disrupt trade and aid delivery in Red Sea state',
          exposure: '250,000-500,000',
        },
      ],
    },
    {
      isoNumeric: '231',
      name: 'Ethiopia',
      region: 'East Africa',
      count: 4,
      crises: [
        {
          title: 'Forecast below-average Kiremt rains in Ethiopia threaten food production and livelihoods',
          exposure: '>500,000',
        },
      ],
    },
    {
      isoNumeric: '566',
      name: 'Nigeria',
      region: 'Lake Chad Basin',
      count: 3,
      crises: [
        {
          title:
            'Escalating insecurity across the Lake Chad Basin increases displacement, protection risks, and humanitarian access constraints',
          exposure: '100,000-250,000',
        },
      ],
    },
    {
      isoNumeric: '562',
      name: 'Niger',
      region: 'Lake Chad Basin',
      count: 3,
      crises: [
        {
          title:
            'Escalating insecurity across the Lake Chad Basin increases displacement, protection risks, and humanitarian access constraints',
          exposure: '100,000-250,000',
        },
      ],
    },
    {
      isoNumeric: '728',
      name: 'South Sudan',
      region: 'East Africa',
      count: 3,
      crises: [
        {
          title:
            "Escalating violence between the Sudan People's Liberation Movement and the Sudan People's Liberation Movement-in-Opposition reignites civil war, driving mass displacement and service collapse",
          exposure: '>500,000',
        },
      ],
    },
    {
      isoNumeric: '120',
      name: 'Cameroon',
      region: 'Lake Chad Basin',
      count: 2,
      crises: [
        {
          title:
            'Escalating insecurity across the Lake Chad Basin increases displacement, protection risks, and humanitarian access constraints',
          exposure: '100,000-250,000',
        },
      ],
    },
    {
      isoNumeric: '706',
      name: 'Somalia',
      region: 'East Africa',
      count: 2,
      crises: [
        {
          title:
            'Consecutive below-average rains amid expected La Niña conditions in northern and central Somalia deepen drought Impacts',
          exposure: '>500,000',
        },
      ],
    },
    {
      isoNumeric: '404',
      name: 'Kenya',
      region: 'East Africa',
      count: 1,
      crises: [
        {
          title: 'Forecast El Niño conditions threaten crop production and worsen food insecurity in Kenya',
          exposure: '>500,000',
        },
      ],
    },
    {
      isoNumeric: '434',
      name: 'Libya',
      region: 'North Africa',
      count: 1,
      crises: [
        {
          title:
            'A contested April 2026 electoral process in Libya heightens localised armed clashes, displacement, and service disruptions',
          exposure: '<20,000',
        },
      ],
    },
    {
      isoNumeric: '466',
      name: 'Mali',
      region: 'Central Sahel',
      count: 1,
      crises: [
        {
          title:
            'Continued coordinated JNIM–FLA attacks and blockades increase protection risks, displacement, and humanitarian access constraints in Mali',
          exposure: '>500,000',
        },
      ],
    },
    { isoNumeric: '854', name: 'Burkina Faso', region: 'Central Sahel', count: 1, crises: [] },
  ],
  assessedRiskIds: ['R1043', 'R1066', 'R1055', 'R1051', 'R1054', 'R1045'],
  stats: {
    contributions: 38,
    resolvedForecasts: 16,
    brier: 0.18,
    baselineBrier: 0.21,
    roundsJoined: 24,
  },
};

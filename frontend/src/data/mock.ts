/*
 * Mock data. Risk fields are copied from data/risk-radar-export.csv (ACAPS Risk Radar).
 * `family`, `image` and `area` are our own tags. Everything else here (experts, answers,
 * counts, rankings, notifications) is synthetic and describes no real person.
 */
import type { Answer, AppNotification, Community, Ranking, Risk, User } from './types';
import { ROUND_ENDS_AT } from '../config';
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
    { authorId: 'u-heron', displayName: 'Heron', identity: 'pseudonym', verdict: 'yes', text: 'Matches partner reports from the border: new arrivals every week and more incidents on the roads.', sources: [], isNew: true },
    { authorId: 'u-nadia', displayName: 'Nadia', identity: 'name', verdict: 'partly', text: 'Right for Ouaddaï, less so further south. Sila has been quieter since the rains.', sources: [] },
    { authorId: 'u-a1', displayName: 'Anonymous expert', identity: 'anonymous', verdict: 'yes', text: 'Armed groups cross more often. Protection needs are rising faster than the response.', sources: [], isNew: true },
    { authorId: 'u-ibis', displayName: 'Ibis', identity: 'pseudonym', verdict: 'partly', text: 'The picture is right, but the exposure looks high for the next three months.', sources: [] },
    { authorId: 'u-marabou', displayName: 'Marabou', identity: 'pseudonym', verdict: 'yes', text: 'Sites near the border are over capacity. I would raise the impact.', sources: [] },
  ],
  R1066: [
    { authorId: 'u-weaver', displayName: 'Weaver', identity: 'pseudonym', verdict: 'yes', text: 'Attacks on the islands have picked up again. Access by boat is now very limited.', sources: [], isNew: true },
    { authorId: 'u-a2', displayName: 'Anonymous expert', identity: 'anonymous', verdict: 'yes', text: 'Displacement towards the towns is visible. Host communities are stretched.', sources: [] },
    { authorId: 'u-tomas', displayName: 'Tomas', identity: 'name', verdict: 'partly', text: 'True for the Nigerian side. On the Cameroon side it feels stable for now.', sources: [] },
    { authorId: 'u-heron', displayName: 'Heron', identity: 'pseudonym', verdict: 'yes', text: 'Agree. Road escorts are back on two main routes.', sources: [] },
  ],
  R1055: [
    { authorId: 'u-sunbird', displayName: 'Sunbird', identity: 'pseudonym', verdict: 'yes', text: 'Returns are real, but many people move back and forth across the border.', sources: [] },
    { authorId: 'u-a3', displayName: 'Anonymous expert', identity: 'anonymous', verdict: 'partly', text: 'Needs are high, but “mass” may overstate it outside El Geneina.', sources: [] },
    { authorId: 'u-ibis', displayName: 'Ibis', identity: 'pseudonym', verdict: 'yes', text: 'Water and shelter are the first gaps people mention.', sources: [] },
  ],
  R1051: [
    { authorId: 'u-plover', displayName: 'Plover', identity: 'pseudonym', verdict: 'yes', text: 'Prices of staples in local markets have roughly doubled since the routes closed.', sources: [] },
    { authorId: 'u-a4', displayName: 'Anonymous expert', identity: 'anonymous', verdict: 'partly', text: 'Some informal trade still gets through, so the gap is uneven.', sources: [] },
    { authorId: 'u-nadia', displayName: 'Nadia', identity: 'name', verdict: 'yes', text: 'Traders report fewer trucks and higher fees at checkpoints.', sources: [] },
  ],
  R1054: [
    { authorId: 'u-bustard', displayName: 'Bustard', identity: 'pseudonym', verdict: 'partly', text: 'Repairs were faster than expected last time. Hospitals run on generators meanwhile.', sources: [] },
    { authorId: 'u-a5', displayName: 'Anonymous expert', identity: 'anonymous', verdict: 'no', text: 'I don’t see signs of new attacks on the dam itself.', sources: [] },
  ],
  R1045: [
    { authorId: 'u-hornbill', displayName: 'Hornbill', identity: 'pseudonym', verdict: 'yes', text: 'Planting is already late in parts of Amhara and Tigray.', sources: [] },
    { authorId: 'u-a6', displayName: 'Anonymous expert', identity: 'anonymous', verdict: 'yes', text: 'Seasonal outlooks agree on below-average rains in the north.', sources: [] },
    { authorId: 'u-weaver', displayName: 'Weaver', identity: 'pseudonym', verdict: 'partly', text: 'The south and west look closer to normal.', sources: [] },
    { authorId: 'u-tomas', displayName: 'Tomas', identity: 'name', verdict: 'yes', text: 'Pastoral areas are reporting early livestock movement.', sources: [] },
  ],
};

export function seedAnswers(): Answer[] {
  return Object.entries(ANSWERS).flatMap(([riskId, list]) =>
    list.map((a, i) => ({ ...a, id: `${riskId}-a${i}`, riskId })),
  );
}

export const COMMUNITIES: Community[] = [
  { riskId: 'R1043', name: 'Eastern Chad border', members: 7, unread: 3, mine: true },
  { riskId: 'R1066', name: 'Lake Chad Basin', members: 9, unread: 2, mine: true },
  { riskId: 'R1055', name: 'West Darfur returns', members: 6, unread: 0, mine: true },
  { riskId: 'R1045', name: 'Ethiopia Kiremt rains', members: 8, unread: 4, mine: false },
  { riskId: 'R1051', name: 'West Kordofan markets', members: 6, unread: 0, mine: false },
  { riskId: 'R1054', name: 'Merowe Dam and grid', members: 6, unread: 1, mine: false },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', kind: 'analysis', text: 'New ACAPS analysis for Chad: 2 risks to review', time: '5 min ago', unread: true, to: '/risks' },
  { id: 'n2', kind: 'round', text: 'Round 2 is open for R1043', time: '1 h ago', unread: true, to: '/community/R1043' },
  { id: 'n3', kind: 'summary', text: 'Group summary ready for R1066', time: '3 h ago', unread: true, to: '/community/R1066' },
  { id: 'n4', kind: 'resolved', text: 'Your forecast on R1045 has resolved', time: 'Yesterday', unread: false, to: '/ranking' },
  { id: 'n5', kind: 'reply', text: 'A peer replied in Lake Chad Basin', time: '2 days ago', unread: false, to: '/community/R1066' },
];

export const RANKING: Ranking = {
  rank: 3,
  panelSize: 9,
  panel: 'Chad',
  round: 3,
  roundEndsAt: ROUND_ENDS_AT,
  certificates: [
    { id: 'c1', label: 'First resolved forecast', shape: 'drop' },
    { id: 'c2', label: '10 contributions', shape: 'ring' },
    { id: 'c3', label: 'Well calibrated', shape: 'knot' },
  ],
  // Country centroids only, never exact places.
  countries: [
    { isoNumeric: '148', name: 'Chad', region: 'Lake Chad Basin', count: 9 },
    { isoNumeric: '729', name: 'Sudan', region: 'East Africa', count: 8 },
    { isoNumeric: '231', name: 'Ethiopia', region: 'East Africa', count: 4 },
    { isoNumeric: '566', name: 'Nigeria', region: 'Lake Chad Basin', count: 3 },
    { isoNumeric: '562', name: 'Niger', region: 'Lake Chad Basin', count: 3 },
    { isoNumeric: '728', name: 'South Sudan', region: 'East Africa', count: 3 },
    { isoNumeric: '120', name: 'Cameroon', region: 'Lake Chad Basin', count: 2 },
    { isoNumeric: '706', name: 'Somalia', region: 'East Africa', count: 2 },
    { isoNumeric: '404', name: 'Kenya', region: 'East Africa', count: 1 },
    { isoNumeric: '434', name: 'Libya', region: 'North Africa', count: 1 },
    { isoNumeric: '466', name: 'Mali', region: 'Central Sahel', count: 1 },
    { isoNumeric: '854', name: 'Burkina Faso', region: 'Central Sahel', count: 1 },
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

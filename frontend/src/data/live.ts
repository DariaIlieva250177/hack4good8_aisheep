/*
 * The app's data, built from the file that
 * `python src/build_demo_data.py` writes. Everything in it is synthetic except
 * the ACAPS risk text. Names are the aliases peers see, never real people.
 */
import raw from '../../../app/data/expert_demo.json';
import { ANNUAL_AWARDS_AT } from '../config';
import { IMAGE_CATEGORIES } from './families';
import { en } from '../i18n/en';
import type {
  Answer,
  AppNotification,
  ChatOutcome,
  Community,
  GroupAnswer,
  ImageCategory,
  Impact,
  Likelihood,
  Probability,
  Ranking,
  Risk,
  RiskAnalysis,
  RiskLevel,
  User,
  Verdict,
} from './types';

interface RawAnalysis {
  trend: string | null;
  priority_needs: string[];
  rationale: string[];
  update: { date: string | null; text: string[] } | null;
  vulnerability: string[];
  expected_impact: string[];
  sources: { label: string; url: string }[];
}

interface RawCard {
  risk_id: string;
  title: string;
  country: string;
  area: string;
  image: string;
  level: RiskLevel | null;
  urgency: string | null;
  probability: string | null;
  impact: number | null;
  exposure: string | null;
  status: string;
  triggers: { id: string; title: string; description: string | null }[];
  analysis: RawAnalysis | null;
}

interface RawComment {
  id: string;
  name: string;
  text: string;
  verdict: Verdict | null;
  forecast: number | null;
  likes: number;
  source: string | null;
  replies: { id: string; name: string; text: string }[];
}

interface RawChat {
  name: string;
  members: number;
  closes: string;
  unread: number;
  group: {
    answers: number;
    agree: number;
    disagree: number;
    weighted_agree: number | null;
    country_answers: number | null;
    country_agree: number | null;
    country: string | null;
  } | null;
  forecasts: number[];
  last_message: { author: string; text: string } | null;
  summary: string | null;
  outcome: {
    happened: boolean;
    what_happened: string | null;
    you_said: string;
    points: number;
    bonus_points: number;
    correct_call: boolean;
  } | null;
  comments: RawComment[];
}

interface Bundle {
  generated_for: string;
  expert: {
    countries: { country: string; status: string }[];
    domains: { category: string; status: string }[];
    panel: string;
    chats_joined: number;
    names: Record<string, string>;
    rank: {
      points: number;
      position: number | null;
      out_of: number;
      brier: number;
      acaps_brier: number;
      groups: { type: string; name: string; position: number; out_of: number }[];
    };
    contributions: {
      total: number;
      resolved_forecasts: number;
      people_in_areas: number;
      countries: {
        country: string;
        iso_numeric: string;
        region: string;
        count: number;
        crises: { title: string; exposure: string }[];
      }[];
    };
  };
  deck: { risk_id: string }[];
  todo: string[];
  my_answers: { risk_id: string; verdict: Verdict | null; forecast: number; text: string }[];
  cards: Record<string, RawCard>;
  chats: Record<string, RawChat>;
  alerts: { id: string; kind: string; risk_id: string; text: string; created_at: string; unread: boolean }[];
}

const bundle = raw as unknown as Bundle;

const DAY = 86_400_000;
const LOADED = Date.now();
const generated = Date.parse(`${bundle.generated_for}T23:59:59Z`);

/** Open chats keep their distance from "today", so the demo looks the same on any day. */
const chatEnd = (closes: string) => {
  const at = Date.parse(`${closes}T23:59:59Z`);
  return at >= generated ? LOADED + (at - generated) : at;
};

const PROBABILITIES: Probability[] = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

function toAnalysis(a: RawAnalysis): RiskAnalysis {
  return {
    trend: a.trend,
    priorityNeeds: a.priority_needs,
    rationale: a.rationale,
    update: a.update ? { date: a.update.date ?? '', text: a.update.text } : null,
    vulnerability: a.vulnerability,
    expectedImpact: a.expected_impact,
    sources: a.sources,
  };
}

function toRisk(c: RawCard): Risk {
  const image = (c.image in IMAGE_CATEGORIES ? c.image : 'default') as ImageCategory;
  const members = bundle.chats[c.risk_id]?.members ?? 0;
  return {
    id: c.risk_id,
    title: c.title,
    country: c.country,
    type: '',
    // ACAPS's own risk level. Two past risks were never rated, so they show as Low
    level: c.level ?? 'Low',
    probability: PROBABILITIES.find((p) => p === c.probability) ?? 'Medium',
    impact: (c.impact ?? 3) as Impact,
    exposure: c.exposure ?? '',
    status: c.status as Risk['status'],
    family: IMAGE_CATEGORIES[image].family,
    image,
    area: c.area,
    answered: members,
    panelSize: members,
    triggers: c.triggers.map((t) => ({ id: t.id, title: t.title, description: t.description ?? '' })),
    analysis: c.analysis ? toAnalysis(c.analysis) : undefined,
  };
}

function toGroup(g: NonNullable<RawChat['group']>): GroupAnswer {
  return {
    answers: g.answers,
    agree: g.agree,
    disagree: g.disagree,
    weightedAgree: g.weighted_agree,
    countryAnswers: g.country_answers,
    countryAgree: g.country_agree,
    country: g.country,
  };
}

const STEPS = ['very_unlikely', 'unlikely', 'even_chance', 'likely', 'very_likely'];

function toOutcome(o: NonNullable<RawChat['outcome']>): ChatOutcome {
  return {
    happened: o.happened,
    whatHappened: o.what_happened,
    youSaid: en.answer.scale[STEPS.indexOf(o.you_said)] ?? null,
    points: o.points,
    bonusPoints: o.bonus_points,
    correctCall: o.correct_call,
  };
}

export const RISKS: Risk[] = Object.values(bundle.cards).map(toRisk);

export const INITIAL_STACK = bundle.deck.map((c) => c.risk_id);
export const INITIAL_TODO = [...bundle.todo];

const approved = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status === 'approved');

/** The demo expert's display name on each risk: a new one in every chat, so chats cannot be linked. */
export const MY_NAMES: Record<string, string> = bundle.expert.names;

export const ME: User = {
  id: 'u-kestrel',
  // Shown where no chat is in view, such as the profile picture
  pseudonym: MY_NAMES.R1043 ?? 'Kestrel',
  name: 'Sam Demo',
  panel: bundle.expert.panel,
  identity: 'pseudonym',
  countries: approved(bundle.expert.countries).map((c) => c.country),
  domains: approved(bundle.expert.domains).map((d) => d.category),
  // Profile settings: synthetic values for the demo
  email: 'sam.demo@example.org',
  country: bundle.expert.panel,
  domain: 'conflict',
  bio: 'Protection officer in eastern Chad since 2021. Synthetic profile for the demo.',
  language: 'en',
  notifications: { newRisks: true, roundReminders: true, replies: true, summaries: true, emailDigest: false },
  twoStep: false,
  passwordChanged: '2026-08-14',
};

export const COMMUNITIES: Community[] = Object.entries(bundle.chats).map(([riskId, c]) => ({
  riskId,
  name: c.name,
  members: c.members,
  unread: c.unread,
  endsAt: chatEnd(c.closes),
  summary: c.summary ?? undefined,
  lastMessage: c.last_message ?? undefined,
  group: c.group ? toGroup(c.group) : undefined,
  forecasts: c.forecasts,
  outcome: c.outcome ? toOutcome(c.outcome) : undefined,
}));

const toStep = (n: number | null): Likelihood | undefined => (n ? (n as Likelihood) : undefined);

export function seedAnswers(): Answer[] {
  const peers = Object.entries(bundle.chats).flatMap(([riskId, chat]) =>
    chat.comments.map(
      (c, i): Answer => ({
        id: c.id,
        riskId,
        authorId: c.name,
        displayName: c.name,
        identity: 'pseudonym',
        verdict: c.verdict,
        forecast: toStep(c.forecast),
        text: c.text,
        sources: c.source ? [c.source] : [],
        isNew: i >= chat.comments.length - chat.unread,
        likes: c.likes,
        comments: c.replies.map((r) => ({
          id: r.id,
          authorId: r.name,
          displayName: r.name,
          identity: 'pseudonym' as const,
          text: r.text,
        })),
      }),
    ),
  );
  const mine = bundle.my_answers.map(
    (a): Answer => ({
      id: `${a.risk_id}-mine`,
      riskId: a.risk_id,
      authorId: ME.id,
      displayName: MY_NAMES[a.risk_id] ?? ME.pseudonym,
      identity: ME.identity,
      verdict: a.verdict,
      forecast: toStep(a.forecast),
      text: a.text,
      sources: [],
    }),
  );
  return [...peers, ...mine];
}

const ALERT_KIND = { new_risk: 'analysis', reply: 'reply', result: 'resolved' } as const;

function ago(date: string): string {
  const days = Math.round((generated - Date.parse(`${date}T23:59:59Z`)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const NOTIFICATIONS: AppNotification[] = bundle.alerts.map((a) => ({
  id: a.id,
  kind: ALERT_KIND[a.kind as keyof typeof ALERT_KIND],
  text: a.text,
  time: ago(a.created_at),
  unread: a.unread,
  to: a.kind === 'new_risk' ? '/risks' : `/community/${a.risk_id}`,
}));

const { rank, contributions } = bundle.expert;
const panelRank = rank.groups.find((g) => g.type === 'country' && g.name === bundle.expert.panel);

export const RANKING: Ranking = {
  rank: panelRank?.position ?? rank.position ?? rank.out_of,
  panelSize: panelRank?.out_of ?? rank.out_of,
  panel: bundle.expert.panel,
  round: 0,
  roundEndsAt: ANNUAL_AWARDS_AT,
  awardsAt: ANNUAL_AWARDS_AT,
  overall: { position: rank.position, outOf: rank.out_of, points: rank.points },
  groups: rank.groups
    .filter((g) => g !== panelRank)
    .map((g) => ({ name: g.name, position: g.position, outOf: g.out_of })),
  // Certificates are still sample data: the data model has no table for them.
  certificates: [
    { id: 'c1', label: 'First Resolved Forecast', shape: 'drop', awarded: '2026-05-18' },
    { id: 'c2', label: 'Ten Contributions', shape: 'ring', awarded: '2026-09-02' },
    { id: 'c3', label: 'Well Calibrated', shape: 'knot', awarded: '2026-10-30' },
    { id: 'c4', label: 'Super Estimator', shape: 'ring', progress: 'Top 3 three times: 1 of 3' },
  ],
  countries: contributions.countries.map((c) => ({
    isoNumeric: c.iso_numeric,
    name: c.country,
    region: c.region,
    count: c.count,
    crises: c.crises,
  })),
  assessedRiskIds: [],
  exposedPeople: contributions.people_in_areas,
  stats: {
    contributions: contributions.total,
    resolvedForecasts: contributions.resolved_forecasts,
    brier: rank.brier,
    baselineBrier: rank.acaps_brier,
    roundsJoined: bundle.expert.chats_joined,
  },
};

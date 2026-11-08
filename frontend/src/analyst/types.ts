/*
 * Shapes of data/analyst-data.json: the data the analyst view was built with
 * (ACAPS risks, updates and triggers; simulated experts, answers and ranks).
 * Extracted unchanged from analyst/acaps_community_analyst_view_reviewd.html.
 */

export type Level = 'High' | 'Medium' | 'Low' | string;
export type Privacy = 'known_to_acaps' | 'verified_anonymous' | 'verified_deleted' | string;

export interface SourceLink {
  label: string;
  url: string;
}

export interface Trigger {
  id: string;
  title: string;
  /** ACAPS's rate in %, or null when not given */
  rate: number | null;
  last: string;
  goal: string;
  description: string;
}

export interface RiskUpdate {
  date: string; // dd/mm/yyyy
  label: string;
  text: string;
  first: string;
  links: SourceLink[];
}

export interface Risk {
  id: string;
  title: string;
  countries: string[];
  country: string;
  probability: string;
  band: string;
  impact: number;
  level: Level;
  trend: string | null;
  exposure: string;
  needs: string[];
  category: string;
  updates: RiskUpdate[];
  triggers: Trigger[];
  closes: string | null;
  answers: number;
  local: number;
  bands: number[];
  bandsLocal: number[];
  rationale: string[];
  vulnerability: string[];
  impactText: string[];
  group: {
    answers: number;
    agree: number;
    disagree: number;
    weighted_agree: number;
    country_answers: number;
    country_agree: number;
    country: string;
  } | null;
}

export interface OpenRisk {
  id: string;
  title: string;
  country: string;
  level: Level;
  closes: string;
  closes_iso: string;
  votes: number;
  eligible: number;
  local: number;
  agree: number;
  forecasts: number;
  written: number;
  replies: number;
  likes: number;
  saved: number;
  skipped: number;
  opens: string;
  daily: number[];
  last3: number;
  first3: number;
}

export interface Approval {
  id: string;
  registered: string;
  privacy: Privacy;
  name: string | null;
  org: string | null;
  education: string | null;
  comment: string | null;
  countries: { name: string }[];
  fields: { name: string }[];
  docs: { type: string; file: string; supports: string; uploaded: string }[];
}

export interface CountryInfo {
  name: string;
  ids: string[];
  high: number;
  medium: number;
  worse: number;
}

export interface Cite {
  key: string;
  risk: string;
  label: string;
  quote: string;
  links: SourceLink[];
}

export interface MapEvent {
  id: string;
  date: string; // yyyy-mm-dd
  kind: 'attack' | 'people' | 'quiet' | string;
  place: string;
  title: string;
  cite: string;
  approx: boolean;
}

export interface Claim {
  id: string;
  risk: string;
  side: 'challenge' | 'add' | string;
  theme: string;
  title: string;
  against: string | null;
  answers: string[];
  quote: string;
  moved: string[];
  by: string;
  quotes: Record<string, string>;
  trigger: string | null;
  shared: string | null;
}

export interface Reply {
  text: string;
  by: string;
  pushback: boolean;
}

export interface Answer {
  id: string;
  risk: string;
  text: string;
  by: string;
  hidden: boolean;
  stance: 'agree' | 'disagree' | string;
  forecast: string | null;
  match: string;
  weight: number;
  matchLabel: string;
  local: boolean;
  rank: number | null;
  changed: boolean;
  basis: string;
  words: string | null;
  attachment: string | null;
  likes: number;
  replies: Reply[];
}

export interface AiDraft {
  chip: string;
  reading: string;
  title: string;
  lines: string[];
}

export interface Link {
  id: string;
  from: string;
  to: string;
  strength: string;
  name: string;
  why: string;
  cites: string[];
}

export interface Insight {
  risks: string[];
  judgement: string;
  judgement_cites: string[];
  why: string[];
  who: string;
  fails: string;
  prepare: string;
  actors: { name: string; cite: string }[];
  against: string[];
  watch: string[][];
  confidence: string;
  confidence_why: string;
  gaps: string[];
  experts: string[];
  pushback: string[];
}

export interface TrackRow {
  rating: string;
  band: string;
  total: number;
  happened: number;
  risks: { id: string; title: string; country: string; happened: boolean }[];
}

export interface SuggestedCard {
  id: string;
  statement: string;
  area: string;
  why: string;
  status: string;
  created_at: string;
  posted_risk_id: string | null;
  related: string | null;
  note: string | null;
  country: string | null;
}

export interface Expert {
  id: string;
  privacy: Privacy;
  countries: string[];
  fields: string[];
  pending: { type?: string; name: string }[];
  rank: {
    position: number;
    points: number;
    forecasts: number;
    calls: number;
    correct: number;
    brier: number;
    acapsBrier: number;
  } | null;
  groups: { type: string; name: string; position: number; outOf: number }[];
  round: { answered: number };
  last: string | null;
  since: string;
  contrib: { country: string; votes: number; forecasts: number }[];
}

export interface Shape {
  name: string;
  d: string;
}

export interface MapSet {
  width: number;
  height: number;
  shapes: Shape[];
  /** place name -> [x, y] in the map's own units */
  places?: Record<string, [number, number]>;
}

export interface AnalystData {
  panel: {
    approved: number;
    pending: number;
    active30: number;
    ranked: number;
    privacy: Record<string, number>;
    countries: { country: string; risks: number; answers: number; experts: number }[];
    top: {
      expert_id: string;
      position: number;
      average_points: number;
      forecasts: number;
      panel: string;
      panel_position: number;
      panel_size: number;
    }[];
    active: {
      expert_id: string;
      panel: string;
      votes: number;
      written: number;
      replies: number;
      forecasts: number;
      sources: number;
      total: number;
    }[];
  };
  open: OpenRisk[];
  approvals: Approval[];
  weekEnd: string;
  risks: Record<string, Risk>;
  countries: Record<string, CountryInfo>;
  cites: Record<string, Cite>;
  events: MapEvent[];
  claims: Claim[];
  summaries: Record<string, string[]>;
  written: string[];
  answers: Record<string, Answer>;
  ai: Record<string, AiDraft>;
  links: Link[];
  connect: Record<string, { place: string; name: string }>;
  insight: Insight;
  track: TrackRow[];
  unrated: number;
  cards: SuggestedCard[];
  maps: {
    world: MapSet;
    border: MapSet;
    sudan: MapSet;
    contours: string[];
  };
  latest: string;
  atlas: Record<string, string>;
  experts: Expert[];
  rankedOutOf: number;
  countryList: string[];
  fieldList: string[];
  answerExpert: Record<string, string>;
  identity: Record<string, { name: string; email: string; org: string }>;
}

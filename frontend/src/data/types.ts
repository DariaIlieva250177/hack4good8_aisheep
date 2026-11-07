export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Probability = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export type Impact = 1 | 2 | 3 | 4 | 5;

/** Our own hazard tag. The ACAPS export has no hazard category column. */
export type Family =
  | 'conflict'
  | 'political'
  | 'economic'
  | 'hydromet'
  | 'geophysical'
  | 'environmental'
  | 'technological'
  | 'health'
  | 'fallback';

/** Illustration category; several categories can share a family. */
export type ImageCategory =
  | 'default'
  | 'border'
  | 'conflict'
  | 'displacement'
  | 'political'
  | 'economic'
  | 'food'
  | 'health'
  | 'flood'
  | 'drought'
  | 'storm'
  | 'earthquake'
  | 'pests'
  | 'infrastructure'
  | 'aid';

/** An ACAPS trigger: an event that would make the risk more likely. */
export interface Trigger {
  id: string;
  title: string;
  description: string;
}

/** ACAPS Risk Radar write-up for one risk (paragraphs as arrays). */
export interface RiskAnalysis {
  trend: string | null;
  priorityNeeds: string[];
  rationale: string[];
  update: { date: string; text: string[] } | null;
  vulnerability: string[];
  expectedImpact: string[];
  sources: { label: string; url: string }[];
}

export interface Risk {
  id: string;
  title: string;
  country: string;
  /** ACAPS "Risk Type", e.g. "New emerging risk" */
  type: string;
  level: RiskLevel;
  probability: Probability;
  impact: Impact;
  /** ACAPS exposure band, e.g. ">500,000" */
  exposure: string;
  status: 'Active' | 'Materialised' | 'Not materialised';
  family: Family;
  image: ImageCategory;
  /** Short area label for the chip */
  area: string;
  /** Experts on the panel who answered this round */
  answered: number;
  panelSize: number;
  /** ACAPS triggers, shown on the back of the card */
  triggers?: Trigger[];
  /** Full ACAPS analysis, shown on the Answer page */
  analysis?: RiskAnalysis;
}

/** Agree ('yes') or disagree ('no') with the ACAPS statement. */
export type Verdict = 'yes' | 'no';

/** Five-point forecast scale: 1 very unlikely … 5 very likely. */
export type Likelihood = 1 | 2 | 3 | 4 | 5;

export type IdentityMode = 'name' | 'pseudonym' | 'anonymous';

export interface User {
  id: string;
  pseudonym: string;
  /** Synthetic display name, only shown when identity is 'name' */
  name: string;
  panel: string;
  identity: IdentityMode;
}

/** A reply under an expert's answer in a community chat. */
export interface AnswerComment {
  id: string;
  authorId: string;
  displayName: string;
  identity: IdentityMode;
  text: string;
}

export interface Answer {
  id: string;
  riskId: string;
  authorId: string;
  /** Already resolved against the author's identity choice */
  displayName: string;
  identity: IdentityMode;
  /** Null when the expert only gave a forecast or a written answer */
  verdict: Verdict | null;
  /** Forecast that the risk happens, 1 (very unlikely) to 5 (very likely) */
  forecast?: Likelihood;
  text: string;
  sources: string[];
  isNew?: boolean;
  likes?: number;
  /** The current user liked this answer */
  likedByMe?: boolean;
  comments?: AnswerComment[];
}

export interface AnswerInput {
  riskId: string;
  verdict: Verdict | null;
  forecast?: Likelihood | null;
  text: string;
  sources: string[];
}

export interface Community {
  riskId: string;
  name: string;
  members: number;
  unread: number;
  /** When the chat closes (ms since epoch); after that it's Expired and read-only */
  endsAt: number;
  /** Moderator's wrap-up, shown at the top of an expired chat (synthetic) */
  summary?: string;
  /** Latest message, shown as the preview line in the chat list (synthetic) */
  lastMessage?: { author: string; text: string };
}

export interface Topic {
  risk: Risk;
  community: Community;
  mine: Answer | null;
  /** Empty until the user has answered (Delphi independence), unless exploring or expired */
  others: Answer[];
  othersCount: number;
}

export type NotificationKind = 'analysis' | 'round' | 'summary' | 'resolved' | 'reply';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  text: string;
  time: string;
  unread: boolean;
  /** Route the row opens */
  to: string;
}

export interface CountryContribution {
  /** ISO 3166-1 numeric, matches world-atlas ids */
  isoNumeric: string;
  name: string;
  region: string;
  count: number;
  /** ACAPS crises in this country the expert's input fed into (globe balloon) */
  crises?: { title: string; exposure: string }[];
  /** People living in the areas of those crises (filled in by the api) */
  people?: { count: number; upTo: boolean };
}

export interface Ranking {
  rank: number;
  panelSize: number;
  panel: string;
  round: number;
  roundEndsAt: string;
  /** When the annual awards are given (Ranking countdown) */
  awardsAt: string;
  certificates: {
    id: string;
    label: string;
    shape: 'ring' | 'knot' | 'drop';
    /** ISO date it was awarded; absent while still locked */
    awarded?: string;
    /** Progress line for a locked certificate */
    progress?: string;
  }[];
  countries: CountryContribution[];
  /** Risks the expert helped assess (for the exposure sum) */
  assessedRiskIds: string[];
  stats: {
    contributions: number;
    resolvedForecasts: number;
    brier: number;
    baselineBrier: number;
    roundsJoined: number;
  };
}

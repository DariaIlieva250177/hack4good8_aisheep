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
}

export type Verdict = 'yes' | 'partly' | 'no';

/** Five-point forecast scale: 1 strongly disagree … 5 strongly agree. */
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

export interface Answer {
  id: string;
  riskId: string;
  authorId: string;
  /** Already resolved against the author's identity choice */
  displayName: string;
  identity: IdentityMode;
  verdict: Verdict;
  /** Forecast, 1 (strongly disagree) to 5 (strongly agree) that the risk happens */
  forecast?: Likelihood;
  text: string;
  sources: string[];
  isNew?: boolean;
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
  mine: boolean;
}

export interface Topic {
  risk: Risk;
  community: Community;
  mine: Answer | null;
  /** Empty until the user has answered (Delphi independence) */
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
}

export interface Ranking {
  rank: number;
  panelSize: number;
  panel: string;
  round: number;
  roundEndsAt: string;
  certificates: { id: string; label: string; shape: 'ring' | 'knot' | 'drop' }[];
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

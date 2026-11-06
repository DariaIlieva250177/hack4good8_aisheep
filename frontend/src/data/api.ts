/*
 * Thin data layer. Every screen reads and writes through these async functions,
 * so swapping the in-memory mock for a real backend only touches this file.
 */
import type { Answer, AnswerInput, AppNotification, Community, IdentityMode, Ranking, Risk, Topic, User } from './types';
import { COMMUNITIES, INITIAL_STACK, INITIAL_TODO, ME, NOTIFICATIONS, RANKING, RISKS, seedAnswers } from './mock';

const LATENCY_MS = 80;
const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

const state = {
  me: { ...ME },
  risks: RISKS.map((r) => ({ ...r })),
  stack: [...INITIAL_STACK],
  todo: [...INITIAL_TODO],
  answers: seedAnswers(),
  communities: COMMUNITIES.map((c) => ({ ...c })),
  notifications: NOTIFICATIONS.map((n) => ({ ...n })),
};

/* ---------- change notification (lets screens refetch after a write) ---------- */

const listeners = new Set<() => void>();
let version = 0;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVersion(): number {
  return version;
}

function changed() {
  version += 1;
  listeners.forEach((fn) => fn());
}

/* ---------- helpers ---------- */

const riskById = (id: string) => state.risks.find((r) => r.id === id);
const byIds = (ids: string[]) => ids.map(riskById).filter((r): r is Risk => Boolean(r));

export function displayNameFor(user: User): string {
  if (user.identity === 'name') return user.name;
  if (user.identity === 'pseudonym') return user.pseudonym;
  return 'Anonymous expert';
}

/* ---------- reads ---------- */

export const getMe = () => wait({ ...state.me });

/** Risks waiting in the card stack, front first. */
export const getRisks = () => wait(byIds(state.stack));

export const getRisk = (id: string) => wait(riskById(id) ?? null);

export const getTodo = () => wait(byIds(state.todo));

export const getCommunities = () =>
  wait(state.communities.map((c) => ({ community: { ...c }, risk: riskById(c.riskId)! })));

export async function getTopic(riskId: string): Promise<Topic | null> {
  const risk = riskById(riskId);
  const community = state.communities.find((c) => c.riskId === riskId);
  if (!risk || !community) return wait(null);
  const mine = state.answers.find((a) => a.riskId === riskId && a.authorId === state.me.id) ?? null;
  const others = state.answers.filter((a) => a.riskId === riskId && a.authorId !== state.me.id);
  return wait({
    risk,
    community,
    mine,
    // Independence first: nothing about other answers leaves the server until you answer.
    others: mine ? others : [],
    othersCount: others.length,
  });
}

export const getRanking = (): Promise<Ranking & { exposedPeople: number }> => {
  const exposedPeople = byIds(RANKING.assessedRiskIds).reduce((sum, r) => sum + exposureLowerBound(r.exposure), 0);
  return wait({ ...RANKING, exposedPeople });
};

export const getNotifications = () => wait(state.notifications.map((n) => ({ ...n })));

export function unreadNotificationCount(): number {
  return state.notifications.filter((n) => n.unread).length;
}

/** ">500,000" -> 500000, "100,000-250,000" -> 100000 */
export function exposureLowerBound(band: string): number {
  const first = band.match(/[\d,]+/);
  return first ? Number(first[0].replace(/,/g, '')) : 0;
}

/* ---------- writes ---------- */

export async function setIdentity(identity: IdentityMode): Promise<User> {
  state.me.identity = identity;
  changed();
  return wait({ ...state.me });
}

/** Swipe right: keep it for later. */
export async function answerLater(riskId: string): Promise<void> {
  state.stack = state.stack.filter((id) => id !== riskId);
  if (!state.todo.includes(riskId)) state.todo.unshift(riskId);
  changed();
  return wait(undefined);
}

/** Swipe left: remove it. Returns the position so Undo can put it back. */
export async function skipRisk(riskId: string): Promise<number> {
  const index = state.stack.indexOf(riskId);
  state.stack = state.stack.filter((id) => id !== riskId);
  changed();
  return wait(index);
}

export async function undoSkip(riskId: string, index: number): Promise<void> {
  if (!state.stack.includes(riskId)) state.stack.splice(Math.max(0, index), 0, riskId);
  changed();
  return wait(undefined);
}

export async function submitAnswer(input: AnswerInput): Promise<Answer> {
  const existing = state.answers.find((a) => a.riskId === input.riskId && a.authorId === state.me.id);
  const answer: Answer = {
    id: existing?.id ?? `${input.riskId}-mine`,
    riskId: input.riskId,
    authorId: state.me.id,
    displayName: displayNameFor(state.me),
    identity: state.me.identity,
    verdict: input.verdict ?? existing?.verdict ?? 'partly',
    text: input.text.trim() || existing?.text || '',
    sources: input.sources.length ? input.sources : existing?.sources ?? [],
  };
  if (existing) {
    Object.assign(existing, answer);
  } else {
    state.answers.push(answer);
    const risk = riskById(input.riskId);
    if (risk) risk.answered = Math.min(risk.panelSize, risk.answered + 1);
  }
  state.stack = state.stack.filter((id) => id !== input.riskId);
  state.todo = state.todo.filter((id) => id !== input.riskId);
  changed();
  return wait(answer);
}

export async function markNotificationRead(id: string): Promise<AppNotification[]> {
  const n = state.notifications.find((x) => x.id === id);
  if (n) n.unread = false;
  changed();
  return getNotifications();
}

export async function markCommunityRead(riskId: string): Promise<Community | null> {
  const c = state.communities.find((x) => x.riskId === riskId);
  if (c && c.unread) {
    c.unread = 0;
    changed();
  }
  return wait(c ? { ...c } : null);
}

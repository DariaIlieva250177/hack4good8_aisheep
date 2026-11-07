/*
 * Thin data layer. Every screen reads and writes through these async functions,
 * so swapping the in-memory mock for a real backend only touches this file.
 */
import type { Answer, AnswerInput, AppNotification, Community, Family, IdentityMode, LanguageCode, NotificationPrefs, Ranking, Risk, Topic, User } from './types';
import { storedLanguage } from '../i18n/language';
import { COMMUNITIES, INITIAL_STACK, INITIAL_TODO, ME, NOTIFICATIONS, RANKING, RISKS, seedAnswers } from './mock';

const LATENCY_MS = 80;
const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

const state = {
  me: { ...ME, language: storedLanguage() },
  risks: RISKS.map((r) => ({ ...r })),
  stack: [...INITIAL_STACK],
  todo: [...INITIAL_TODO],
  /** Cards added to To-do since the user last opened it (badge on the tab) */
  newTodo: 0,
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

export const getMe = () => wait({ ...state.me, notifications: { ...state.me.notifications } });

/** Risks waiting in the card stack, front first. */
export const getRisks = () => wait(byIds(state.stack));

/** Every risk in the demo (home page showcase). */
export const getAllRisks = () => wait(state.risks.map((r) => ({ ...r })));

export const getRisk = (id: string) => wait(riskById(id) ?? null);

export const getTodo = () => wait(byIds(state.todo));

/**
 * Community list, split by what the user has done with each risk:
 * - 'mine': you answered it (from To-do), so its chat shows your answer
 * - 'other': you skipped it, or it was never shown to you ("Explore")
 * Risks still waiting in the card stack or To-do are left out entirely.
 */
export const getCommunities = () =>
  wait(
    state.communities.flatMap((c) => {
      if (state.stack.includes(c.riskId) || state.todo.includes(c.riskId)) return [];
      const answered = state.answers.some((a) => a.riskId === c.riskId && a.authorId === state.me.id);
      return [{ community: { ...c }, risk: riskById(c.riskId)!, section: answered ? ('mine' as const) : ('other' as const) }];
    }),
  );

/**
 * A community chat. `explore`: read-only look at a topic you haven't answered;
 * every answer, like and comment is visible, but nothing can be added.
 */
export async function getTopic(riskId: string, { explore = false } = {}): Promise<Topic | null> {
  const risk = riskById(riskId);
  const community = state.communities.find((c) => c.riskId === riskId);
  if (!risk || !community) return wait(null);
  const mine = state.answers.find((a) => a.riskId === riskId && a.authorId === state.me.id) ?? null;
  const others = state.answers.filter((a) => a.riskId === riskId && a.authorId !== state.me.id);
  return wait({
    risk,
    community,
    mine,
    // Independence first: nothing about other answers leaves the server until you
    // answer, except in Explore (read-only) and once the chat has ended.
    others: mine || explore || community.endsAt <= Date.now() ? others.map((a) => ({ ...a, comments: [...(a.comments ?? [])] })) : [],
    othersCount: others.length,
  });
}

export const getRanking = (): Promise<Ranking & { exposedPeople: number }> => {
  const exposedPeople = byIds(RANKING.assessedRiskIds).reduce((sum, r) => sum + exposureLowerBound(r.exposure), 0);
  // Per country: people in the areas of its crises, from ACAPS exposure bands.
  // "<20,000" style bands only give a ceiling, so those read "up to".
  const countries = RANKING.countries.map((c) => {
    const bands = c.crises ?? [];
    const floor = bands.reduce((n, x) => n + (x.exposure.startsWith('<') ? 0 : exposureLowerBound(x.exposure)), 0);
    const ceiling = bands.reduce((n, x) => n + exposureLowerBound(x.exposure), 0);
    return { ...c, people: floor > 0 ? { count: floor, upTo: false } : { count: ceiling, upTo: true } };
  });
  return wait({ ...RANKING, countries, exposedPeople });
};

export const getNotifications = () => wait(state.notifications.map((n) => ({ ...n })));

export function newTodoCount(): number {
  return state.newTodo;
}

/** Opening To-do clears its badge. */
export function markTodoSeen(): void {
  if (state.newTodo === 0) return;
  state.newTodo = 0;
  changed();
}

export function unreadNotificationCount(): number {
  return state.notifications.filter((n) => n.unread).length;
}

/** ">500,000" -> 500000, "100,000-250,000" -> 100000 */
export function exposureLowerBound(band: string): number {
  const first = band.match(/[\d,]+/);
  return first ? Number(first[0].replace(/,/g, '')) : 0;
}

/* ---------- writes ---------- */

/** Save personal information. */
export async function updateProfile(
  fields: Partial<Pick<User, 'name' | 'pseudonym' | 'email' | 'country' | 'domain' | 'bio'>>,
): Promise<User> {
  Object.assign(state.me, fields);
  state.me.notifications = { ...state.me.notifications };
  changed();
  return wait({ ...state.me });
}

/** Change password (prototype: checks the form only; nothing is stored). */
export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: 'current' }> {
  if (!current || next.length < 8) return wait({ ok: false, error: 'current' });
  state.me.passwordChanged = new Date().toISOString().slice(0, 10);
  changed();
  return wait({ ok: true });
}

export async function setTwoStep(on: boolean): Promise<void> {
  state.me.twoStep = on;
  changed();
  return wait(undefined);
}

export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  state.me.notifications = { ...prefs };
  changed();
  return wait(undefined);
}

export async function setLanguage(language: LanguageCode): Promise<void> {
  state.me.language = language;
  changed();
  return wait(undefined);
}

export async function setIdentity(identity: IdentityMode): Promise<User> {
  state.me.identity = identity;
  changed();
  return wait({ ...state.me });
}

/** Swipe right: keep it for later. */
export async function answerLater(riskId: string): Promise<void> {
  state.stack = state.stack.filter((id) => id !== riskId);
  if (!state.todo.includes(riskId)) {
    state.todo.unshift(riskId);
    state.newTodo += 1;
  }
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

/** An uncovered risk reported by an expert, sent to ACAPS for review (mock: kept in memory). */
export interface CardSuggestion {
  statement: string;
  area: string;
  domain: Family;
  why: string;
}
const suggestions: (CardSuggestion & { sentAt: number })[] = [];

export async function suggestCard(input: CardSuggestion): Promise<void> {
  suggestions.push({
    statement: input.statement.trim(),
    area: input.area.trim(),
    domain: input.domain,
    why: input.why.trim(),
    sentAt: Date.now(),
  });
  return wait(undefined);
}

/** Expert sign-up from the home page (mock: kept in memory, files are not uploaded). */
export interface ExpertRegistration {
  first: string;
  last: string;
  email: string;
  /** One or two */
  domains: Family[];
  /** One or two */
  countries: string[];
  cv: File;
  articles: File[];
}
const registrations: (Omit<ExpertRegistration, 'cv' | 'articles'> & { cv: string; articles: string[]; sentAt: number })[] =
  [];

export async function registerExpert(input: ExpertRegistration): Promise<void> {
  registrations.push({
    first: input.first.trim(),
    last: input.last.trim(),
    email: input.email.trim(),
    domains: input.domains.slice(0, 2),
    countries: input.countries.map((c) => c.trim()).filter(Boolean).slice(0, 2),
    // Only file names are kept in the prototype; a real backend would upload them securely
    cv: input.cv.name,
    articles: input.articles.map((a) => a.name),
    sentAt: Date.now(),
  });
  return wait(undefined);
}

/** Trash a card from To-do. Returns its position so Undo can put it back. */
export async function removeFromTodo(riskId: string): Promise<number> {
  const index = state.todo.indexOf(riskId);
  state.todo = state.todo.filter((id) => id !== riskId);
  changed();
  return wait(index);
}

export async function undoRemoveFromTodo(riskId: string, index: number): Promise<void> {
  if (!state.todo.includes(riskId)) state.todo.splice(Math.max(0, index), 0, riskId);
  changed();
  return wait(undefined);
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
    verdict: input.verdict ?? existing?.verdict ?? null,
    forecast: input.forecast ?? existing?.forecast,
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

/** Take back a one-tap answer from the card stack and put the card back. */
export async function undoAnswer(riskId: string, index: number): Promise<void> {
  const i = state.answers.findIndex((a) => a.riskId === riskId && a.authorId === state.me.id);
  if (i >= 0) {
    state.answers.splice(i, 1);
    const risk = riskById(riskId);
    if (risk) risk.answered = Math.max(0, risk.answered - 1);
  }
  if (!state.stack.includes(riskId)) state.stack.splice(Math.max(0, index), 0, riskId);
  changed();
  return wait(undefined);
}

export async function markNotificationRead(id: string): Promise<AppNotification[]> {
  const n = state.notifications.find((x) => x.id === id);
  if (n) n.unread = false;
  changed();
  return getNotifications();
}

/** Like or unlike an answer (only offered in your own communities). */
export async function toggleLike(answerId: string): Promise<void> {
  const a = state.answers.find((x) => x.id === answerId);
  if (a) {
    a.likedByMe = !a.likedByMe;
    a.likes = Math.max(0, (a.likes ?? 0) + (a.likedByMe ? 1 : -1));
    changed();
  }
  return wait(undefined);
}

/** Reply under an answer (only offered in your own communities). */
export async function addComment(answerId: string, text: string): Promise<void> {
  const a = state.answers.find((x) => x.id === answerId);
  if (a && text.trim()) {
    a.comments = [
      ...(a.comments ?? []),
      {
        id: `${answerId}-c${Date.now()}`,
        authorId: state.me.id,
        displayName: displayNameFor(state.me),
        identity: state.me.identity,
        text: text.trim(),
      },
    ];
    changed();
  }
  return wait(undefined);
}

export async function markCommunityRead(riskId: string): Promise<Community | null> {
  const c = state.communities.find((x) => x.riskId === riskId);
  if (c && c.unread) {
    c.unread = 0;
    changed();
  }
  return wait(c ? { ...c } : null);
}

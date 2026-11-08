import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';

/*
 * The analyst view's state: one object, as in the original page. Change it,
 * then call commit() and every component that uses useAnalyst() re-renders.
 * Nothing is saved: a reload starts fresh (it is a prototype on sample data).
 */

export interface Note {
  id: string;
  key: string;
  kind: 'ai' | 'own' | 'claim' | 'answer' | 'summary' | 'update' | 'trigger' | string;
  risk: string;
  title?: string;
  lines?: string[];
  text?: string;
  why?: string;
  [k: string]: unknown;
}

export interface Decision {
  what: string;
  why: string;
  when: Date;
}

export interface Upload {
  statement: string;
  area: string;
  countries: string[];
  field: string;
  more: string[];
  prob: string;
  impact: string;
  level: string;
  triggers: { title: string; goal: string }[];
  rationale: string;
  opens: string;
  closes: string;
  horizon: string;
  /** the suggested card this upload started from */
  from: string | null;
  err: Record<string, number>;
}

export const TODAY_ISO = '2026-11-07';
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const blankUp = (): Upload => ({
  statement: '',
  area: '',
  countries: [],
  field: '',
  more: [],
  prob: '',
  impact: '',
  level: '',
  triggers: [{ title: '', goal: '' }],
  rationale: '',
  opens: TODAY_ISO,
  closes: addDays(TODAY_ISO, 14),
  horizon: '6',
  from: null,
  err: {},
});

/** Display mode of the analyst view (remembered in this browser) */
export type Mode = 'light' | 'dark';
const MODE_KEY = 'analystMode';
function storedMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'light' || m === 'dark') return m;
  } catch {
    /* storage blocked: use the default */
  }
  return 'dark';
}
export function setMode(m: Mode) {
  S.mode = m;
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* not remembered, still applied */
  }
  commit();
}

/** Custom dashboard: the components on the board, in order, with their width */
export type DashSize = 'sm' | 'md' | 'lg' | 'xl';
export interface DashItem {
  id: string;
  size: DashSize;
}

export interface AnalystState {
  mode: Mode;
  /** null until the dashboard page first loads it (from this browser, or the starter layout) */
  dash: DashItem[] | null;
  pic: { view: 'map' | 'list' | string; level: string | null; worse: boolean; country: string | null };
  lastRisk: string;
  /** right-hand dock on a risk: 'helper' | 'notes' */
  dock: string;
  ai: Record<string, 'reading' | 'shown' | 'added'>;
  aiOrder: string[];
  notes: Note[];
  log: Decision[];
  trig: Record<string, { rate: number; was: number | null; why: string; when: Date }>;
  kept: Record<string, { why: string; when: Date }>;
  follow: Record<string, string[]>;
  ui: {
    goal: Record<string, boolean>;
    review: string | null;
    args: Record<string, boolean>;
    ask: string | null;
    card: { id: string; action: string } | null;
    linkMode: string | null;
    edit: string | null;
    err: Record<string, boolean>;
    renaming: string | null;
    newSubj: string | null;
    subj?: Record<string, boolean>;
    cpAll: string | null;
  };
  expFilter: string;
  links: Record<string, { state: 'confirmed' | 'rejected'; why: string; when: Date }>;
  /** selected link on Connect */
  sel: string;
  ins: Record<string, { state: 'pencil' | 'ink'; why?: string; when?: Date; value?: unknown; text?: string; note?: string; edited?: boolean }>;
  cards: Record<string, { action: string; why: string; when: Date; published?: boolean }>;
  /** text typed into any box, by key, so it survives re-renders */
  drafts: Record<string, string | number>;
  rep: { t: number; playing: boolean; raf: number; hold: number; last: number; timer?: number };
  /** the pencil/ink hint was dismissed */
  hint: boolean;
  track: string;
  fresh: string | null;
  freshLink: string | null;
  /** current tab on a risk */
  tab: string;
  subjects?: { name: Record<string, string>; move: Record<string, string> };
  ap: Record<string, { items: Record<string, 'approve' | 'deny' | undefined>; sent?: Date }>;
  apSel: string | null;
  openSort: string;
  /** Open risks page: which risks ('all' | 'week' | 'slow' | 'local'), cards or table, all cards shown */
  openFilter: string;
  openView: 'cards' | 'table';
  openAll: boolean;
  /** Open risks page: search text */
  openQuery: string;
  up: Upload;
  published: { statement: string; countries: string[]; n: number; closes: string }[];
  xp: { country: string; privacy: string; sort: string; q: string };
  /** border map scale on the risk Situation tab */
  mapK?: number;
}

export const S: AnalystState = {
  mode: storedMode(),
  dash: null,
  pic: { view: 'map', level: null, worse: false, country: null },
  lastRisk: 'R1043',
  dock: 'helper',
  ai: {},
  aiOrder: [],
  notes: [],
  log: [],
  trig: {},
  kept: {},
  follow: {},
  ui: {
    goal: {},
    review: null,
    args: {},
    ask: null,
    card: null,
    linkMode: null,
    edit: null,
    err: {},
    renaming: null,
    newSubj: null,
    cpAll: null,
  },
  expFilter: 'all',
  links: {},
  sel: 'L1',
  ins: {},
  cards: {},
  drafts: {},
  rep: { t: 171, playing: false, raf: 0, hold: 0, last: 0 },
  hint: false,
  track: 'High',
  fresh: null,
  freshLink: null,
  tab: 'situation',
  ap: {},
  apSel: null,
  openSort: 'closes',
  openFilter: 'all',
  openView: 'cards',
  openAll: false,
  openQuery: '',
  up: blankUp(),
  published: [],
  xp: { country: '', privacy: 'all', sort: 'rank', q: '' },
};

/* ---------- subscription ---------- */
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Re-render everything that reads the state (call after changing S). */
export function commit() {
  version++;
  listeners.forEach((l) => l());
}

/** The state; the component re-renders on every commit(). */
export function useAnalyst(): AnalystState {
  useSyncExternalStore(subscribe, () => version);
  return S;
}

/* ---------- id counter for notes ---------- */
let seq = 0;
export const nextId = () => ++seq;

/* ---------- "ink" flash on something just confirmed ---------- */
export function inkNow(id: string) {
  S.fresh = id;
  setTimeout(() => {
    if (S.fresh === id) {
      S.fresh = null;
      commit();
    }
  }, 750);
}
export const freshCls = (id: string) => (S.fresh === id ? ' inked-now' : '');

/* ---------- overlays: toast, popover, dialogs ---------- */

export interface PopState {
  /** element the popover points at */
  anchor: HTMLElement;
  content: ReactNode;
  label?: string;
}

export interface ReasonRequest {
  title: string;
  ok?: string;
  quick?: string[];
  done: (why: string) => void;
}

export type DialogName = 'drawer' | 'report' | 'acct' | 'real';

export const overlay: {
  toast: { msg: string; id: number } | null;
  pop: PopState | null;
  dialog: { name: DialogName; id?: string; scrollTo?: string } | null;
} = { toast: null, pop: null, dialog: null };

let toastTimer = 0;
/** "Logged: …" at the bottom, with a link to the decision log. */
export function toast(msg: string) {
  overlay.toast = { msg, id: Date.now() };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    overlay.toast = null;
    commit();
  }, 4200);
  commit();
}

/** Record a decision (with the reason) in the log, and say so. */
export function decide(what: string, why: string, toastIt = true) {
  S.log.unshift({ what, why, when: new Date() });
  if (toastIt) toast(what);
  else commit();
}

export function openPop(anchor: HTMLElement, content: ReactNode, label?: string) {
  overlay.pop = { anchor, content, label };
  commit();
}
export function closePop(back = false) {
  const from = overlay.pop?.anchor;
  if (!overlay.pop) return;
  overlay.pop = null;
  reason.req = null;
  commit();
  if (back && from && from.isConnected) from.focus({ preventScroll: true });
}

/**
 * Ask why before a decision: a small form next to `anchor` with ready-made
 * reasons. `done(why)` runs once a reason is given. (Rendered by <ReasonForm>.)
 */
export const reason: { req: ReasonRequest | null } = { req: null };
export function askReason(anchor: HTMLElement, req: ReasonRequest) {
  reason.req = req;
  overlay.pop = { anchor, content: null, label: req.title };
  commit();
}

export function openDialog(name: DialogName, opts: { id?: string; scrollTo?: string } = {}) {
  overlay.dialog = { name, ...opts };
  overlay.toast = null;
  commit();
}
export function closeDialog() {
  overlay.dialog = null;
  commit();
}

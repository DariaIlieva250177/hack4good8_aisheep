import { DATA, MONTHS, R, WATCH_KEY, calm } from '../../data';
import { S } from '../../store';
import { go, riskHref } from '../../nav';
import type { Answer, Claim, Risk, Trigger } from '../../types';

/* Small helpers shared by the risk workspace's tabs (ported from the original page). */

/** Events on the border map that come from this risk's ACAPS updates */
export const riskEvents = (id: string) => DATA.events.filter((e) => DATA.cites[e.cite].risk === id);

/** The risk on screen (or the last one opened) */
export const curRisk = (): Risk => R[S.lastRisk];

/** A trigger's review by the analyst (if any) and the rate to show */
export function trigState(r: Risk, t: Trigger) {
  const rev = S.trig[WATCH_KEY(r.id, t.id)];
  return { rev, rate: rev ? rev.rate : t.rate };
}

/* ---------- triggers ---------- */
/** Triggers set before the August strikes (flagged on the AI risk) */
export const FLAG: Record<string, number> = { T0618: 1, T0619: 1 };
/** Triggers each replay event speaks to */
export const RELATED: Record<string, string[]> = { default: ['T0618'], e5: ['T0618', 'T0619'], e6: ['T0618', 'T0619'] };

/** Scroll to a trigger on the Situation tab and mark it */
export function focusTrig(id: string) {
  const n = document.getElementById('trig-' + id);
  if (!n) return;
  n.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
  n.classList.add('related');
  const b = n.querySelector('button');
  if (b) b.focus({ preventScroll: true });
}
/** A trigger link: go to the Situation tab first if needed */
export function goTrig(id: string) {
  const r = curRisk();
  if (S.tab !== 'situation') {
    go(riskHref(r.id, 'situation'));
    setTimeout(() => focusTrig(id), 60);
    return;
  }
  focusTrig(id);
}

/* ---------- replay ---------- */
export const DAY = 864e5;
export const R0 = Date.UTC(2026, 4, 20);
export const R1 = Date.UTC(2026, 10, 7);
export const SPAN = Math.round((R1 - R0) / DAY);
export const dayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - R0) / DAY);
};
export const dateOf = (n: number): [string, number] => {
  const t = new Date(R0 + Math.round(n) * DAY);
  return [`${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`, t.getUTCFullYear()];
};
export const railX = (n: number) => `calc(9px + (100% - 18px) * ${(n / SPAN).toFixed(4)})`;
export const KIND: Record<string, string> = { attack: 'Attack', people: 'People moving', quiet: 'Quiet period' };

/* ---------- experts ---------- */
export const LEVEL_WORDS = ['Very unlikely', 'Unlikely', 'Even chance', 'Likely', 'Very likely'];
export const PROB_ORDER = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
export const STEP_WORDS = ['Very unlikely', 'Unlikely', 'Even chance', 'Likely', 'Very likely'];
export const EXP_FILTERS = (r: Risk): [string, string, (a: Answer) => boolean][] => [
  ['all', 'All', () => true],
  ['local', `${r.country} experts`, (a) => a.local],
  ['changed', 'Changed mind', (a) => a.changed],
];

/** Which subjects are open (by "risk:subject", "all:risk", "sum:risk") */
export const SJ = () => (S.ui.subj = S.ui.subj || {});
/** Subjects renamed by the analyst, and claims moved to another subject */
export const SUBJ = () => (S.subjects = S.subjects || { name: {}, move: {} });
export const themeOf = (g: Claim) => SUBJ().move[g.id] || g.theme;
export const subjName = (rid: string, th: string) => SUBJ().name[`${rid}:${th}`] || th;

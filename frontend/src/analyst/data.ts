import raw from './data/analyst-data.json';
import type { AnalystData, Claim, Expert } from './types';

/*
 * The analyst view's data and the small helpers every view shares
 * (ported from the "basics" section of the original page).
 */

export const DATA = raw as unknown as AnalystData;
export const R = DATA.risks;
export const CL = DATA.claims;

/* ---------- formatting ---------- */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const plural = (n: number, w: string, ws?: string) => `${n} ${n === 1 ? w : ws || w + 's'}`;
/** "2026-11-07" -> "7 Nov 2026" */
export const fmtISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
/** A Date -> "7 Nov 2026, 14:05" */
export const fmtWhen = (t: Date) =>
  `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}, ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
/** "dd/mm/yyyy" -> "yyyymmdd" (sortable) */
export const dateKey = (ddmmyyyy: string) => ddmmyyyy.slice(6) + ddmmyyyy.slice(3, 5) + ddmmyyyy.slice(0, 2);
/** True when the person asked for less motion */
export const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- citations in text: "…{key}…" ---------- */
export const markers = (t: string) => [...String(t).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
export const strip = (t: string) => String(t).replace(/\{\w+\}/g, '').trim();

/* ---------- claims and answers ---------- */
export const AI_RISK = 'R1043';
export const claimsOn = (rid: string) => CL.filter((g) => g.risk === rid);
export const claimById = (id: string) => CL.find((g) => g.id === id)!;
export const hasWritten = (rid: string) => DATA.written.includes(rid);
export const strongest = (g: Claim) => g.answers.map((id) => DATA.answers[id]).sort((a, b) => b.weight - a.weight)[0];
export const claimWeight = (g: Claim) => strongest(g).weight;
export const byStrength = (a: Claim, b: Claim) =>
  claimWeight(b) - claimWeight(a) ||
  b.answers.length - a.answers.length ||
  (a.side === 'challenge' ? -1 : b.side === 'challenge' ? 1 : 0);
export const localChallenge = (rid: string) =>
  claimsOn(rid).some((g) => g.side === 'challenge' && g.answers.some((id) => DATA.answers[id].local));
/** "No change" -> "no change" (for mid-sentence use) */
export const rk = (s: string | null | undefined) => (s && s.startsWith('No ') ? 'n' + s.slice(1) : s);
export const topClaim = (rid: string) => {
  const gs = claimsOn(rid).sort(byStrength);
  return gs.find((g) => g.side === 'challenge') || gs[0];
};
export const keepTitle = (id: string) => (id.startsWith('sum:') ? `What the experts say on ${id.slice(4)}` : claimById(id).title);

/* ---------- links between risks ---------- */
export const NEED = DATA.links
  .filter((l) => DATA.insight.risks.includes(l.from) && DATA.insight.risks.includes(l.to))
  .map((l) => l.id);
export const linkOf = (id: string) => DATA.links.find((l) => l.id === id)!;
export const WATCH_KEY = (r: string, t: string) => `${r}:${t}`;

/** Ready-made reasons offered under every "why" box */
export const QUICK = {
  confirm: ['Checked against the quotes', 'Matches my reading of the sources'],
  dismiss: ['Not useful for this report', 'Already covered in my notes'],
  back: ['Needs another look', 'Sources have changed'],
  reject: ['Shared word only, no mechanism', 'Evidence too thin'],
  keep: ['The answers do make this argument', 'Useful split for the analysis'],
};

/* ---------- experts ---------- */
export const EXP: Record<string, Expert> = Object.fromEntries(DATA.experts.map((e) => [e.id, e]));
export const LEVELS: [string, string][] = [
  ['known_to_acaps', 'Known to ACAPS'],
  ['verified_anonymous', 'Verified anonymous'],
  ['verified_deleted', 'Verified, then deleted'],
];
export const PRIV = (p: string) => (LEVELS.find(([k]) => k === p) || [p, p])[1];

/* ---------- maps ---------- */
/** Centroid of the largest ring of an SVG path made of M/L/Z commands */
export function mainCentroid(d: string): [number, number] {
  let best: [number, number] | null = null;
  let top = -1;
  for (const sub of d.split('M').filter(Boolean)) {
    const pts = sub
      .replace(/Z/g, '')
      .split('L')
      .filter(Boolean)
      .map((p) => p.split(',').map(Number) as [number, number]);
    let a = 0;
    let cx = 0;
    let cy = 0;
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    });
    a /= 2;
    if (Math.abs(a) > top) {
      top = Math.abs(a);
      best = a ? [cx / (6 * a), cy / (6 * a)] : pts[0];
    }
  }
  return best ?? [0, 0];
}
export const atlasName = (n: string) => DATA.atlas[n] || n;
export const atlasBack: Record<string, string> = Object.fromEntries(Object.entries(DATA.atlas).map(([a, b]) => [b, a]));
export const WORLD_SHAPES = Object.fromEntries(DATA.maps.world.shapes.map((s) => [s.name, s]));
/** Label offsets on the world map: dx, dy in px, text anchor */
export const WORLD_LABEL: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  Sudan: [0, -17, 'middle'],
  Chad: [0, -17, 'middle'],
  Niger: [0, -17, 'middle'],
  Mali: [0, -17, 'middle'],
  Nigeria: [-15, 5, 'end'],
  Cameroon: [-26, 25, 'middle'],
  'South Sudan': [4, 26, 'end'],
  Ethiopia: [15, 5, 'start'],
  Kenya: [15, 5, 'start'],
  Yemen: [15, 5, 'start'],
  Palestine: [-15, 5, 'end'],
  Syria: [15, 0, 'start'],
  Afghanistan: [15, 5, 'start'],
  Myanmar: [15, 5, 'start'],
  Philippines: [15, 5, 'start'],
  Indonesia: [0, 25, 'middle'],
  Mozambique: [-15, 5, 'end'],
  Madagascar: [15, 5, 'start'],
  Colombia: [15, 5, 'start'],
};
export const WORLD_NUDGE: Record<string, [number, number]> = { Palestine: [-6, 4], Syria: [3, -3] };

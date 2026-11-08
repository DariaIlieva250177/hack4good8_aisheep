import { DATA } from '../data';
import type { OpenRisk } from '../types';

/* Shared by Open risks and the custom dashboard. */

/** Is voting picking up or slowing down? (last 3 days against the days before) */
export function trend(r: OpenRisk) {
  const d = r.daily || [];
  const before = d.slice(0, -3);
  const recent = r.last3 / 3;
  const avg = before.length ? before.reduce((x, y) => x + y, 0) / before.length : null;
  if (!r.last3) return { word: 'No votes lately', cls: 'down' };
  if (avg == null || d.length <= 4) return { word: 'Just opened', cls: '' };
  if (recent <= avg * 0.5) return { word: 'Slowing down', cls: 'down' };
  if (recent >= avg * 1.25) return { word: 'Picking up', cls: 'up' };
  return { word: 'Steady', cls: '' };
}

/* ---------- which risks: the chips above the cards ---------- */
export const closingThisWeek = (r: OpenRisk) => r.closes_iso <= DATA.weekEnd;
export const slowing = (r: OpenRisk) => trend(r).cls === 'down';
export const noCountryExpert = (r: OpenRisk) => !r.local;


import { useEffect, useRef } from 'react';
import { DATA, NEED } from '../data';
import { S } from '../store';

/*
 * Shared by Connect, Insight and the report notes: the insight's sections
 * and how many of the links it needs are confirmed.
 */

export const I = DATA.insight;

export interface Section {
  k: string;
  h: string;
  base?: () => string;
  /** a person fills it in (no draft text) */
  fill?: boolean;
  /** a list: editing adds a note under it */
  list?: boolean;
  /** stays in pencil, never in the notes */
  never?: boolean;
}

export const SECTIONS: Section[] = [
  { k: 'judgement', h: 'Judgement', base: () => I.judgement + I.judgement_cites.map((c) => `{${c}}`).join('') },
  { k: 'why', h: 'Why it matters', base: () => I.why.join('\n') },
  { k: 'experts', h: 'What experts add', base: () => I.experts.join('\n') },
  { k: 'who', h: 'Who is affected', base: () => I.who },
  { k: 'fails', h: 'What fails', base: () => I.fails },
  { k: 'when', h: 'By when', fill: true },
  { k: 'prepare', h: 'What to prepare', base: () => I.prepare },
  { k: 'actors', h: 'Actors', list: true },
  { k: 'geo', h: 'Geopolitics and season', fill: true },
  { k: 'against', h: "What doesn't fit", list: true },
  { k: 'pushback', h: 'Where experts push back', base: () => I.pushback.join('\n') },
  { k: 'watch', h: 'What would change this', list: true },
  { k: 'confidence', h: 'Confidence', base: () => `${I.confidence}. ${I.confidence_why}` },
  { k: 'gaps', h: 'Gaps', never: true },
];
export const CONFIRMABLE = SECTIONS.filter((s) => !s.never);

export type SectionState = AnalystIns[string];
type AnalystIns = typeof S.ins;

export const sectionText = (s: Section, st: SectionState | undefined) =>
  st && st.text != null ? st.text : (s.base?.() ?? '');

export const isInk = (k: string) => S.ins[k]?.state === 'ink';
export const insightDone = () => CONFIRMABLE.filter((s) => isInk(s.k)).length;

/** How many of the links the insight needs are confirmed */
export const needDone = () => NEED.filter((id) => S.links[id]?.state === 'confirmed').length;

/** "By when" and "Geopolitics and season" keep what the person typed in `value` */
export interface GeoValue {
  geo: string;
  season: string;
}

/**
 * Run something (focus a box, scroll) once the next render is on screen,
 * like the original did after repainting.
 */
export function useAfterPaint() {
  const job = useRef<(() => void) | null>(null);
  useEffect(() => {
    const f = job.current;
    if (!f) return;
    job.current = null;
    f();
  });
  return (f: () => void) => {
    job.current = f;
  };
}

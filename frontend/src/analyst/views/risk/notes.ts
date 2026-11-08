import { DATA, R } from '../../data';
import { S, commit, nextId } from '../../store';
import type { Risk, SourceLink } from '../../types';

/* Notes saved from a risk: quotes, updates, sentences, answers, AI drafts, own notes. */

export const ANALYSIS: [keyof Pick<Risk, 'rationale' | 'vulnerability' | 'impactText'>, string][] = [
  ['rationale', 'Rationale'],
  ['vulnerability', 'Vulnerability and coping'],
  ['impactText', 'Expected impact'],
];

/** A saved quote/answer keeps where it came from */
export type NoteSrc = { label: string; links: SourceLink[] };

/** A quote, update, sentence or answer saved to the notes */
export type SavedItem = { key: string; kind: string; risk: string; title: string; text: string; src: NoteSrc };

/** What a save key ("cite:…", "upd:R:i", "sent:R:k:i", "ans:…") puts in the notes */
export function resolveSave(key: string): SavedItem | null {
  const [type, a, b, c] = key.split(':');
  if (type === 'cite') {
    const x = DATA.cites[a];
    return { key, kind: 'quote', risk: x.risk, title: 'ACAPS quote', text: x.quote, src: { label: x.label, links: x.links } };
  }
  if (type === 'upd') {
    const u = R[a].updates[+b];
    return {
      key,
      kind: 'quote',
      risk: a,
      title: 'ACAPS update',
      text: u.text,
      src: { label: `ACAPS update, ${u.label}`, links: u.links.slice(0, 4) },
    };
  }
  if (type === 'sent') {
    const h = ANALYSIS.find((x) => x[0] === b)![1];
    return {
      key,
      kind: 'quote',
      risk: a,
      title: `ACAPS analysis, ${h}`,
      text: R[a][b as (typeof ANALYSIS)[number][0]][+c],
      src: { label: `ACAPS analysis, ${h}`, links: [] },
    };
  }
  if (type === 'ans') {
    const x = DATA.answers[a];
    return { key, kind: 'answer', risk: x.risk, title: `${x.by}, sample answer`, text: x.text, src: { label: 'Sample expert answer', links: [] } };
  }
  return null;
}

export const isSaved = (key: string) => S.notes.some((n) => n.key === key);

/** Save to notes, or take it out again */
export function toggleSave(key: string) {
  if (isSaved(key)) S.notes = S.notes.filter((n) => n.key !== key);
  else {
    const n = resolveSave(key);
    if (n) S.notes.push({ id: 'n' + nextId(), ...n });
  }
  commit();
}

export function dropNote(id: string) {
  const n = S.notes.find((x) => x.id === id);
  S.notes = S.notes.filter((x) => x !== n);
  if (n && n.kind === 'ai') {
    const k = n.key.slice(3);
    delete S.ai[k];
    S.aiOrder = S.aiOrder.filter((x) => x !== k);
  }
  commit();
}

/** Add the analyst's own note on risk `rid` */
export function addOwn(rid: string) {
  const v = String(S.drafts.own || '').trim();
  S.ui.err.own = !v;
  if (v) {
    const seq = nextId();
    S.notes.push({ id: 'n' + seq, key: 'own:' + seq, kind: 'own', risk: rid, text: v });
    S.drafts.own = '';
  }
  commit();
}

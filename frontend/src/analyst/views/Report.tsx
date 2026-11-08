import { useState } from 'react';
import { DATA, R, WATCH_KEY, claimById, claimsOn, markers, plural, strip } from '../data';
import type { SourceLink } from '../types';
import { S, useAnalyst } from '../store';
import { CloseBtn } from '../ui';
import { I, SECTIONS, sectionText } from './cx-sections';
import type { GeoValue } from './cx-sections';

/*
 * Report notes: everything in ink (saved quotes, accepted AI drafts, kept
 * claims, reviewed triggers, confirmed links and insight sections), with
 * numbered sources. Lines that draw on experts wait until the chat closes.
 */

const EXPERT_RX = /\b(experts?|written answers?|writers?|repl(?:y|ies)|answers?)\b/i;
const expertLine = (t: string) =>
  EXPERT_RX.test(strip(t)) || markers(t).some((k) => /^Sample expert/.test(DATA.cites[k].label));

interface Foot {
  label: string;
  quote: string;
  links: SourceLink[];
}
interface Item {
  label: string;
  text: string;
  nums: number[];
}
interface Block {
  h: string;
  items: Item[];
}
/** Where a saved quote or answer came from (set when the note is saved) */
interface NoteSrc {
  label: string;
  links: SourceLink[];
}

function insightReportLines() {
  const out: { h: string; paras: string[] }[] = [];
  for (const s of SECTIONS) {
    const st = S.ins[s.k];
    if (!st || st.state !== 'ink' || s.never) continue;
    let paras: string[] = [];
    if (s.k === 'when') paras = [String(st.value)];
    else if (s.k === 'geo') {
      const v = st.value as GeoValue;
      paras = [v.geo && `Geopolitics: ${v.geo}`, v.season && `Season: ${v.season}`].filter(Boolean);
    } else if (s.k === 'actors') paras = [I.actors.map((a) => `${a.name}{${a.cite}}`).join('; ')];
    else if (s.k === 'against') paras = I.against.map((k) => `"${DATA.cites[k].quote}"{${k}}`);
    else if (s.k === 'watch')
      paras = I.watch.map(([rid, tid]) => {
        const t = R[rid].triggers.find((x) => x.id === tid)!;
        const v = S.trig[WATCH_KEY(rid, tid)];
        return `${rid} ${tid}, ${t.title}: ${v ? v.rate : t.rate}% complete, last updated ${t.last}`;
      });
    else paras = sectionText(s, st).split('\n');
    if (st.note) paras.push(st.note);
    out.push({ h: s.h, paras });
  }
  return out;
}

function buildReport() {
  const foot: Foot[] = [];
  const idx: Record<string, number> = {};
  const blocks: Block[] = [];
  const open = new Set<string>();
  let held = 0;
  const fnKey = (id: string, make: () => Foot) => {
    if (!(id in idx)) {
      foot.push(make());
      idx[id] = foot.length;
    }
    return idx[id];
  };
  const fnCite = (k: string) =>
    fnKey('c:' + k, () => {
      const c = DATA.cites[k];
      return { label: c.label.replace(/^(Sample expert (?:answer|reply)).*$/, '$1'), quote: c.quote, links: c.links };
    });
  const para = (t: string) => ({
    text: strip(t).replace(/\s+([.,;])/g, '$1'),
    nums: [...new Set(markers(t).map(fnCite))],
  });
  const touch = (rid: string) => {
    if (rid && R[rid] && R[rid].closes) open.add(rid);
  };

  const ins = insightReportLines();
  if (ins.length) {
    blocks.push({
      h: 'Insight',
      items: ins.flatMap((s) => s.paras.map((p, i) => ({ ...para(p), label: i ? '' : s.h }))),
    });
    DATA.insight.risks.forEach(touch);
  }
  const inked = DATA.links.filter((l) => S.links[l.id] && S.links[l.id].state === 'confirmed');
  if (inked.length) {
    blocks.push({
      h: 'Confirmed links',
      items: inked.map((l) => {
        touch(l.from);
        touch(l.to);
        return { label: l.name, ...para(l.why + l.cites.map((k) => `{${k}}`).join('')) };
      }),
    });
  }
  const rids = [
    ...new Set(
      [
        ...S.notes.map((n) => n.risk),
        ...Object.keys(S.kept).map((k) => (k.startsWith('sum:') ? k.slice(4) : (claimById(k) || {}).risk)),
        ...Object.keys(S.trig).map((k) => k.split(':')[0]),
      ].filter(Boolean),
    ),
  ];
  for (const rid of rids) {
    const items: Item[] = [];
    for (const n of S.notes.filter((x) => x.risk === rid)) {
      const src = n.src as NoteSrc | undefined;
      if (n.kind === 'own') {
        items.push({ label: 'Your note', text: n.text ?? '', nums: [] });
      } else if (n.kind === 'ai') {
        const lines = (n.lines ?? []).filter((l) => {
          if (expertLine(l)) {
            held++;
            return false;
          }
          return true;
        });
        lines.forEach((l, i) => items.push({ label: i || EXPERT_RX.test(n.title ?? '') ? '' : (n.title ?? ''), ...para(l) }));
      } else if (n.kind === 'answer') {
        const f = fnKey('a:' + n.key, () => ({ label: src?.label ?? '', quote: '', links: [] }));
        items.push({ label: 'Expert view', text: `"${n.text}"`, nums: [f] });
      } else {
        const f = n.key.startsWith('cite:')
          ? fnCite(n.key.slice(5))
          : fnKey('s:' + n.key, () => ({ label: src?.label ?? '', quote: '', links: src?.links ?? [] }));
        items.push({ label: '', text: n.text ?? '', nums: [f] });
      }
    }
    if (S.kept['sum:' + rid])
      for (const l of DATA.summaries[rid] || []) {
        if (expertLine(l)) held++;
        else items.push({ label: '', ...para(l) });
      }
    for (const g of claimsOn(rid))
      if (S.kept[g.id]) {
        const f = fnKey('g:' + rid, () => ({ label: `Sample expert answers on ${rid}`, quote: '', links: [] }));
        items.push({
          label: g.side === 'challenge' ? 'Claim against ACAPS' : 'Claim',
          text: '“' + g.quote + '”',
          nums: [f],
        });
      }
    for (const t of R[rid].triggers) {
      const v = S.trig[WATCH_KEY(rid, t.id)];
      if (!v) continue;
      const ck = t.id.toLowerCase();
      const f = DATA.cites[ck]
        ? fnCite(ck)
        : fnKey('t:' + t.id, () => ({ label: `ACAPS trigger ${t.id}, last updated ${t.last}`, quote: t.title, links: [] }));
      items.push({ label: `Trigger ${t.id}`, text: `${t.title}: reviewed to ${v.rate}% complete. ${v.why}`, nums: [f] });
    }
    if (items.length) {
      touch(rid);
      blocks.push({ h: `${rid}, ${R[rid].country}`, items });
    }
  }
  const own = S.notes.filter((n) => n.kind === 'own' && !n.risk);
  if (own.length) blocks.push({ h: 'Your notes', items: own.map((n) => ({ label: '', text: n.text ?? '', nums: [] })) });
  return { blocks, foot, held, open: [...open] };
}

/** The notes as plain text, for the clipboard */
function reportText() {
  const { blocks, foot } = buildReport();
  const lines = ['Report notes', ''];
  for (const b of blocks) {
    lines.push(b.h);
    for (const i of b.items) lines.push(`${i.label ? i.label + '. ' : ''}${i.text}${i.nums.map((n) => ` [${n}]`).join('')}`);
    lines.push('');
  }
  if (foot.length) {
    lines.push('Sources');
    foot.forEach((f, i) =>
      lines.push(
        `${i + 1}. ${f.label}.${f.quote ? ` "${f.quote}"` : ''}${f.links.length ? ' ' + f.links.map((l) => `${l.label} ${l.url}`).join(', ') : ''}`,
      ),
    );
  }
  return lines.join('\n');
}

export function ReportDialog() {
  useAnalyst();
  const [copied, setCopied] = useState('');
  const { blocks, foot, held, open } = buildReport();

  const copyReport = async () => {
    const text = reportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.getElementById('report')?.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      setCopied(ok ? 'Copied' : 'Could not reach the clipboard. Select the text and copy it.');
    }
  };

  const banner = open.length ? (
    <div className="banner">
      <span>
        Chat still open on {open.map((id) => `${id} until ${R[id].closes}`).join(', ')}. Expert counts and names stay out of
        these notes.
        {held
          ? ` ${plural(held, 'line')} that draw on experts ${held === 1 ? 'is' : 'are'} left out until the chat closes.`
          : ''}
      </span>
    </div>
  ) : null;

  return (
    <>
      <div className="dlg-head">
        <h2>Report notes</h2>
        <CloseBtn />
      </div>
      <div className="dlg-body" id="repBody">
        {blocks.length ? (
          <>
            {banner}
            {blocks.map((b) => (
              <section key={b.h} className="rep-sec">
                <h3>{b.h}</h3>
                {b.items.map((i, n) => (
                  <p key={n}>
                    {i.label && (
                      <>
                        <b style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 15 }}>{i.label}.</b>{' '}
                      </>
                    )}
                    {i.text}
                    {i.nums.length > 0 && <sup>{i.nums.join(', ')}</sup>}
                  </p>
                ))}
              </section>
            ))}
            {foot.length > 0 && (
              <section className="fn">
                <h3>Sources</h3>
                <ol>
                  {foot.map((f, i) => (
                    <li key={i}>
                      <span>{i + 1}.</span>
                      <span>
                        {f.label}.
                        {f.quote && (
                          <>
                            {' '}
                            <q>{f.quote}</q>
                          </>
                        )}{' '}
                        {f.links.map((l, j) => (
                          <a key={j} href={l.url} target="_blank" rel="noopener">
                            {l.label}
                          </a>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        ) : (
          <>
            {held ? banner : null}
            <p className="muted">
              Nothing is inked yet. Save a quote, add an AI draft to your notes or confirm a link or an insight section, then
              come back.
            </p>
          </>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-ink" onClick={copyReport} disabled={!blocks.length}>
          Copy
        </button>
        <span className="small muted" id="copied" role="status">
          {copied}
        </span>
      </div>
    </>
  );
}

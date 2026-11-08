import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { DATA, NEED, QUICK, R, byStrength, claimsOn, fmtWhen, plural, strongest } from '../data';
import type { Link as RiskLink } from '../types';
import { S, askReason, commit, decide, freshCls, inkNow, openPop, useAnalyst } from '../store';
import { Cited, TagI, TagP, newNums } from '../ui';
import { needDone, useAfterPaint } from './cx-sections';

/*
 * Connect: the Sudan map with each risk pinned, curved lines for the
 * possible links between them, and the list of links to confirm or reject.
 */

const BEND: Record<string, number> = { L1: -1, L2: -0.8, L3: 1.2, L4: 1.3, L5: 1 };
const LABEL_C: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  R1053: [-13, -11, 'end'],
  R1054: [-13, -9, 'end'],
  R1049: [13, -7, 'start'],
  R1051: [-6, 25, 'middle'],
  R1048: [13, 5, 'start'],
  R1052: [13, 5, 'start'],
  R1055: [8, 26, 'middle'],
  R1043: [-14, 6, 'end'],
};
/* short arcs: keep the name clear of the pins */
const TAG_SHIFT: Record<string, [number, number]> = { L1: [30, 44], L3: [0, -30], L4: [34, -36], L5: [78, 62] };
const NAMES: [string, number, number][] = [
  ['SUDAN', 468, 262],
  ['CHAD', 92, 230],
  ['EGYPT', 470, 42],
  ['LIBYA', 180, 62],
  ['SOUTH SUDAN', 438, 512],
  ['ETHIOPIA', 700, 518],
];
const STROKE: Record<string, number> = { Strong: 3, Possible: 2.4, Weak: 1.8 };

function arc(a: [number, number], b: [number, number], bend: number) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  const k = bend * Math.max(0.2 * d, 30);
  const cx = mx - (dy / d) * k;
  const cy = my + (dx / d) * k;
  return {
    d: `M${x1} ${y1}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`,
    mid: [(x1 + 2 * cx + x2) / 4, (y1 + 2 * cy + y2) / 4] as [number, number],
  };
}
const pinXY = (rid: string) => DATA.maps.sudan.places![DATA.connect[rid].place];
const linkState = (id: string) => S.links[id]?.state;

function sameOn(l: RiskLink) {
  const b = claimsOn(l.to);
  return claimsOn(l.from)
    .filter((g) => g.shared && b.some((x) => x.shared === g.shared))
    .map((g) => [g, b.find((x) => x.shared === g.shared)!] as const);
}

/** The risk's pin: what it is, and a way into its workspace */
function pinInfo(anchor: Element, id: string) {
  const r = R[id];
  openPop(
    anchor as HTMLElement,
    <>
      <h3>{DATA.connect[id].name}</h3>
      <p className="serif">{r.title}</p>
      <p className="src">
        {id} · Probability {r.probability} ({r.band}) · Impact {r.impact} of 5 · {r.level} risk
      </p>
      <div className="links">
        <Link to={`/risk/${id}`}>Open workspace</Link>
      </div>
    </>,
  );
}

function selLink(id: string) {
  S.sel = id;
  S.ui.linkMode = null;
  commit();
}

/** The selected link's name in a pill on the map */
function ArcTag({ x, y, name }: { x: number; y: number; name: string }) {
  const ref = useRef<SVGTextElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    const measure = () => setBox(t.getBBox());
    measure();
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
    };
  }, [x, y, name]);
  return (
    <>
      {box && (
        <rect
          className="arc-pill"
          rx={6}
          x={box.x - 7}
          y={box.y - 2}
          width={box.width + 14}
          height={box.height + 4}
        />
      )}
      <text ref={ref} id="arcTag" className="arc-tag" x={x.toFixed(1)} y={y.toFixed(1)} textAnchor="middle">
        {name}
      </text>
    </>
  );
}

function ConnectMap() {
  const m = DATA.maps.sudan;
  const sel = DATA.links.find((l) => l.id === S.sel);
  const selArc = sel && arc(pinXY(sel.from), pinXY(sel.to), BEND[sel.id] || 1);
  const shift = (sel && TAG_SHIFT[sel.id]) || [0, 0];

  return (
    <svg
      id="cmap"
      className="cmap"
      viewBox={`0 0 ${m.width} ${m.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Risks pinned on a map, joined by possible links"
    >
      <rect x="-300" y="-300" width="1500" height="1200" fill="var(--sea)" />
      <g className="c-land">
        {m.shapes
          .filter((s) => s.name !== 'United States of America' && s.name !== 'France')
          .map((s, i) => (
            <path key={i} d={s.d} className={s.name === 'Sudan' ? 'sudan' : undefined} />
          ))}
      </g>
      {/*
        The sea contours, drawn in place rather than with <use href="#contours">: inside a <use>
        the ".av .sea-lines" rule does not match, so the lines would be filled. Same geometry as
        <use x="-260" y="-210" width="1380" height="980">; opacity .18 as ".av .cmap use" sets it.
      */}
      <svg x="-260" y="-210" width="1380" height="980" viewBox="0 0 1000 560" overflow="visible" style={{ opacity: 0.18 }}>
        <g>
          {DATA.maps.contours.map((d, i) => (
            <path key={i} d={d} className="sea-lines" />
          ))}
        </g>
      </svg>
      {NAMES.map(([t, x, y]) => (
        <text key={t} className="c-name" x={x} y={y}>
          {t}
        </text>
      ))}
      {DATA.links.map((l) => {
        const st = linkState(l.id);
        const a = arc(pinXY(l.from), pinXY(l.to), BEND[l.id] || 1);
        const w = STROKE[l.strength];
        const cls = st === 'confirmed' ? 'arc-i' : st === 'rejected' ? 'arc-r' : 'arc-p';
        const drawing = st === 'confirmed' && S.freshLink === l.id;
        return (
          <Fragment key={l.id}>
            {S.sel === l.id && <path className="arc arc-sel" d={a.d} strokeWidth={w + 11} />}
            <path
              className={`arc ${drawing ? 'arc-draw' : cls}`}
              d={a.d}
              strokeWidth={st === 'confirmed' ? w + 0.6 : w}
              pathLength={drawing ? 1 : undefined}
            />
            <path className="arc-hit" d={a.d} data-tip={l.name} tabIndex={-1} onClick={() => selLink(l.id)} />
          </Fragment>
        );
      })}
      {Object.entries(DATA.connect).map(([rid, c]) => {
        const [x, y] = pinXY(rid);
        const r = R[rid];
        const [dx, dy, anc] = LABEL_C[rid] || [13, 5, 'start'];
        const fill = r.level === 'High' ? 'var(--high)' : r.level === 'Medium' ? 'var(--med)' : 'var(--low)';
        return (
          <g
            key={rid}
            className="pin-c"
            data-tip={`${rid}, ${r.level} risk: ${r.title}`}
            tabIndex={0}
            role="button"
            aria-label={`${rid}, ${c.name}, risk level ${r.level}`}
            onClick={(e: MouseEvent<SVGGElement>) => pinInfo(e.currentTarget, rid)}
            onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pinInfo(e.currentTarget, rid);
              }
            }}
          >
            <circle cx={x} cy={y} r="9.5" style={{ fill }} />
            <text x={x + dx} y={y + dy} textAnchor={anc}>
              {c.name}
            </text>
          </g>
        );
      })}
      {sel && selArc && <ArcTag x={selArc.mid[0] + shift[0]} y={selArc.mid[1] + 5 + shift[1]} name={sel.name} />}
    </svg>
  );
}

function LinkRow({ l }: { l: RiskLink }) {
  const st = linkState(l.id);
  const cl = st === 'confirmed' ? 'ink' : st === 'rejected' ? 'rej' : '';
  const a = DATA.connect[l.from];
  const b = DATA.connect[l.to];
  return (
    <button className="lk" aria-pressed={S.sel === l.id} onClick={() => selLink(l.id)}>
      <span className={`lk-line ${cl}`} />
      <span>
        <b>{l.name}</b>
        <small>
          {a.name} to {b.name}
          {sameOn(l).length ? ' · the same point appears on both' : ''}
        </small>
      </span>
      <span className="st">{st === 'confirmed' ? 'Confirmed' : st === 'rejected' ? 'Rejected' : l.strength}</span>
    </button>
  );
}

function LinkEnd({ rid }: { rid: string }) {
  const gs = claimsOn(rid).sort(byStrength);
  if (!gs.length)
    return (
      <p>
        <Link to={`/risk/${rid}`}>{rid}</Link> <span className="muted">No written answers in this demo</span>
      </p>
    );
  const top = gs.find((g) => g.side === 'challenge') || gs[0];
  const a = strongest(top);
  return (
    <p>
      <Link to={`/risk/${rid}/experts`}>{rid}</Link> {top.side === 'challenge' ? 'Pushback' : 'Main point'}: {'“'}
      {top.quote}
      {'”'} <span className="small muted">{a.matchLabel}</span>
    </p>
  );
}

function LinkExperts({ l }: { l: RiskLink }) {
  const same = sameOn(l);
  return (
    <div className="lk-exp">
      <span className="lab">What the experts say</span>
      {same.length ? (
        same.map(([g, o]) => (
          <p key={g.id} className="same">
            <b>Same point on both risks.</b> {'“'}
            {g.quote}
            {'”'} ({g.risk}), and {'“'}
            {o.quote}
            {'”'} ({o.risk}).
          </p>
        ))
      ) : (
        <p className="small muted">No expert point appears on both risks, so this link rests on ACAPS text.</p>
      )}
      <LinkEnd rid={l.from} />
      <LinkEnd rid={l.to} />
    </div>
  );
}

function LinkDetail({ l, after }: { l: RiskLink; after: (f: () => void) => void }) {
  const rec = S.links[l.id];
  const st = rec?.state;
  const mode = S.ui.linkMode;
  const k = 'link:' + l.id;
  const box = useRef<HTMLTextAreaElement>(null);
  const card = useRef<HTMLElement>(null);
  const focusBox = () => box.current?.focus();

  const linkDecide = () => {
    const why = String(S.drafts[k] || '').trim();
    S.ui.err[k] = !why;
    if (!why) {
      after(focusBox);
      commit();
      return;
    }
    const state = mode === 'confirm' ? 'confirmed' : 'rejected';
    S.links[l.id] = { state, why, when: new Date() };
    S.ui.linkMode = null;
    delete S.drafts[k];
    if (state === 'confirmed') {
      S.freshLink = l.id;
      inkNow(k);
    }
    decide(`${state === 'confirmed' ? 'Confirmed' : 'Rejected'} link: ${l.name}`, why);
  };

  const linkMode = (m: string) => {
    S.ui.linkMode = m;
    after(() => {
      box.current?.focus({ preventScroll: true });
      card.current?.scrollIntoView({ block: 'end' });
    });
    commit();
  };

  const linkBack = (anchor: HTMLElement) =>
    askReason(anchor, {
      title: 'Why return this link to pencil?',
      ok: 'Back to pencil',
      quick: QUICK.back,
      done: (why) => {
        delete S.links[l.id];
        decide(`Returned link to pencil: ${l.name}`, why);
      },
    });

  const nums = newNums();
  return (
    <article ref={card} className={`lk-detail ${st === 'confirmed' ? 'ink' : 'pencil'}${freshCls(k)}`}>
      <div className="aicard-top">
        {st === 'confirmed' ? <TagI /> : st === 'rejected' ? <span className="tag tag-i">Rejected</span> : <TagP />}
        <span className="small muted">{l.strength} link</span>
      </div>
      <h3>{l.name}</h3>
      <p className="small muted">
        <Link to={`/risk/${l.from}`}>{l.from}</Link> {DATA.connect[l.from].name} to{' '}
        <Link to={`/risk/${l.to}`}>{l.to}</Link> {DATA.connect[l.to].name}
      </p>
      <p className="why">
        <Cited text={l.why + l.cites.map((x) => `{${x}}`).join('')} nums={nums} />
      </p>
      <LinkExperts l={l} />
      {rec ? (
        <div className="lk-rec">
          <b>
            {st === 'confirmed' ? 'Confirmed' : 'Rejected'} {fmtWhen(rec.when)}.
          </b>{' '}
          Why: {rec.why}
          <div className="row-t">
            <button className="x" onClick={(e) => linkBack(e.currentTarget)}>
              Undo
            </button>
          </div>
        </div>
      ) : mode ? (
        <div className="row-t">
          <label className="lab" htmlFor="lkWhy">
            {mode === 'confirm' ? 'Why does this mechanism hold? Required' : 'Why reject this link? Required'}
          </label>
          <textarea
            id="lkWhy"
            ref={box}
            rows={2}
            value={String(S.drafts[k] ?? '')}
            onChange={(e) => {
              S.drafts[k] = e.target.value;
              commit();
            }}
          />
          <div className="quick">
            {QUICK[mode === 'confirm' ? 'confirm' : 'reject'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  S.drafts[k] = q;
                  S.ui.err[k] = false;
                  after(focusBox);
                  commit();
                }}
              >
                {q}
              </button>
            ))}
          </div>
          {S.ui.err[k] && <p className="err">Add a reason to continue.</p>}
          <div className="row">
            <button className="btn btn-ink" onClick={linkDecide}>
              {mode === 'confirm' ? 'Confirm link' : 'Reject link'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                S.ui.linkMode = null;
                commit();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="row row-t">
          <button className="btn btn-ink" onClick={() => linkMode('confirm')}>
            Confirm
          </button>
          <button className="btn" onClick={() => linkMode('reject')}>
            Reject
          </button>
        </div>
      )}
    </article>
  );
}

export function Connect() {
  useAnalyst();
  const after = useAfterPaint();
  const sel = DATA.links.find((l) => l.id === S.sel);
  const done = needDone();

  // The line of a just-confirmed link draws itself once
  const fresh = S.freshLink;
  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => {
      if (S.freshLink === fresh) {
        S.freshLink = null;
        commit();
      }
    }, 900);
    return () => clearTimeout(t);
  }, [fresh]);

  return (
    <div className="conn">
      <section className="stage" aria-label="Map of Sudan and eastern Chad">
        <ConnectMap />
        <div className="stage-head">
          <h1>Sudan and eastern Chad</h1>
          <p className="sub">
            {plural(Object.keys(DATA.connect).length, 'risk')} on the map · {plural(DATA.links.length, 'possible link')}{' '}
            between them
          </p>
        </div>
        <div className="legend map-key">
          <span className="mk-t">Dot: one risk, coloured by ACAPS level</span>
          <span>
            <i style={{ background: 'var(--high)' }} />
            High
          </span>
          <span>
            <i style={{ background: 'var(--med)' }} />
            Medium
          </span>
          <span className="mk-sep" />
          <span>
            <i className="ln ln-p" />
            Suggested link
          </span>
          <span>
            <i className="ln ln-i" />
            Confirmed
          </span>
          <span>
            <i className="ln ln-r" />
            Rejected
          </span>
          <span className="muted">Thicker line: stronger link. Click a line or a dot.</span>
        </div>
      </section>
      <aside className="side" aria-label="Links">
        <div className="side-body">
          <h2 className="lk-h">Links between risks</h2>
          <div>
            {DATA.links.map((l) => (
              <LinkRow key={l.id} l={l} />
            ))}
          </div>
          {sel && <LinkDetail key={sel.id} l={sel} after={after} />}
        </div>
        <div className="side-foot">
          {done === NEED.length ? (
            <Link className="btn btn-ink btn-wide" to="/insight">
              Draft insight
            </Link>
          ) : (
            <>
              <button className="btn btn-wide" disabled>
                Draft insight
              </button>
              <p className="small muted" style={{ marginTop: 4, textAlign: 'center' }}>
                Confirm the {NEED.length} links joining{' '}
                {DATA.insight.risks.map((id) => DATA.connect[id].name).join(', ')}. {done} of {NEED.length} so far.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

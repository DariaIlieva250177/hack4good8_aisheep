import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as RPointerEvent } from 'react';
import { DATA, MONTHS, calm, fmtISO } from '../../data';
import { S } from '../../store';
import { Icon } from '../../ui';
import type { MapEvent, Risk } from '../../types';
import { SaveBtn } from './bits';
import { KIND, RELATED, SPAN, dateOf, dayOf, goTrig, railX, riskEvents } from './helpers';

const TOWNS: [string, number, number, 'start' | 'end'][] = [
  ['Abéché', -9, -3, 'end'],
  ['Adré', -3, 21, 'end'],
  ['El Geneina', 8, 16, 'start'],
  ['Tiné', -9, 15, 'end'],
  ['Amdjarass', 10, 5, 'start'],
  ['El Fasher', 9, 5, 'start'],
];
const REGIONS: [string, number, number][] = [
  ['Ouaddaï', -35, 8],
  ['Wadi Fira', -21, 5],
  ['Ennedi-Est', -30, 5],
];
const MONTH_TICKS: [string, string][] = [
  ['Jun', '2026-06-01'],
  ['Jul', '2026-07-01'],
  ['Aug', '2026-08-01'],
  ['Sep', '2026-09-01'],
  ['Oct', '2026-10-01'],
  ['Nov', '2026-11-01'],
];
const seenTip = (e: MapEvent) => `${fmtISO(e.date)}: ${e.title}`;

/** Stop the replay (also used when leaving the page) */
function cancelPlay() {
  if (S.rep.raf) cancelAnimationFrame(S.rep.raf);
  clearTimeout(S.rep.timer);
  S.rep.raf = 0;
  S.rep.playing = false;
}

/**
 * The replay of events on the Chad/Sudan border: a map with a pin per event,
 * the event card, and a rail with play/pause and a draggable handle.
 */
export function Replay({ r, onRelated }: { r: Risk; onRelated: (ids: string[]) => void }) {
  const evs = riskEvents(r.id);
  const m = DATA.maps.border;
  const P = m.places!;
  const [t, setT] = useState(S.rep.t);
  const [playing, setPlaying] = useState(false);
  const [k, setK] = useState(S.mapK || 1);
  const svgRef = useRef<SVGSVGElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const setTime = (v: number) => {
    S.rep.t = v;
    setT(v);
  };
  const stopPlay = () => {
    cancelPlay();
    setPlaying(false);
  };
  const startPlay = () => {
    if (Math.round(S.rep.t) >= SPAN) setTime(0);
    S.rep.playing = true;
    setPlaying(true);
    if (calm()) {
      /* reduced motion: step event by event, no sweep */
      const step = () => {
        const next = evs.find((e) => dayOf(e.date) > Math.round(S.rep.t));
        setTime(next ? dayOf(next.date) : SPAN);
        if (next) S.rep.timer = window.setTimeout(step, 1500);
        else stopPlay();
      };
      S.rep.timer = window.setTimeout(step, 400);
      return;
    }
    let prev = performance.now();
    let hold = 0;
    const tick = (now: number) => {
      if (!S.rep.playing) return;
      const dt = now - prev;
      prev = now;
      if (hold > 0) {
        hold -= dt;
        S.rep.raf = requestAnimationFrame(tick);
        return;
      }
      const before = S.rep.t;
      const next = Math.min(SPAN, S.rep.t + dt * 0.021);
      if (
        evs.some((e) => {
          const d = dayOf(e.date);
          return d > before && d <= next;
        })
      )
        hold = 750;
      setTime(next);
      if (next >= SPAN) {
        stopPlay();
        return;
      }
      S.rep.raf = requestAnimationFrame(tick);
    };
    S.rep.raf = requestAnimationFrame(tick);
  };

  // Stop the animation when leaving the tab or the page
  useEffect(() => cancelPlay, []);

  // Pins and labels keep their size on screen however the map is scaled
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const fit = () => {
      const v = Math.max(720 / svg.clientWidth, 524 / svg.clientHeight) || 1;
      S.mapK = v;
      setK(v);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  const day = Math.round(t);
  const cur = evs.filter((e) => dayOf(e.date) <= day).pop() || null;
  const curId = cur?.id ?? null;
  useEffect(() => {
    onRelated(curId ? RELATED[curId] || RELATED.default : []);
  }, [curId, onRelated]);

  const railPointer = (clientX: number) => {
    const box = railRef.current!.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - box.left - 9) / (box.width - 18)));
    stopPlay();
    setTime(Math.round(p * SPAN));
  };
  const onRailDown = (e: RPointerEvent<HTMLDivElement>) => {
    const tgt = e.target as HTMLElement;
    if (tgt.closest('.tk') || tgt.id === 'repRange') return;
    railPointer(e.clientX);
    const move = (ev: PointerEvent) => railPointer(ev.clientX);
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };
  const jump = (e: MapEvent) => {
    stopPlay();
    setTime(dayOf(e.date));
  };

  /* pins: a second event at the same place is moved aside */
  const seen: Record<string, number> = {};
  const pins = evs
    .filter((e) => e.place)
    .map((e) => {
      const n = (seen[e.place] = (seen[e.place] || 0) + 1);
      const [px, py] = P[e.place];
      const o = n > 1 ? (e.kind === 'attack' ? [17, -13] : [-19, 9]) : [0, 0];
      return { e, x: px + o[0], y: py + o[1] };
    });
  const curPin = cur && pins.find((p) => p.e.id === cur.id);

  const lastSet = r.triggers[0] && r.triggers[0].last;
  const setDay = lastSet
    ? (() => {
        const [d, mo, y] = lastSet.split(' ');
        return dayOf(`${y}-${String(MONTHS.indexOf(mo) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`);
      })()
    : null;
  const ex0 = dayOf('2026-10-17');
  const ex1 = dayOf('2026-11-06');
  const [dm, y] = dateOf(day);
  const ks = k.toFixed(3);
  const lab = (px: number, py: number, dx: number, dy: number) => ({
    x: (px + dx * k).toFixed(1),
    y: (py + dy * k).toFixed(1),
  });

  return (
    <div className="replay" aria-label="Replay of events on the border">
      <div className="replay-top">
        <div className="bmap" id="bmap">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${m.width} ${m.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label="Map of the Chad and Sudan border"
            style={{ '--k': ks } as CSSProperties}
          >
            <g className="b-land">
              {m.shapes
                .filter((s) => !['France'].includes(s.name))
                .map((s) => (
                  <path key={s.name} d={s.d} className={s.name === 'Chad' ? 'chad' : 'other'} />
                ))}
            </g>
            <use href="#contours" x="-260" y="-150" width="1240" height="820" opacity=".5" />
            <text className="b-country" x="118" y="208">
              CHAD
            </text>
            <text className="b-country" x="520" y="196">
              SUDAN
            </text>
            {REGIONS.map(([n, dx, dy]) => (
              <text key={n} className="b-region" {...lab(P[n][0], P[n][1], dx, dy)} textAnchor="end">
                {n}
              </text>
            ))}
            {TOWNS.map(([n, dx, dy, a]) => (
              <Fragment key={n}>
                <circle className="b-dot" cx={P[n][0]} cy={P[n][1]} r={(2.8 * k).toFixed(2)} />
                <text className="b-town" {...lab(P[n][0], P[n][1], dx, dy)} textAnchor={a}>
                  {n}
                </text>
              </Fragment>
            ))}
            {pins.map(({ e, x, y }) => {
              const on = dayOf(e.date) <= day;
              const isCur = cur?.id === e.id;
              const cls = ['pin', !on && 'off', isCur && 'cur', on && !isCur && 'past'].filter(Boolean).join(' ');
              return (
                <g
                  key={e.id}
                  className={cls}
                  id={`pin-${e.id}`}
                  transform={`translate(${x} ${y}) scale(${ks})`}
                  tabIndex={on ? 0 : -1}
                  role="button"
                  aria-label={seenTip(e)}
                  data-tip={seenTip(e)}
                  onClick={() => jump(e)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      jump(e);
                    }
                  }}
                >
                  <circle className="now" r={e.approx ? 21 : 17} />
                  {e.approx && <circle className="ring" r="15" />}
                  {e.kind === 'attack' ? <path className="glyph-a" d="M0-10L10 0 0 10-10 0Z" /> : <circle className="glyph-p" r="8.5" />}
                  <circle r="17" fill="transparent" />
                </g>
              );
            })}
            <g id="pinLabel">
              {cur && curPin && (
                <>
                  <text className="pin-label" x={curPin.x + (cur.approx ? 25 : 21) * k} y={curPin.y + (cur.approx ? -1 : 5) * k}>
                    {cur.title}
                  </text>
                  {cur.approx && (
                    <text className="pin-sub" x={curPin.x + 25 * k} y={curPin.y + 15 * k}>
                      Exact place not given
                    </text>
                  )}
                </>
              )}
            </g>
          </svg>
        </div>
        <div className="ev" id="evCard" aria-live="polite">
          <EventCard r={r} e={cur} />
        </div>
      </div>
      <div className="ribbon" id="ribbon">
        <div className="rib-l">
          <button
            type="button"
            className="play"
            id="repPlay"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => (S.rep.playing ? stopPlay() : startPlay())}
          >
            {playing ? Icon.pause : Icon.play}
          </button>
          <div className="rib-date" id="repDate">
            {dm}
            <small>{y}</small>
          </div>
        </div>
        <div className="rail" id="rail" ref={railRef} onPointerDown={onRailDown}>
          <div
            className="r-experts"
            style={{ left: railX(ex0), width: `calc((100% - 18px) * ${((ex1 - ex0) / SPAN).toFixed(4)})` }}
          >
            <span>Experts answering</span>
          </div>
          <div className="r-line" />
          <div className="r-done" id="repDone" style={{ width: `calc((100% - 18px) * ${(day / SPAN).toFixed(4)})` }} />
          {setDay != null && lastSet && (
            <div className="r-set" style={{ left: railX(setDay) }}>
              <span>Triggers set {lastSet.split(' ').slice(0, 2).join(' ')}</span>
            </div>
          )}
          {MONTH_TICKS.map(([l, d]) => (
            <span key={l} className="mth" style={{ left: railX(dayOf(d)) }}>
              {l}
            </span>
          ))}
          {evs.map((e) => {
            const on = dayOf(e.date) <= day;
            return (
              <button
                key={e.id}
                type="button"
                className={`tk tk-${e.kind}${on ? '' : ' ahead'}${cur?.id === e.id ? ' cur' : ''}`}
                id={`tk-${e.id}`}
                style={{ left: railX(dayOf(e.date)) }}
                data-tip={seenTip(e)}
                aria-label={seenTip(e)}
                onClick={() => jump(e)}
              >
                <i />
              </button>
            );
          })}
          <input
            type="range"
            id="repRange"
            min={0}
            max={SPAN}
            step={1}
            value={day}
            aria-label="Replay date"
            aria-valuetext={`${dm} ${y}`}
            onChange={(e) => {
              stopPlay();
              setTime(Number(e.target.value));
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** The card next to the map: the current event, its quote and sources */
function EventCard({ r, e }: { r: Risk; e: MapEvent | null }) {
  if (!e) {
    return (
      <>
        <div className="ev-date">
          <b>Before the first event</b>
        </div>
        <p className="muted">Press Play or drag the handle to bring in events from ACAPS updates.</p>
      </>
    );
  }
  const c = DATA.cites[e.cite];
  const rel = (RELATED[e.id] || RELATED.default).map((id) => r.triggers.find((t) => t.id === id)).filter((t) => !!t);
  return (
    <>
      <div className="ev-date">
        <b>{fmtISO(e.date)}</b>
        <span className="lab">{KIND[e.kind]}</span>
      </div>
      <h3>{e.title}</h3>
      <blockquote>{c.quote}</blockquote>
      <div className="src">
        {c.label}
        <br />
        {c.links.map((l, i) => (
          <a key={i} href={l.url} target="_blank" rel="noopener">
            {l.label}
          </a>
        ))}
      </div>
      <div className="ev-meta">
        {e.approx && (
          <span className="approx">
            <i />
            Exact place not given
          </span>
        )}
        {!e.place && <span className="approx">No place to pin for this event</span>}
        <span className="rel">
          Related
          {rel.map((t) => (
            <button key={t.id} type="button" className="link" data-tip={t.title} onClick={() => goTrig(t.id)}>
              {t.id}
            </button>
          ))}
        </span>
      </div>
      <div className="ev-foot">
        <SaveBtn k={'cite:' + e.cite} label="Save to notes" />
      </div>
    </>
  );
}

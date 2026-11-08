import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { R, plural } from '../data';
import { countryHref } from '../nav';
import { S, commit, useAnalyst } from '../store';
import { LevelChip } from '../ui';
import type { Risk } from '../types';
import { picList, signalOf } from './overview-picture';
import { WorldMap } from './overview-WorldMap';

function picHeading(list: Risk[]) {
  if (S.pic.country) return `${plural(list.length, 'open risk')} in ${S.pic.country}`;
  const cs = new Set(list.flatMap((r) => r.countries));
  return `${plural(list.length, 'open risk')} in ${plural(cs.size, 'country', 'countries')}`;
}

function Chip({ label, n, on, onClick }: { label: string; n: number; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {label} <small>{n}</small>
    </button>
  );
}

/** The right-hand list of countries with open risks */
function PicSide() {
  const byC: Record<string, { n: number; top: string; worse: number }> = {};
  for (const r of picList(null)) {
    for (const c of r.countries) {
      const e = byC[c] || (byC[c] = { n: 0, top: 'Medium', worse: 0 });
      e.n++;
      if (r.level === 'High') e.top = 'High';
      if (r.trend === 'Deteriorated') e.worse++;
    }
  }
  const rows = Object.entries(byC).sort(
    (a, b) =>
      (a[1].top === b[1].top ? 0 : a[1].top === 'High' ? -1 : 1) || b[1].n - a[1].n || a[0].localeCompare(b[0]),
  );
  return (
    <aside className="pic-side" aria-label="Countries with open risks">
      <h2>Countries</h2>
      <ul>
        {rows.map(([name, e]) => {
          const sig = signalOf(name);
          return (
            <li key={name}>
              <Link className="pc-row" to={countryHref(name)} data-hl={name}>
                <span className="pc-name">{name}</span>
                <LevelChip level={e.top} />
                <span className="pc-meta">
                  {plural(e.n, 'open risk')}
                  {e.worse ? ` · ${e.worse} worsening` : ''}
                </span>
                {sig.length > 0 && (
                  <span className="pc-flag" data-tip={sig.join('; ')}>
                    Experts flag something
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** The Picture: open risks on a world map, and the countries they are in. */
export function Picture() {
  const st = useAnalyst();
  const f = st.pic;
  const all = Object.values(R);
  const list = picList();
  const levels = ['High', 'Medium', 'Low'].filter((l) => all.some((r) => r.level === l));
  const [hl, setHl] = useState<Set<string> | null>(null);

  // Hovering or focusing anything with data-hl highlights those countries on the map
  const track = (e: SyntheticEvent) => {
    const t = (e.target as Element).closest?.('[data-hl]') as HTMLElement | SVGElement | null;
    const v = t?.dataset.hl;
    setHl((cur) => {
      if (!v) return cur ? null : cur;
      const next = new Set(v.split('|'));
      return cur && cur.size === next.size && [...next].every((n) => cur.has(n)) ? cur : next;
    });
  };

  return (
    <div className="pic" onPointerOver={track} onFocus={track} onPointerLeave={() => setHl(null)}>
      <section className="stage" id="stage" aria-label="Open risks by country">
        {f.view === 'map' && <WorldMap hl={hl} />}
        <div className="stage-head">
          <h1>{picHeading(list)}</h1>
          <p className="sub">Click a country to open its page.</p>
          <div className="controls">
            {levels.map((l) => (
              <Chip
                key={l}
                label={l}
                n={all.filter((r) => r.level === l).length}
                on={f.level === l}
                onClick={() => {
                  S.pic.level = S.pic.level === l ? null : l;
                  commit();
                }}
              />
            ))}
            <Chip
              label="Deteriorated"
              n={all.filter((r) => r.trend === 'Deteriorated').length}
              on={f.worse}
              onClick={() => {
                S.pic.worse = !S.pic.worse;
                commit();
              }}
            />
            {f.country && (
              <button
                type="button"
                className="chip"
                aria-pressed="true"
                onClick={() => {
                  S.pic.country = null;
                  commit();
                }}
              >
                {f.country} <span aria-hidden="true">×</span>
                <span className="sr">Clear country filter</span>
              </button>
            )}
          </div>
        </div>
        <div className="legend map-key" aria-label="How to read the map">
          <span className="mk-t">Level of risk</span>
          {levels.map((l) => (
            <span key={l}>
              <i style={{ background: `var(--${l === 'High' ? 'high' : l === 'Medium' ? 'med' : 'low'})` }} />
              {l}
            </span>
          ))}
          <span className="mk-sep" />
          <span>
            <b className="mk-n">2</b>Number of open risks
          </span>
          <span>
            <i className="ring-k" />
            Experts challenge ACAPS or suggest a risk
          </span>
        </div>
      </section>
      <PicSide />
    </div>
  );
}

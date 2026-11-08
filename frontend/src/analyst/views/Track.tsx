import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { DATA, LEVELS, fmtISO, plural } from '../data';
import { S, commit, openDialog, useAnalyst } from '../store';
import { rankText } from './overview-helpers';
import { CodeBtn } from './overview-ui';
import './track.css';

type Expert = (typeof DATA.experts)[number];

/** Does an expert match every word typed in the search box? (code, countries, fields) */
function matches(e: Expert, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${e.id} ${e.countries.join(' ')} ${e.fields.join(' ')}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** Experts matching the "All experts" filters, sorted */
function xpList() {
  const f = S.xp;
  const busy = (e: Expert) => e.round.answered;
  return DATA.experts
    .filter(
      (e) =>
        (!f.country || e.countries.includes(f.country)) &&
        (f.privacy === 'all' || e.privacy === f.privacy) &&
        matches(e, f.q || ''),
    )
    .sort(
      f.sort === 'active'
        ? (a, b) => busy(b) - busy(a) || (b.last || '').localeCompare(a.last || '')
        : (a, b) => (a.rank ? a.rank.position : 1e9) - (b.rank ? b.rank.position : 1e9) || a.id.localeCompare(b.id),
    );
}

const None = ({ children = 'None' }: { children?: string }) => <span className="muted">{children}</span>;
const set = (fn: () => void) => {
  fn();
  commit();
};

/** Clicking anywhere on a row opens that expert's account (the code button inside still works too) */
const openRow = (id: string) => (e: React.MouseEvent) => {
  if (!(e.target as Element).closest('button,a,input,select')) openDialog('acct', { id });
};

/** A card with a title and a table that scrolls inside it, header kept in view */
function TableCard({
  title,
  note,
  count,
  className = '',
  tools,
  children,
  id,
}: {
  title: string;
  note?: string;
  count?: ReactNode;
  className?: string;
  tools?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className={`pl-card ${className}`} id={id} aria-label={title}>
      <header className="pl-card__head">
        <h2>
          {title} {count != null && <span className="pl-count">{count}</span>}
        </h2>
        {note && <p className="pl-note">{note}</p>}
      </header>
      {tools}
      <div className="pl-scroll" tabIndex={0} aria-label={`${title} table`}>
        {children}
      </div>
    </section>
  );
}

/** All experts: search, filters and the full list */
function AllExperts({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) {
  const f = S.xp;
  const list = xpList();
  const countries = [...new Set(DATA.experts.flatMap((e) => e.countries))].sort();
  const n = (k: string) => DATA.experts.filter((e) => e.privacy === k).length;
  const filtered = Boolean(f.country || f.privacy !== 'all' || f.q);

  const tools = (
    <div className="pl-tools">
      <div className="pl-search" role="search">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={f.q}
          placeholder="Search by code, country or field"
          aria-label="Search experts"
          onChange={(e) => set(() => (S.xp.q = e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && f.q) set(() => (S.xp.q = ''));
          }}
        />
        {f.q && (
          <button type="button" className="pl-search__clear" aria-label="Clear search" onClick={() => set(() => (S.xp.q = ''))}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      <label className="sr" htmlFor="xpCountry">
        Country
      </label>
      <select
        id="xpCountry"
        className="pl-select"
        value={f.country}
        onChange={(e) => set(() => (S.xp.country = e.target.value))}
      >
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <div className="pl-chips" role="group" aria-label="Privacy">
        <button type="button" className="pl-chip" aria-pressed={f.privacy === 'all'} onClick={() => set(() => (S.xp.privacy = 'all'))}>
          Everyone <span>{DATA.experts.length}</span>
        </button>
        {LEVELS.map(([k, l]) => (
          <button key={k} type="button" className="pl-chip" aria-pressed={f.privacy === k} onClick={() => set(() => (S.xp.privacy = k))}>
            {l} <span>{n(k)}</span>
          </button>
        ))}
      </div>
      <div className="pl-sort" role="group" aria-label="Sort">
        <button type="button" aria-pressed={f.sort === 'rank'} onClick={() => set(() => (S.xp.sort = 'rank'))}>
          By rank
        </button>
        <button type="button" aria-pressed={f.sort === 'active'} onClick={() => set(() => (S.xp.sort = 'active'))}>
          Most active
        </button>
      </div>
      {filtered && (
        <button
          type="button"
          className="link pl-reset"
          onClick={() => set(() => Object.assign(S.xp, { country: '', privacy: 'all', q: '' }))}
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div ref={sectionRef}>
      <TableCard
        id="allExperts"
        className="pl-card--all"
        title="All experts"
        count={filtered ? `${list.length} of ${DATA.experts.length}` : DATA.experts.length}
        note="Click a row to see the expert's account."
        tools={tools}
      >
        <table className="pn-t pl-t">
          <thead>
            <tr>
              <th>Code</th>
              <th>Rank</th>
              <th>Calls right</th>
              <th>Countries</th>
              <th>Fields</th>
              <th>This round</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((e) => (
                <tr key={e.id} className="pl-row" onClick={openRow(e.id)}>
                  <td>
                    <CodeBtn id={e.id} />
                  </td>
                  <td className="nw">{rankText(e)}</td>
                  <td className="nw">{e.rank ? `${e.rank.correct} of ${e.rank.calls}` : <None>None resolved</None>}</td>
                  <td>{e.countries.join(', ') || <None />}</td>
                  <td>{e.fields.join(', ') || <None />}</td>
                  <td className="nw">{e.round.answered ? plural(e.round.answered, 'risk') : <None />}</td>
                  <td className="nw">{e.last ? fmtISO(e.last) : <None>Not yet</None>}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="muted pl-empty">
                  No experts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}

/** Your expert panel: who is on it, how they chose to be known, how they do. */
export function Track() {
  const st = useAnalyst();
  const P = DATA.panel;
  const LV = LEVELS;
  const tot = LV.reduce((s, [k]) => s + (P.privacy[k] || 0), 0) || 1;
  const allRef = useRef<HTMLDivElement>(null);
  const known = new Set(DATA.experts.flatMap((e) => e.countries));

  /** A country panel row: show that country's experts in the full list below */
  const showCountry = (c: string) => {
    set(() => {
      S.xp.country = known.has(c) ? c : '';
      S.xp.q = '';
    });
    allRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const tiles: [number, string][] = [
    [P.approved, 'approved experts'],
    [P.pending, 'waiting for approval'],
    [P.active30, 'active in the last 30 days'],
    [P.ranked, 'with a rank (5 or more scored forecasts)'],
  ];

  return (
    <div className="pn scroll">
      <div className="pl">
        <header className="pl-head">
          <div>
            <h1>Your expert panel</h1>
            <p className="sub">
              Every expert has one code. Click a code, here or next to an answer, to see their account. Names and emails show
              only for experts who are not fully anonymous.
            </p>
          </div>
        </header>

        {/* Key numbers and privacy choices, in one row */}
        <div className="pl-stats">
          {tiles.map(([n, l]) => (
            <div key={l} className="pl-tile">
              <b>{n}</b>
              <span>{l}</span>
            </div>
          ))}
          <section className="pl-tile pl-privacy" aria-labelledby="pl-priv">
            <h2 id="pl-priv">Privacy choices</h2>
            <div className="pn-bar">
              {LV.map(([k, l], i) => (
                <i key={k} className={`pv${i}`} style={{ flex: P.privacy[k] || 0 }} title={l} />
              ))}
            </div>
            <ul className="pn-key">
              {LV.map(([k, l], i) => (
                <li key={k}>
                  <span className="pl-key__l">
                    <i className={`pv${i}`} />
                    {l}
                  </span>
                  <span>
                    <b>{P.privacy[k] || 0}</b> <span className="muted">({Math.round(((P.privacy[k] || 0) / tot) * 100)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* The three summary tables side by side, each scrolling on its own */}
        <div className="pl-row3">
          <TableCard title="Country panels" count={P.countries.length} note="Click a country to list its experts.">
            <table className="pn-t pl-t">
              <thead>
                <tr>
                  <th>Country</th>
                  <th className="num">Experts</th>
                  <th className="num">Open risks</th>
                  <th className="num">Answers</th>
                </tr>
              </thead>
              <tbody>
                {P.countries.map((c) => (
                  <tr
                    key={c.country}
                    className={`pl-row${st.xp.country === c.country ? ' is-on' : ''}`}
                    onClick={() => showCountry(c.country)}
                  >
                    <td>
                      <button type="button" className="pl-link" onClick={() => showCountry(c.country)}>
                        {c.country}
                      </button>
                    </td>
                    <td className="num">{c.experts || <None>0</None>}</td>
                    <td className="num">{c.risks}</td>
                    <td className="num">{c.answers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Top forecasters" note="Average points per scored forecast.">
            <table className="pn-t pl-t">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Rank</th>
                  <th className="num">Avg points</th>
                  <th className="num">Forecasts</th>
                  <th>Panel</th>
                </tr>
              </thead>
              <tbody>
                {P.top.map((e) => (
                  <tr key={e.expert_id} className="pl-row" onClick={openRow(e.expert_id)}>
                    <td>
                      <CodeBtn id={e.expert_id} />
                    </td>
                    <td className="nw">
                      {e.position} of {P.ranked}
                    </td>
                    <td className="num">{e.average_points}</td>
                    <td className="num">{e.forecasts}</td>
                    <td className="pl-nw">
                      {e.panel || ''}
                      {e.panel_position ? (
                        <span className="muted pl-sub">
                          {e.panel_position} of {e.panel_size}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Most active" note="This round's votes, answers and replies.">
            <table className="pn-t pl-t">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Panel</th>
                  <th className="num" title="Votes">
                    Votes
                  </th>
                  <th className="num" title="Written answers">
                    Written
                  </th>
                  <th className="num">Replies</th>
                  <th className="num" title="Forecasts">
                    Fcst
                  </th>
                  <th className="num">Sources</th>
                </tr>
              </thead>
              <tbody>
                {P.active.map((e) => (
                  <tr key={e.expert_id} className="pl-row" onClick={openRow(e.expert_id)}>
                    <td>
                      <CodeBtn id={e.expert_id} />
                    </td>
                    <td>{e.panel || ''}</td>
                    <td className="num">{e.votes}</td>
                    <td className="num">{e.written}</td>
                    <td className="num">{e.replies}</td>
                    <td className="num">{e.forecasts}</td>
                    <td className="num">{e.sources}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>

        <AllExperts sectionRef={allRef} />

        <p className="small muted pl-foot">
          Simulated experts. Certificates and points go to each expert's account, so ACAPS never needs a name to reward
          someone.
        </p>
      </div>
    </div>
  );
}

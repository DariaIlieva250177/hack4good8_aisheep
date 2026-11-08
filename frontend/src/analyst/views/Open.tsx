import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Bookmark,
  ChartNoAxesColumn,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  MessageCircle,
  Search,
  Pencil,
  Timer,
  TrendingDown,
  TrendingUp,
  UserX,
  X,
  Users,
} from 'lucide-react';
import { DATA, plural } from '../data';
import { go, riskHref } from '../nav';
import { S, commit, useAnalyst } from '../store';
import { LevelChip } from '../ui';
import type { OpenRisk } from '../types';
import { closingThisWeek, noCountryExpert, slowing, trend } from './open-helpers';
import './open.css';

const OPEN_SORT: [string, string][] = [
  ['closes', 'Closing soonest'],
  ['fewest', 'Lowest turnout'],
  ['quiet', 'Slowing down first'],
  ['votes', 'Most votes'],
  ['written', 'Most written answers'],
];

function Spark({ r }: { r: OpenRisk }) {
  const tr = trend(r);
  return (
    <>
      <span className={`op-trend ${tr.cls}`}>{tr.word}</span>
      <span className="op-last">{plural(r.last3, 'vote')} in the last 3 days</span>
    </>
  );
}

const BY: Record<string, (a: OpenRisk, b: OpenRisk) => number> = {
  closes: (a, b) => a.closes_iso.localeCompare(b.closes_iso),
  votes: (a, b) => b.votes - a.votes,
  fewest: (a, b) => a.votes / (a.eligible || 1) - b.votes / (b.eligible || 1),
  written: (a, b) => b.written - a.written,
  quiet: (a, b) => Number(trend(b).cls === 'down') - Number(trend(a).cls === 'down') || a.last3 - b.last3,
};

const FILTERS: { id: string; label: string; test: (r: OpenRisk) => boolean }[] = [
  { id: 'all', label: 'All open', test: () => true },
  { id: 'week', label: 'Closing this week', test: closingThisWeek },
  { id: 'slow', label: 'Slowing down', test: slowing },
  { id: 'local', label: 'No country expert', test: noCountryExpert },
];

/** Does a risk match every word typed in the search box? (title, country, ID, level) */
function matches(r: OpenRisk, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${r.title} ${r.country} ${r.id} ${r.level}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** Cards shown before "Show all" */
const FIRST = 4;

const fmt = (n: number) => n.toLocaleString('en');
const set = (fn: () => void) => {
  fn();
  commit();
};

/** Turnout ring: share of matching experts who voted (a thick arc in logo blues, round ends) */
function Ring({ pct }: { pct: number }) {
  const id = `ring-${useId().replace(/:/g, '')}`;
  const r = 23;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <span className="oc-ring" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <defs>
          {/* light at the start of the arc (top), deep logo blue towards its end */}
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="44" y1="4" x2="14" y2="60">
            <stop offset="0" stopColor="#7fdcf2" />
            <stop offset="0.55" stopColor="#0196ba" />
            <stop offset="1" stopColor="#0a6f9e" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} className="oc-ring__track" />
        {len > 0 && (
          <circle
            cx="32"
            cy="32"
            r={r}
            className="oc-ring__value"
            stroke={`url(#${id})`}
            strokeDasharray={`${len} ${c}`}
            transform="rotate(-90 32 32)"
          />
        )}
      </svg>
      <b>{pct}%</b>
    </span>
  );
}

/** Picking up / slowing down, as a coloured pill */
function TrendPill({ r }: { r: OpenRisk }) {
  const tr = trend(r);
  const icon = tr.cls === 'up' ? <TrendingUp aria-hidden="true" /> : tr.cls === 'down' ? <TrendingDown aria-hidden="true" /> : null;
  return (
    <span className={`oc-trend${tr.cls ? ` oc-trend--${tr.cls}` : ''}`}>
      {icon}
      {tr.word}
    </span>
  );
}

function Stat({ icon, n, label }: { icon: ReactNode; n: number; label: ReactNode }) {
  return (
    <li>
      <span className="oc-stat__n">
        {icon}
        {fmt(n)}
      </span>
      <span className="oc-stat__l">{label}</span>
    </li>
  );
}

/** One open risk as a card: turnout, momentum, agreement and activity. */
function RiskCard({ r }: { r: OpenRisk }) {
  const pct = r.eligible ? Math.round((r.votes / r.eligible) * 100) : 0;
  const few = r.local < 2;
  return (
    <li>
      <Link className="oc" to={riskHref(r.id)}>
        <div className="oc-top">
          <LevelChip level={r.level} />
          <span className="oc-where">
            <MapPin aria-hidden="true" />
            {r.country}, {r.id}
          </span>
          {r.closes && (
            <span className="oc-closes">
              <Timer aria-hidden="true" />
              Closes <b>{r.closes}</b>
            </span>
          )}
        </div>

        <h2 className="oc-title">{r.title}</h2>

        <div className="oc-turnout">
          <Ring pct={pct} />
          <div className="oc-turnout__text">
            <p>
              <b>
                {r.votes} of {r.eligible}
              </b>{' '}
              experts voted, {Math.max(0, r.eligible - r.votes)} still to go
            </p>
            <p className="oc-turnout__pace">
              <TrendPill r={r} />
              <span>{plural(r.last3, 'vote')} in the last 3 days</span>
            </p>
            <p className={`oc-local${few ? ' oc-local--few' : ''}`}>
              <Users aria-hidden="true" />
              {r.local ? (
                <>
                  <b>{r.local}</b> know the country
                </>
              ) : (
                <b>No one who knows the country has voted</b>
              )}
            </p>
          </div>
        </div>

        <div className="oc-agree">
          <span>Agree with ACAPS</span>
          <b>{r.agree == null ? '–' : `${r.agree}%`}</b>
          <span className="oc-agree__bar" aria-hidden="true">
            <i style={{ width: `${r.agree ?? 0}%` }} />
          </span>
        </div>

        <ul className="oc-stats">
          <Stat icon={<ChartNoAxesColumn aria-hidden="true" />} n={r.forecasts} label="forecasts" />
          <Stat icon={<Pencil aria-hidden="true" />} n={r.written} label="written" />
          <Stat icon={<MessageCircle aria-hidden="true" />} n={r.replies} label="replies" />
          <Stat icon={<Heart aria-hidden="true" />} n={r.likes} label="likes" />
          <Stat
            icon={<Bookmark aria-hidden="true" />}
            n={r.saved}
            label={
              <>
                saved, {r.skipped}
                <br />
                skipped
              </>
            }
          />
        </ul>
      </Link>
    </li>
  );
}

/** The original table, sortable, for scanning every number at once */
function RiskTable({ rows }: { rows: OpenRisk[] }) {
  const k = S.openSort || 'closes';
  const sorted = [...rows].sort(BY[k]);
  return (
    <>
      <div className="row" role="group" aria-label="Sort">
        {OPEN_SORT.map(([id, l]) => (
          <button key={id} type="button" className="chip" aria-pressed={k === id} onClick={() => set(() => (S.openSort = id))}>
            {l}
          </button>
        ))}
      </div>
      <section className="pn-card row-t">
        <table className="pn-t op-t">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Chat closes</th>
              <th>Voted</th>
              <th>Lately</th>
              <th>Know the country</th>
              <th>Agree</th>
              <th>Forecasts</th>
              <th>Written</th>
              <th>Replies</th>
              <th>Likes</th>
              <th>Saved · skipped</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const pct = r.eligible ? Math.round((r.votes / r.eligible) * 100) : 0;
              return (
                <tr
                  key={r.id}
                  onClick={(e) => {
                    // A click anywhere on the row opens the risk
                    if (!(e.target as Element).closest('a,button,input,select,textarea')) go(riskHref(r.id));
                  }}
                >
                  <td>
                    <Link className="op-title" to={riskHref(r.id)}>
                      {r.title}
                    </Link>
                    <span className="op-meta">
                      {r.country} · {r.id} · <LevelChip level={r.level} />
                    </span>
                  </td>
                  <td>{r.closes || ''}</td>
                  <td>
                    <b>{r.votes}</b> <span className="muted">of {r.eligible}</span>
                    <span className="op-bar">
                      <i style={{ width: `${pct}%` }} />
                    </span>
                  </td>
                  <td>
                    <Spark r={r} />
                  </td>
                  <td>{r.local}</td>
                  <td>{r.agree == null ? <span className="muted">none</span> : r.agree + '%'}</td>
                  <td>{r.forecasts}</td>
                  <td>{r.written}</td>
                  <td>{r.replies}</td>
                  <td>{r.likes}</td>
                  <td>
                    {r.saved} · {r.skipped}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

/** Open risks: what experts are doing on every open risk right now. */
export function Open() {
  const st = useAnalyst();
  const O = DATA.open;
  const sum = (f: 'votes' | 'written' | 'replies' | 'likes') => O.reduce((s, r) => s + (r[f] || 0), 0);
  const filter = FILTERS.find((f) => f.id === st.openFilter) ?? FILTERS[0];
  const q = st.openQuery;
  const found = O.filter((r) => matches(r, q));
  const rows = found.filter(filter.test).sort(BY.closes);
  const shown = st.openAll ? rows : rows.slice(0, FIRST);

  const attention: { id: string; icon: ReactNode; n: number; label: (one: boolean) => string }[] = [
    {
      id: 'week',
      icon: <Timer />,
      n: O.filter(closingThisWeek).length,
      label: (one) => `${one ? 'chat' : 'chats'} closing in the next 7 days`,
    },
    {
      id: 'slow',
      icon: <TrendingDown />,
      n: O.filter(slowing).length,
      label: (one) => `${one ? 'risk' : 'risks'} where voting is slowing down`,
    },
    {
      id: 'local',
      icon: <UserX />,
      n: O.filter(noCountryExpert).length,
      label: (one) => `${one ? 'risk' : 'risks'} with no vote from an expert who knows the country`,
    },
  ];
  const totals: [string, number][] = [
    ['open risks', O.length],
    ['votes', sum('votes')],
    ['written answers', sum('written')],
    ['replies', sum('replies')],
    ['likes', sum('likes')],
  ];

  return (
    <div className="pn scroll">
      <div className="op">
        {/* Left: the title, what needs attention, and the totals */}
        <aside className="op-side">
          <h1>Open risks</h1>
          <p className="sub">What experts are doing on every open risk right now.</p>

          <section className="op-attn" aria-labelledby="op-attn">
            <h2 id="op-attn">Needs your attention</h2>
            <ul>
              {attention.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`op-attn__item op-attn__item--${a.id}`}
                    aria-pressed={st.openFilter === a.id}
                    onClick={() =>
                      set(() => {
                        S.openFilter = st.openFilter === a.id ? 'all' : a.id;
                        S.openAll = false;
                      })
                    }
                  >
                    <span className="op-attn__icon" aria-hidden="true">
                      {a.icon}
                    </span>
                    <span>
                      <b>{a.n}</b>
                      {a.label(a.n === 1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <dl className="op-totals">
            {totals.map(([l, n]) => (
              <div key={l}>
                <dt>{l}</dt>
                <dd>{fmt(n)}</dd>
              </div>
            ))}
          </dl>
        </aside>

        {/* Right: which risks, cards or table */}
        <div className="op-main">
          <div className="op-bar-top">
            <div className="op-filters" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="op-filter"
                  aria-pressed={filter.id === f.id}
                  onClick={() =>
                    set(() => {
                      S.openFilter = f.id;
                      S.openAll = false;
                    })
                  }
                >
                  {f.label}
                  <span className="op-filter__n">{found.filter(f.test).length}</span>
                </button>
              ))}
            </div>
            <div className="op-views" role="group" aria-label="View as">
              <button type="button" aria-pressed={st.openView === 'cards'} onClick={() => set(() => (S.openView = 'cards'))}>
                <LayoutGrid aria-hidden="true" />
                Cards
              </button>
              <button type="button" aria-pressed={st.openView === 'table'} onClick={() => set(() => (S.openView = 'table'))}>
                <List aria-hidden="true" />
                Table
              </button>
            </div>
          </div>

          <div className="op-search" role="search">
            <Search className="op-search__icon" aria-hidden="true" />
            <input
              type="search"
              value={q}
              placeholder="Search open risks by title, country or ID"
              aria-label="Search open risks"
              onChange={(e) =>
                set(() => {
                  S.openQuery = e.target.value;
                  S.openAll = false;
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Escape' && q) set(() => (S.openQuery = ''));
              }}
            />
            {q && (
              <button type="button" className="op-search__clear" aria-label="Clear search" onClick={() => set(() => (S.openQuery = ''))}>
                <X aria-hidden="true" />
              </button>
            )}
            {q && (
              <span className="op-search__n" aria-live="polite">
                {plural(rows.length, 'risk')}
              </span>
            )}
          </div>

          {st.openView === 'table' ? (
            <RiskTable rows={rows} />
          ) : (
            <>
              <ul className="oc-grid">
                {shown.map((r) => (
                  <RiskCard key={r.id} r={r} />
                ))}
              </ul>
              {rows.length > FIRST && (
                <p className="op-more">
                  <button type="button" className="link" onClick={() => set(() => (S.openAll = !S.openAll))}>
                    {st.openAll ? 'Show fewer' : `Show all ${plural(rows.length, 'open risk')}`}
                  </button>
                </p>
              )}
              {!rows.length && (
                <p className="op-empty muted">
                  {q ? `No open risks match “${q.trim()}”${filter.id === 'all' ? '' : ' with this filter'}.` : 'No open risks here.'}
                </p>
              )}
            </>
          )}

          <p className="small muted op-foot">
            Voted counts experts who pressed Agree or Disagree, out of the experts who match the risk by country or field. The
            pace compares the last 3 days with the days before. Agree counts experts who know the risk more. Simulated experts.
          </p>
        </div>
      </div>
    </div>
  );
}

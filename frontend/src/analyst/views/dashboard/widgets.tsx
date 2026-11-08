import { useId } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Flag,
  Gauge,
  Globe,
  Inbox,
  Lightbulb,
  ListOrdered,
  PieChart,
  ShieldCheck,
  Sigma,
  StickyNote,
  Timer,
  TrendingDown,
  Trophy,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { DATA, LEVELS, fmtWhen, plural } from '../../data';
import { riskHref } from '../../nav';
import { S, openDialog } from '../../store';
import type { DashSize } from '../../store';
import { LevelChip } from '../../ui';
import type { OpenRisk } from '../../types';
import { WorldMap } from '../overview-WorldMap';
import { CodeBtn } from '../overview-ui';
import { closingThisWeek, noCountryExpert, slowing, trend } from '../open-helpers';
import { isNote, noteText, setNoteText } from './notes';

/*
 * Every component the custom dashboard can show. Each one reads the same
 * data as the rest of the analyst view, so the board is always up to date.
 */

export interface WidgetDef {
  id: string;
  title: string;
  desc: string;
  group: 'Notes' | 'Overview' | 'Risks' | 'Experts' | 'Activity';
  icon: ReactNode;
  /** default width on the board */
  size: DashSize;
  /** widths it can take */
  sizes: DashSize[];
  /** can be added more than once (each copy is its own card) */
  multi?: boolean;
  /** `id` is the card's id on the board */
  render: (id: string) => ReactNode;
}

const O = DATA.open;
const fmt = (n: number) => n.toLocaleString('en');
const turnout = (r: OpenRisk) => (r.eligible ? Math.round((r.votes / r.eligible) * 100) : 0);

/* ---------- small building blocks ---------- */

/** A thick logo-blue ring with the value in the middle */
function Ring({ pct, size = 64, label }: { pct: number; size?: number; label?: string }) {
  const id = `dr-${useId().replace(/:/g, '')}`;
  const r = 23;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <span className="dw-ring" style={{ inlineSize: size, blockSize: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="44" y1="4" x2="14" y2="60">
            <stop offset="0" stopColor="#7fdcf2" />
            <stop offset="0.55" stopColor="#0196ba" />
            <stop offset="1" stopColor="#0a6f9e" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={r} className="dw-ring__track" />
        {len > 0 && (
          <circle cx="32" cy="32" r={r} className="dw-ring__value" stroke={`url(#${id})`} strokeDasharray={`${len} ${c}`} transform="rotate(-90 32 32)" />
        )}
      </svg>
      <b>{label ?? `${pct}%`}</b>
    </span>
  );
}

/** Horizontal bars: label, bar, value */
function Bars({ rows }: { rows: { key: string; label: ReactNode; pct: number; value: string; to?: string }[] }) {
  return (
    <ul className="dw-bars">
      {rows.map((r) => (
        <li key={r.key}>
          {r.to ? (
            <Link to={r.to} className="dw-bars__label">
              {r.label}
            </Link>
          ) : (
            <span className="dw-bars__label">{r.label}</span>
          )}
          <span className="dw-bars__track" aria-hidden="true">
            <i style={{ inlineSize: `${Math.max(2, r.pct)}%` }} />
          </span>
          <b>{r.value}</b>
        </li>
      ))}
    </ul>
  );
}

function Numbers({ items }: { items: [number, string][] }) {
  return (
    <ul className="dw-nums">
      {items.map(([n, l]) => (
        <li key={l}>
          <b>{fmt(n)}</b>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

const shortTitle = (t: string, n = 64) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);

/* ---------- the components ---------- */

function Attention() {
  const items: { icon: ReactNode; n: number; label: string }[] = [
    { icon: <Timer />, n: O.filter(closingThisWeek).length, label: 'chats closing in the next 7 days' },
    { icon: <TrendingDown />, n: O.filter(slowing).length, label: 'risks where voting is slowing down' },
    { icon: <UserX />, n: O.filter(noCountryExpert).length, label: 'with no vote from a country expert' },
    { icon: <UserCheck />, n: DATA.approvals.filter((x) => !S.ap[x.id]?.sent).length, label: 'experts waiting for approval' },
  ];
  return (
    <ul className="dw-attn">
      {items.map((a) => (
        <li key={a.label}>
          <span className="dw-attn__icon" aria-hidden="true">
            {a.icon}
          </span>
          <span>
            <b>{a.n}</b> {a.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Totals() {
  const sum = (f: 'votes' | 'written' | 'replies' | 'likes' | 'forecasts') => O.reduce((s, r) => s + (r[f] || 0), 0);
  return (
    <Numbers
      items={[
        [O.length, 'open risks'],
        [sum('votes'), 'votes'],
        [sum('forecasts'), 'forecasts'],
        [sum('written'), 'written answers'],
        [sum('replies'), 'replies'],
        [sum('likes'), 'likes'],
      ]}
    />
  );
}

function MapWidget() {
  return (
    <div className="dw-map stage">
      <WorldMap hl={null} />
    </div>
  );
}

function Levels() {
  const R = Object.values(DATA.risks);
  const high = R.filter((r) => r.level === 'High').length;
  const med = R.filter((r) => r.level === 'Medium').length;
  const worse = R.filter((r) => r.trend === 'Deteriorated').length;
  const pct = R.length ? Math.round((high / R.length) * 100) : 0;
  return (
    <div className="dw-split">
      <Ring pct={pct} size={92} />
      <ul className="dw-legend">
        <li>
          <LevelChip level="High" /> <b>{high}</b> risks
        </li>
        <li>
          <LevelChip level="Medium" /> <b>{med}</b> risks
        </li>
        <li className="muted">
          <b>{worse}</b> deteriorated since the last update
        </li>
      </ul>
    </div>
  );
}

function Closing() {
  const rows = [...O].sort((a, b) => a.closes_iso.localeCompare(b.closes_iso)).slice(0, 5);
  return (
    <ul className="dw-list">
      {rows.map((r) => (
        <li key={r.id}>
          <Link to={riskHref(r.id)} className="dw-list__row">
            <Ring pct={turnout(r)} size={44} />
            <span className="dw-list__main">
              <b>{shortTitle(r.title)}</b>
              <small>
                {r.country} · {r.id} · {trend(r).word}
              </small>
            </span>
            <span className="dw-list__side">
              Closes <b>{r.closes}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Turnout() {
  const rows = [...O].sort((a, b) => turnout(a) - turnout(b)).slice(0, 6);
  return (
    <Bars
      rows={rows.map((r) => ({
        key: r.id,
        label: (
          <>
            {r.country} <small>{r.id}</small>
          </>
        ),
        pct: turnout(r),
        value: `${r.votes} of ${r.eligible}`,
        to: riskHref(r.id),
      }))}
    />
  );
}

function Agreement() {
  const rows = O.filter((r) => r.agree != null)
    .sort((a, b) => a.agree - b.agree)
    .slice(0, 6);
  return (
    <>
      <p className="dw-note">Lowest agreement first: where experts push back most.</p>
      <Bars
        rows={rows.map((r) => ({
          key: r.id,
          label: (
            <>
              {r.country} <small>{r.id}</small>
            </>
          ),
          pct: r.agree,
          value: `${r.agree}%`,
          to: riskHref(r.id),
        }))}
      />
    </>
  );
}

function Suggested() {
  const cards = DATA.cards.filter((c) => !S.cards[c.id]);
  if (!cards.length) return <p className="dw-empty">No suggested risks waiting.</p>;
  return (
    <ul className="dw-list">
      {cards.map((c) => (
        <li key={c.id}>
          <button type="button" className="dw-list__row" onClick={() => openDialog('drawer')}>
            <span className="dw-list__icon" aria-hidden="true">
              <Lightbulb />
            </span>
            <span className="dw-list__main">
              <b>{shortTitle(c.statement, 80)}</b>
              <small>
                {c.area} · suggested by an expert
              </small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PanelNumbers() {
  const P = DATA.panel;
  return (
    <Numbers
      items={[
        [P.approved, 'approved experts'],
        [P.pending, 'waiting for approval'],
        [P.active30, 'active in the last 30 days'],
        [P.ranked, 'with a rank'],
      ]}
    />
  );
}

function Privacy() {
  const P = DATA.panel;
  const tot = LEVELS.reduce((s, [k]) => s + (P.privacy[k] || 0), 0) || 1;
  return (
    <>
      <div className="pn-bar">
        {LEVELS.map(([k, l], i) => (
          <i key={k} className={`pv${i}`} style={{ flex: P.privacy[k] || 0 }} title={l} />
        ))}
      </div>
      <ul className="dw-legend dw-legend--row">
        {LEVELS.map(([k, l], i) => (
          <li key={k}>
            <i className={`pv${i}`} /> {l} <b>{P.privacy[k] || 0}</b>{' '}
            <span className="muted">({Math.round(((P.privacy[k] || 0) / tot) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Forecasters() {
  const P = DATA.panel;
  return (
    <table className="pn-t dw-t">
      <thead>
        <tr>
          <th>Code</th>
          <th>Rank</th>
          <th className="num">Avg points</th>
          <th>Panel</th>
        </tr>
      </thead>
      <tbody>
        {P.top.slice(0, 6).map((e) => (
          <tr key={e.expert_id}>
            <td>
              <CodeBtn id={e.expert_id} />
            </td>
            <td className="nw">
              {e.position} of {P.ranked}
            </td>
            <td className="num">{e.average_points}</td>
            <td>{e.panel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MostActive() {
  return (
    <table className="pn-t dw-t">
      <thead>
        <tr>
          <th>Code</th>
          <th>Panel</th>
          <th className="num">Votes</th>
          <th className="num">Written</th>
          <th className="num">Replies</th>
        </tr>
      </thead>
      <tbody>
        {DATA.panel.active.slice(0, 6).map((e) => (
          <tr key={e.expert_id}>
            <td>
              <CodeBtn id={e.expert_id} />
            </td>
            <td>{e.panel}</td>
            <td className="num">{e.votes}</td>
            <td className="num">{e.written}</td>
            <td className="num">{e.replies}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CountryPanels() {
  return (
    <div className="dw-scroll">
      <table className="pn-t dw-t">
        <thead>
          <tr>
            <th>Country</th>
            <th className="num">Experts</th>
            <th className="num">Open risks</th>
            <th className="num">Answers</th>
          </tr>
        </thead>
        <tbody>
          {DATA.panel.countries.map((c) => (
            <tr key={c.country}>
              <td>{c.country}</td>
              <td className="num">{c.experts}</td>
              <td className="num">{c.risks}</td>
              <td className="num">{c.answers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Approvals() {
  const waiting = DATA.approvals.filter((x) => !S.ap[x.id]?.sent);
  if (!waiting.length) return <p className="dw-empty">Nobody is waiting for approval.</p>;
  return (
    <>
      <ul className="dw-list">
        {waiting.slice(0, 5).map((x) => (
          <li key={x.id}>
            <Link to="/approve" className="dw-list__row" onClick={() => (S.apSel = x.id)}>
              <span className="dw-list__icon" aria-hidden="true">
                <UserCheck />
              </span>
              <span className="dw-list__main">
                <b>{x.name || x.id}</b>
                <small>
                  {x.countries.map((c) => c.name).join(', ')} · {x.fields.map((f) => f.name).join(', ')}
                </small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {waiting.length > 5 && <p className="dw-note">and {plural(waiting.length - 5, 'more')}</p>}
    </>
  );
}

function Decisions() {
  if (!S.log.length)
    return <p className="dw-empty">No decisions yet. Everything you approve, accept or publish is logged here, with your reason.</p>;
  return (
    <ul className="dw-list dw-log">
      {S.log.slice(0, 6).map((d, i) => (
        <li key={i}>
          <span className="dw-list__icon" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <span className="dw-list__main">
            <b>{d.what}</b>
            <small>
              {fmtWhen(d.when)} · {d.why}
            </small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A note: free text the analyst types, kept with the board */
function Note({ id }: { id: string }) {
  return (
    <textarea
      className="dw-note-text"
      value={noteText(id)}
      placeholder="Write a note: a reminder, a question for the team, what to check next…"
      aria-label="Note"
      onChange={(e) => setNoteText(id, e.target.value)}
    />
  );
}

/* ---------- the registry ---------- */

export const WIDGETS: WidgetDef[] = [
  {
    id: 'note',
    title: 'Note',
    desc: 'Free text, add as many as you like',
    group: 'Notes',
    icon: <StickyNote />,
    size: 'sm',
    sizes: ['sm', 'md', 'lg', 'xl'],
    multi: true,
    render: (id) => <Note id={id} />,
  },
  { id: 'attention', title: 'Needs your attention', desc: 'What to act on today', group: 'Overview', icon: <Flag />, size: 'sm', sizes: ['sm', 'md'], render: () => <Attention /> },
  { id: 'totals', title: 'Activity totals', desc: 'Votes, forecasts, answers, replies', group: 'Overview', icon: <Sigma />, size: 'md', sizes: ['sm', 'md', 'lg', 'xl'], render: () => <Totals /> },
  { id: 'map', title: 'World map', desc: 'Open risks by country', group: 'Overview', icon: <Globe />, size: 'lg', sizes: ['md', 'lg', 'xl'], render: () => <MapWidget /> },
  { id: 'levels', title: 'Risk levels', desc: 'High and medium risks', group: 'Overview', icon: <PieChart />, size: 'sm', sizes: ['sm', 'md'], render: () => <Levels /> },
  { id: 'closing', title: 'Closing soonest', desc: 'Chats about to close, with turnout', group: 'Risks', icon: <AlarmClock />, size: 'md', sizes: ['md', 'lg', 'xl'], render: () => <Closing /> },
  { id: 'turnout', title: 'Lowest turnout', desc: 'Risks with the fewest votes', group: 'Risks', icon: <Gauge />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <Turnout /> },
  { id: 'agreement', title: 'Agreement with ACAPS', desc: 'Where experts push back', group: 'Risks', icon: <BarChart3 />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <Agreement /> },
  { id: 'suggested', title: 'Suggested risks', desc: 'New risks raised by experts', group: 'Risks', icon: <Lightbulb />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <Suggested /> },
  { id: 'panel', title: 'Expert panel', desc: 'Approved, waiting, active, ranked', group: 'Experts', icon: <Users />, size: 'md', sizes: ['sm', 'md', 'lg', 'xl'], render: () => <PanelNumbers /> },
  { id: 'privacy', title: 'Privacy choices', desc: 'How experts chose to be known', group: 'Experts', icon: <ShieldCheck />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <Privacy /> },
  { id: 'forecasters', title: 'Top forecasters', desc: 'Best average points', group: 'Experts', icon: <Trophy />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <Forecasters /> },
  { id: 'active', title: 'Most active', desc: 'Votes, answers and replies', group: 'Experts', icon: <ListOrdered />, size: 'md', sizes: ['md', 'lg'], render: () => <MostActive /> },
  { id: 'countries', title: 'Country panels', desc: 'Experts and answers per country', group: 'Experts', icon: <ClipboardList />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <CountryPanels /> },
  { id: 'approvals', title: 'Waiting for approval', desc: 'New experts to review', group: 'Activity', icon: <Inbox />, size: 'md', sizes: ['sm', 'md', 'lg'], render: () => <Approvals /> },
  { id: 'decisions', title: 'Your decisions', desc: 'The latest decisions you logged', group: 'Activity', icon: <CheckCircle2 />, size: 'md', sizes: ['sm', 'md', 'lg', 'xl'], render: () => <Decisions /> },
];

export const WIDGET: Record<string, WidgetDef> = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

/** The component a board card shows (note cards have their own ids: "note-…") */
export const defOf = (id: string): WidgetDef | undefined => (isNote(id) ? WIDGET.note : WIDGET[id]);

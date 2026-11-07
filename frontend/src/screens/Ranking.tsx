import { useId, useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { ContributionsMap } from '../components/ContributionsMap';
import { Carousel } from '../components/Carousel';
import { getRanking } from '../data/api';
import { useQuery } from '../data/useQuery';
import { useNow } from '../data/useNow';
import type { Ranking as RankingT } from '../data/types';
import { en } from '../i18n/en';
import './Ranking.css';

/*
 * Ranking in the "luxury rose gold pearl" design (UI_Images reference):
 * a rose gold laurel medal with the rank as a Roman numeral, a live round
 * countdown, a certificate carousel and a pearl-toned contributions globe.
 */

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];
function roman(n: number): string {
  let out = '';
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Left-side laurel leaves from the design: [cx, cy, rx, ry, rotation]. */
const LEAVES: [number, number, number, number, number][] = [
  [91.5, 197.1, 10.5, 3.6, -199.5],
  [89.6, 186.3, 10.5, 3.6, -132.5],
  [75.2, 191.9, 10.2, 3.5, -188.5],
  [75.4, 181.0, 10.2, 3.5, -121.5],
  [60.2, 183.8, 9.8, 3.3, -177.5],
  [62.5, 173.1, 9.8, 3.3, -110.5],
  [47.1, 172.9, 9.5, 3.2, -166.5],
  [51.3, 162.9, 9.5, 3.2, -99.5],
  [36.2, 159.8, 9.1, 3.1, -155.5],
  [42.3, 150.7, 9.1, 3.1, -88.5],
  [28.1, 144.8, 8.8, 3.0, -144.5],
  [35.8, 137.0, 8.8, 3.0, -77.5],
  [22.9, 128.5, 8.4, 2.9, -133.5],
  [32.0, 122.4, 8.4, 2.9, -66.5],
  [21.0, 111.6, 8.1, 2.7, -122.5],
  [31.0, 107.2, 8.1, 2.7, -55.5],
];

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function Ranking() {
  const { data: r } = useQuery(getRanking);
  if (!r) return <div className="screen ranking" />;
  const t = en.ranking;

  return (
    <div className="screen ranking">
      <ScreenHeader title={t.title} variant="large" />

      {/* Medal and rank */}
      <section className="lx-hero" aria-labelledby="lx-rank">
        <Medal rank={r.rank} />
        <p className="lx-eyebrow">{t.place(r.rank)}</p>
        <h2 id="lx-rank" className="lx-rank">
          #{r.rank} <i>{t.of}</i> {r.panelSize}
        </h2>
        <p className="lx-panel">{t.onPanel(r.panel)}</p>
        <span className="lx-rule" aria-hidden="true" />
        {r.overall?.position != null && (
          <p className="lx-note">{t.overall(r.overall.points, r.overall.position, r.overall.outOf)}</p>
        )}
        {r.groups?.map((g) => (
          <p key={g.name} className="lx-note">
            {t.groupRank(g.name, g.position, g.outOf)}
          </p>
        ))}
        <p className="lx-note">{t.rankNote}</p>
      </section>

      <RoundTimer r={r} />

      <Certificates certificates={r.certificates} />

      {/* Contributions */}
      <section className="lx-section" aria-labelledby="lx-contrib">
        <h2 id="lx-contrib" className="lx-h2">
          {t.contributions}
        </h2>
        <p className="lx-sub">{t.contributionsSub}</p>
        <ContributionsMap countries={r.countries} palette="pearl" />
        <div className="lx-card lx-people">
          <p className="lx-label">{t.people}</p>
          <p className="lx-people__value">{en.numbers(r.exposedPeople)}</p>
          <p className="lx-note">{t.peopleNote}</p>
        </div>
      </section>

      {/* Stats */}
      <section className="lx-section" aria-labelledby="lx-stats">
        <h2 id="lx-stats" className="lx-h2">
          {t.stats}
        </h2>
        <ul className="lx-stats">
          <Stat label={t.statContributions} value={String(r.stats.contributions)} />
          <Stat label={t.statResolved} value={String(r.stats.resolvedForecasts)} />
          <Stat
            label={t.statBrier}
            value={r.stats.brier.toFixed(2)}
            note={`${t.statBaseline(r.stats.baselineBrier)}. ${t.statBrierNote}.`}
          />
          <Stat label={t.statRounds} value={String(r.stats.roundsJoined)} />
        </ul>
        <p className="lx-note lx-synthetic">{t.synthetic}</p>
      </section>
    </div>
  );
}

/** Blue laurel ring (logo blue) with the rank as a Roman numeral and a passing shine. */
function Medal({ rank }: { rank: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rose = `rose${id}`;
  const pearl = `pearl${id}`;
  const clip = `ring${id}`;
  return (
    <svg
      className="lx-medal"
      viewBox="0 0 220 220"
      role="img"
      aria-label={en.ranking.medalLabel(en.ranking.place(rank))}
    >
      <defs>
        <linearGradient id={rose} x1="20" y1="20" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00557A" />
          <stop offset="0.4" stopColor="#2BB3E0" />
          <stop offset="0.55" stopColor="#D6F1FA" />
          <stop offset="0.75" stopColor="#0196BA" />
          <stop offset="1" stopColor="#00557A" />
        </linearGradient>
        <radialGradient id={pearl} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#EAF3F7" />
          <stop offset="1" stopColor="#C6DCE6" />
        </radialGradient>
        <clipPath id={clip}>
          <circle cx="110" cy="110" r="64" />
        </clipPath>
      </defs>
      {/* Laurel stems and leaves, mirrored left and right */}
      <g fill="none" stroke={`url(#${rose})`} strokeWidth="0.9" strokeLinecap="round">
        <path d="M 95.4 192.7 L 88.3 191.1 L 81.3 188.9 L 74.5 186.1 L 68.0 182.7 L 61.8 178.8 L 56.0 174.3 L 50.6 169.4 L 45.7 164.0 L 41.2 158.2 L 37.3 152.0 L 33.9 145.5 L 31.1 138.7 L 28.9 131.7 L 27.3 124.6 L 26.3 117.3 L 26.0 110.0 L 26.3 102.7 L 27.3 95.4 L 28.9 88.3" />
        <path d="M 124.6 192.7 L 131.7 191.1 L 138.7 188.9 L 145.5 186.1 L 152.0 182.7 L 158.2 178.8 L 164.0 174.3 L 169.4 169.4 L 174.3 164.0 L 178.8 158.2 L 182.7 152.0 L 186.1 145.5 L 188.9 138.7 L 191.1 131.7 L 192.7 124.6 L 193.7 117.3 L 194.0 110.0 L 193.7 102.7 L 192.7 95.4 L 191.1 88.3" />
        {LEAVES.map(([cx, cy, rx, ry, rot], i) => (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} />
            {/* Mirror on the right side of the ring */}
            <ellipse cx={220 - cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${180 - rot} ${220 - cx} ${cy})`} />
          </g>
        ))}
      </g>
      <circle cx="110" cy="110" r="66" fill="rgba(255, 255, 255, 0.7)" />
      <circle cx="110" cy="110" r="66" fill="none" stroke={`url(#${rose})`} strokeWidth="1.6" />
      <circle cx="110" cy="110" r="58" fill="none" stroke={`url(#${rose})`} strokeWidth="0.6" />
      <circle cx="110" cy="44" r="7" fill={`url(#${pearl})`} stroke={`url(#${rose})`} strokeWidth="0.8" />
      <text x="110" y="132" textAnchor="middle" className="lx-medal__numeral" fill={`url(#${rose})`}>
        {roman(rank)}
      </text>
      <g clipPath={`url(#${clip})`}>
        <path className="lx-shine" d="M80 30 L98 30 L74 200 L56 200 Z" fill="#FFFFFF" opacity="0.5" />
      </g>
    </svg>
  );
}

/** Countdown to the annual awards: four big numbers that flip as they change. */
function RoundTimer({ r }: { r: RankingT }) {
  const now = useNow(1000);
  const t = en.ranking;
  const left = Math.max(0, new Date(r.awardsAt).getTime() - now);
  const sec = Math.floor((left % 60000) / 1000);
  const values = [
    Math.floor(left / 86400000),
    Math.floor((left % 86400000) / 3600000),
    Math.floor((left % 3600000) / 60000),
    sec,
  ].map((v) => String(v).padStart(2, '0'));

  return (
    <section className="lx-card lx-timer" aria-labelledby="lx-timer-title">
      <div className="lx-timer__top">
        <h2 id="lx-timer-title" className="lx-label">
          {t.awardsIn}
        </h2>
        <span className="lx-label lx-live">
          <span className="lx-pulse" aria-hidden="true" />
          {t.live}
        </span>
      </div>
      {/* Screen readers get days, hours and minutes once, not a ticking value */}
      <p className="sr-only">{t.countdownSr(Number(values[0]), Number(values[1]), Number(values[2]))}</p>
      <div className="lx-timer__units" aria-hidden="true">
        {values.map((v, i) => (
          <div key={i} className="lx-timer__unit">
            {/* A new key per value re-mounts the number, which replays the flip */}
            <span key={v} className={`lx-timer__value${i === 3 ? ' is-sec' : ''}`}>
              {v}
            </span>
            <span className="lx-timer__name">{t.unitsShort[i]}</span>
          </div>
        ))}
      </div>
      <div className="lx-timer__track" aria-hidden="true">
        <span style={{ inlineSize: `${(sec / 60) * 100}%` }} />
      </div>
      <p className="lx-timer__note">{t.awardsNote}</p>
    </section>
  );
}

/** Certificate cards in a snapping carousel, with dots that follow and steer it. */
function Certificates({ certificates }: { certificates: RankingT['certificates'] }) {
  const t = en.ranking;
  const row = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  // "View all" swaps the carousel for a list of every certificate
  const [all, setAll] = useState(false);

  const cardStep = () => {
    const first = row.current?.querySelector<HTMLElement>('.lx-cert');
    return first ? first.offsetWidth + 14 : 306;
  };

  const onScroll = () => {
    const el = row.current;
    if (!el) return;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    const i = atEnd ? certificates.length - 1 : Math.round(el.scrollLeft / cardStep());
    if (i !== current) setCurrent(Math.min(certificates.length - 1, i));
  };

  const go = (i: number) => {
    row.current?.scrollTo({ left: i * cardStep(), behavior: 'smooth' });
    setCurrent(i);
  };

  const renderCert = (c: RankingT['certificates'][number]) => (
    <li key={c.id} className={`lx-cert${c.awarded ? '' : ' is-locked'}`}>
      <span className="lx-cert__org">{c.awarded ? t.org : t.locked}</span>
      <span className="lx-cert__title">{c.label}</span>
      <span className="lx-cert__rule" aria-hidden="true" />
      <span className="lx-cert__date">{c.awarded ? t.awardedOn(longDate(c.awarded)) : c.progress}</span>
      {c.awarded && (
        <span className="lx-cert__seal" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 60 60">
            <path
              d="M 30 10 L 35 23.1 L 49 23.8 L 38.1 32.6 L 41.8 46.2 L 30 38.5 L 18.2 46.2 L 21.9 32.6 L 11 23.8 L 25 23.1 Z"
              fill="#EEF6F9"
              stroke="#9FCFE0"
              strokeWidth="1.5"
            />
          </svg>
        </span>
      )}
    </li>
  );

  return (
    <section className="lx-section" aria-labelledby="lx-certs">
      <div className="lx-head">
        <h2 id="lx-certs" className="lx-h2">
          {t.certificates}
        </h2>
        <button type="button" className="lx-viewall" aria-expanded={all} onClick={() => setAll((a) => !a)}>
          {all ? t.showLess : t.viewAll}
        </button>
      </div>
      {all ? (
        <ul className="lx-certs-all">{certificates.map(renderCert)}</ul>
      ) : (
        <>
          <Carousel ref={row} label={t.certificates} className="lx-certs" onScroll={onScroll}>
            {certificates.map(renderCert)}
            <li className="lx-certs__end" aria-hidden="true" />
          </Carousel>
          <div className="lx-dots">
            {certificates.map((c, i) => (
              <button
                key={c.id}
                type="button"
                aria-label={t.showCert(i + 1, certificates.length)}
                aria-current={i === current}
                onClick={() => go(i)}
              >
                <span className={i === current ? 'is-on' : ''} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className="lx-card lx-stat">
      <span className="lx-label">{label}</span>
      <span className="lx-stat__value">{value}</span>
      {note && <span className="lx-note">{note}</span>}
    </li>
  );
}

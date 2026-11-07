import { Award } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { MetalShape } from '../components/MetalShape';
import { Countdown } from '../components/Countdown';
import { ContributionsMap } from '../components/ContributionsMap';
import { getRanking } from '../data/api';
import { useQuery } from '../data/useQuery';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './Ranking.css';

export function Ranking() {
  const { data: r } = useQuery(getRanking);
  const { mode } = useMode();

  if (!r) return <div className="screen ranking" />;

  const regions = new Set(r.countries.map((c) => c.region)).size;
  const t = en.ranking;

  return (
    <div className="screen ranking">
      <ScreenHeader title={t.title} tone="dark" />

      <section className="ranking__card glass-dark" aria-labelledby="your-ranking">
        <h2 id="your-ranking" className="t-small ranking__label">
          {t.yourRanking}
        </h2>
        <p className="ranking__rank t-title">{t.rankOf(r.rank, r.panelSize, r.panel)}</p>
        <p className="t-small ranking__muted">{t.rankNote}</p>
        <h3 className="t-small ranking__label ranking__round">{t.roundCloses(r.round)}</h3>
        <Countdown to={r.roundEndsAt} />
      </section>

      <section className="ranking__section" aria-labelledby="certificates">
        <h2 id="certificates" className="ranking__heading t-title">
          {t.certificates}
        </h2>
        <ul className="ranking__badges">
          {r.certificates.map((c) => (
            <li key={c.id} className="ranking__badge glass-dark">
              {mode === 'rich' ? (
                <MetalShape variant={c.shape} size={68} />
              ) : (
                <Award size={28} aria-hidden="true" color="#7fd3ea" />
              )}
              <span className="t-small">{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ranking__section" aria-labelledby="contributions">
        <h2 id="contributions" className="ranking__heading t-title">
          {t.contributions}
        </h2>
        <ContributionsMap countries={r.countries} />
        <p className="ranking__summary">{t.summary(r.countries.length, regions, r.stats.contributions)}</p>
        <div className="ranking__people glass-dark">
          <p className="t-small ranking__muted">{t.people}</p>
          <p className="ranking__people-value expert t-quote">{en.numbers(r.exposedPeople)}</p>
          <p className="t-small ranking__muted">{t.peopleNote}</p>
        </div>
      </section>

      <section className="ranking__section" aria-labelledby="stats">
        <h2 id="stats" className="ranking__heading t-title">
          {t.stats}
        </h2>
        <ul className="ranking__stats">
          <Stat label={t.statContributions} value={String(r.stats.contributions)} />
          <Stat label={t.statResolved} value={String(r.stats.resolvedForecasts)} />
          <Stat
            label={t.statBrier}
            value={r.stats.brier.toFixed(2)}
            note={`${t.statBaseline(r.stats.baselineBrier)}. ${t.statBrierNote}.`}
          />
          <Stat label={t.statRounds} value={String(r.stats.roundsJoined)} />
        </ul>
        <p className="t-small ranking__muted ranking__synthetic">{t.synthetic}</p>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className="ranking__stat glass-dark">
      <span className="t-small ranking__muted">{label}</span>
      <span className="ranking__stat-value">{value}</span>
      {note && <span className="t-small ranking__muted">{note}</span>}
    </li>
  );
}

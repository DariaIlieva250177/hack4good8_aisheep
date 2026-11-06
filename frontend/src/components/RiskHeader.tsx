import type { Risk } from '../data/types';
import { RiskImage } from './RiskImage';
import { RiskChips } from './RiskCard';
import { en } from '../i18n/en';
import './RiskHeader.css';

/** Compact risk header for Answer detail and Community topic. */
export function RiskHeader({ risk, questionId }: { risk: Risk; questionId?: string }) {
  return (
    <section className="risk-header soft-card" aria-labelledby={`${risk.id}-header-title`}>
      <RiskImage family={risk.family} image={risk.image} variant="compact" />
      <div className="risk-header__body">
        <RiskChips risk={risk} />
        <h2 id={`${risk.id}-header-title`} className="risk-header__title t-title">
          {risk.title}
        </h2>
        <p id={questionId} className="expert t-quote">
          {en.card.question}
        </p>
      </div>
    </section>
  );
}

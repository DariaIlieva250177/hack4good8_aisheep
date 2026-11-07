import type { ReactNode } from 'react';
import type { Risk, Verdict } from '../data/types';
import { RiskImage } from './RiskImage';
import { AreaChip, FamilyChip, LevelChip, VeryHighBadge } from './Chips';
import { VerdictButtons } from './VerdictButtons';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './RiskCard.css';

interface RiskCardProps {
  risk: Risk;
  verdict: Verdict | null;
  /** Tapping a verdict sends it */
  onVerdict: (v: Verdict) => void;
  /** Swipe hint drawn over the image */
  overlay?: ReactNode;
}

export function RiskCard({ risk, verdict, onVerdict, overlay }: RiskCardProps) {
  const titleId = `risk-${risk.id}-title`;

  return (
    <article className={`risk-card soft-card${risk.level === 'High' ? ' risk-glow' : ''}`} aria-labelledby={titleId}>
      <RiskImage family={risk.family} image={risk.image} overlay={overlay} />
      <div className="risk-card__body">
        <RiskChips risk={risk} />
        <h2 id={titleId} className="risk-card__title t-title">
          {risk.title}
        </h2>
        <p className="risk-card__question expert t-quote">{en.card.question}</p>
        <VerdictButtons value={verdict} onChange={onVerdict} labelledBy={titleId} />
      </div>
    </article>
  );
}

export function RiskChips({ risk }: { risk: Risk }) {
  const { mode } = useMode();
  return (
    <div className="chip-row">
      <LevelChip level={risk.level} />
      <FamilyChip family={risk.family} />
      <AreaChip area={risk.area} />
      {risk.probability === 'Very High' && mode === 'lite' && <VeryHighBadge />}
      {risk.probability === 'Very High' && mode === 'rich' && <span className="sr-only">{en.veryHigh}</span>}
      <span className="chip-row__id">{risk.id}</span>
    </div>
  );
}

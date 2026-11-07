import type { ReactNode } from 'react';
import type { Risk } from '../data/types';
import { RiskImage } from './RiskImage';
import { AreaChip, FamilyChip, LevelChip, VeryHighBadge } from './Chips';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './RiskCard.css';

interface RiskCardProps {
  risk: Risk;
  /** Swipe hint drawn over the image */
  overlay?: ReactNode;
  /** Small label in the top-right corner, e.g. "1/4" */
  counter?: string;
}

/**
 * Colour-block card: the whole card takes the risk level's colour, with the
 * illustration on top, the level badge over it, and outlined chips.
 */
export function RiskCard({ risk, overlay, counter }: RiskCardProps) {
  const titleId = `risk-${risk.id}-title`;
  const level = risk.level.toLowerCase();

  return (
    <article className={`risk-card risk-card--${level}`} aria-labelledby={titleId}>
      <div className="risk-card__media">
        <RiskImage family={risk.family} image={risk.image} overlay={overlay} plain />
        <span className="risk-card__badge">{en.levels[risk.level]}</span>
        {counter && <span className="risk-card__counter">{counter}</span>}
      </div>
      <div className="risk-card__body">
        <div className="risk-card__chips">
          <span className="risk-card__chip">{en.families[risk.family]}</span>
          <span className="risk-card__chip">{risk.area}</span>
          {risk.probability === 'Very High' && <span className="risk-card__chip">{en.veryHigh}</span>}
        </div>
        <h2 id={titleId} className="risk-card__title">
          {risk.title}
        </h2>
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

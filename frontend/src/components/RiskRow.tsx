import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Risk } from '../data/types';
import { RiskImage } from './RiskImage';
import { RiskWaves } from './RiskWaves';
import { LevelChip, VeryHighBadge } from './Chips';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './RiskRow.css';

interface RiskRowProps {
  risk: Risk;
  to: string;
  /** Line under the chips, e.g. member count */
  meta?: ReactNode;
  /** Marker next to the level chip, e.g. unread count */
  marker?: ReactNode;
}

/** A list row for a risk: blended thumbnail, two-line title, thin level edge. */
export function RiskRow({ risk, to, meta, marker }: RiskRowProps) {
  const { mode } = useMode();
  const veryHigh = risk.probability === 'Very High';

  return (
    <li>
      <Link to={to} className={`risk-row risk-row--${risk.level.toLowerCase()}`}>
        <RiskImage family={risk.family} image={risk.image} variant="thumb" decorative />
        <span className="risk-row__text">
          <span className="risk-row__title">{risk.title}</span>
          <span className="risk-row__meta t-small">
            <LevelChip level={risk.level} />
            {veryHigh && mode === 'rich' && (
              <>
                <RiskWaves size="row" />
                <span className="sr-only">{en.veryHigh}</span>
              </>
            )}
            {veryHigh && mode === 'lite' && <VeryHighBadge />}
            {marker}
          </span>
          {meta && <span className="risk-row__sub t-small">{meta}</span>}
        </span>
        <ChevronRight className="risk-row__chevron" size={20} aria-hidden="true" />
      </Link>
    </li>
  );
}

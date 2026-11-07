import { useState } from 'react';
import type { Risk } from '../data/types';
import { RiskCard } from './RiskCard';
import './FlipRiskCard.css';

/**
 * The Risks-tab card as a page header: tap (or Enter / Space) to turn it over
 * and see the triggers. Used on the Answer page and in every community chat.
 */
export function FlipRiskCard({ risk }: { risk: Risk }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped((f) => !f);

  return (
    <div
      className="flip-risk-card"
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <RiskCard risk={risk} flipped={flipped} />
    </div>
  );
}

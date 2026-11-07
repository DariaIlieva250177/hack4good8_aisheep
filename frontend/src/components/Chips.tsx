import type { Family, RiskLevel } from '../data/types';
import { FAMILIES } from '../data/families';
import { en } from '../i18n/en';
import './Chips.css';

export function LevelChip({ level }: { level: RiskLevel }) {
  return <span className={`chip chip--level-${level.toLowerCase()}`}>{en.levels[level]}</span>;
}

export function FamilyChip({ family }: { family: Family }) {
  const f = FAMILIES[family];
  return (
    <span className="chip chip--family" style={{ background: f.tint ?? 'transparent', color: f.label }}>
      <span className="chip__dot" style={{ background: f.label }} aria-hidden="true" />
      {en.families[family]}
    </span>
  );
}

export function AreaChip({ area }: { area: string }) {
  return <span className="chip chip--area">{area}</span>;
}

/** Text stand-in for the waves, used in lite mode. */
export function VeryHighBadge() {
  return <span className="chip chip--veryhigh">{en.veryHigh}</span>;
}

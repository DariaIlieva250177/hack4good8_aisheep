import type { Verdict } from '../data/types';
import { en } from '../i18n/en';
import { GlassButton } from './glass/GlassButton';
import './VerdictButtons.css';

const VERDICTS: Verdict[] = ['yes', 'partly', 'no'];

interface VerdictButtonsProps {
  value: Verdict | null;
  onChange: (v: Verdict) => void;
  labelledBy?: string;
}

export function VerdictButtons({ value, onChange, labelledBy }: VerdictButtonsProps) {
  return (
    <div className="verdicts" role="group" aria-labelledby={labelledBy}>
      {VERDICTS.map((v) => (
        <GlassButton key={v} className="verdicts__btn" aria-pressed={value === v} onClick={() => onChange(v)}>
          {value === v && <span className="you-dot" aria-hidden="true" />}
          {en.verdicts[v]}
        </GlassButton>
      ))}
    </div>
  );
}

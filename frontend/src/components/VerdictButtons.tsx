import type { Verdict } from '../data/types';
import { en } from '../i18n/en';
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
        <button
          key={v}
          type="button"
          className="btn btn-soft verdicts__btn"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {value === v && <span className="you-dot" aria-hidden="true" />}
          {en.verdicts[v]}
        </button>
      ))}
    </div>
  );
}

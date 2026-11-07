import type { Verdict } from '../data/types';
import { en } from '../i18n/en';
import { Check, X, type LucideIcon } from 'lucide-react';
import { GlassButton } from './glass/GlassButton';
import './VerdictButtons.css';

const VERDICTS: Verdict[] = ['yes', 'no'];

/** Agree and Disagree glyphs sit in a solid disc. */
const ICONS: Record<Verdict, { Icon: LucideIcon; disc: boolean }> = {
  yes: { Icon: Check, disc: true },
  no: { Icon: X, disc: true },
};

interface VerdictButtonsProps {
  value: Verdict | null;
  onChange: (v: Verdict) => void;
  labelledBy?: string;
  /** 'outline': plain pills in the surrounding text colour (colour-block cards) */
  variant?: 'glass' | 'outline';
  /** Which verdicts to offer (default Agree, Disagree) */
  options?: Verdict[];
  /** Label overrides */
  labels?: Partial<Record<Verdict, string>>;
  /** false: no moving edge light on the glass buttons */
  shine?: boolean;
}

export function VerdictButtons({
  value,
  onChange,
  labelledBy,
  variant = 'glass',
  options = VERDICTS,
  labels = {},
  shine = true,
}: VerdictButtonsProps) {
  const label = (v: Verdict) => labels[v] ?? en.verdicts[v];
  const columns = { gridTemplateColumns: `repeat(${options.length}, 1fr)` };
  if (variant === 'outline') {
    return (
      <div className="verdicts verdicts--outline" role="group" aria-labelledby={labelledBy} style={columns}>
        {options.map((v) => {
          const { Icon, disc } = ICONS[v];
          return (
            <button key={v} type="button" className="verdicts__pill" aria-pressed={value === v} onClick={() => onChange(v)}>
              <span className={`verdicts__icon${disc ? ' verdicts__icon--disc' : ''}`} aria-hidden="true">
                <Icon size={disc ? 14 : 20} strokeWidth={3} />
              </span>
              {label(v)}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="verdicts" role="group" aria-labelledby={labelledBy} style={columns}>
      {options.map((v) => (
        <GlassButton key={v} className="verdicts__btn" shine={shine} aria-pressed={value === v} onClick={() => onChange(v)}>
          {value === v && <span className="you-dot" aria-hidden="true" />}
          {label(v)}
        </GlassButton>
      ))}
    </div>
  );
}

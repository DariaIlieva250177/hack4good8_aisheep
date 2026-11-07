import type { Verdict } from '../data/types';
import { en } from '../i18n/en';
import { Check, EqualApproximately, X, type LucideIcon } from 'lucide-react';
import { GlassButton } from './glass/GlassButton';
import './VerdictButtons.css';

const VERDICTS: Verdict[] = ['yes', 'partly', 'no'];

/** Yes and No sit in a solid white disc; Partly is a bare glyph. */
const ICONS: Record<Verdict, { Icon: LucideIcon; disc: boolean }> = {
  yes: { Icon: Check, disc: true },
  partly: { Icon: EqualApproximately, disc: false },
  no: { Icon: X, disc: true },
};

interface VerdictButtonsProps {
  value: Verdict | null;
  onChange: (v: Verdict) => void;
  labelledBy?: string;
  /** 'outline': plain pills in the surrounding text colour (colour-block cards) */
  variant?: 'glass' | 'outline';
  /** Which verdicts to offer (default Yes, Partly, No) */
  options?: Verdict[];
  /** Label overrides, e.g. { yes: 'Agree', no: 'Disagree' } */
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

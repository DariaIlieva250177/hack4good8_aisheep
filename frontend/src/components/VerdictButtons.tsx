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
}

export function VerdictButtons({ value, onChange, labelledBy, variant = 'glass' }: VerdictButtonsProps) {
  if (variant === 'outline') {
    return (
      <div className="verdicts verdicts--outline" role="group" aria-labelledby={labelledBy}>
        {VERDICTS.map((v) => {
          const { Icon, disc } = ICONS[v];
          return (
            <button key={v} type="button" className="verdicts__pill" aria-pressed={value === v} onClick={() => onChange(v)}>
              <span className={`verdicts__icon${disc ? ' verdicts__icon--disc' : ''}`} aria-hidden="true">
                <Icon size={disc ? 14 : 20} strokeWidth={3} />
              </span>
              {en.verdicts[v]}
            </button>
          );
        })}
      </div>
    );
  }
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

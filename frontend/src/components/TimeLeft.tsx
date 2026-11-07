import { Timer } from 'lucide-react';
import { en } from '../i18n/en';
import './TimeLeft.css';

/**
 * "2d 14h left" chip for an active chat. Blue normally, amber under 12 hours,
 * red with minutes:seconds under 1 hour.
 */
export function TimeLeft({ endsAt, now }: { endsAt: number; now: number }) {
  const ms = Math.max(0, endsAt - now);
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v: number) => String(v).padStart(2, '0');

  let text: string;
  let tone: 'calm' | 'soon' | 'urgent';
  if (s >= 24 * 3600) {
    text = `${d}d ${h}h`;
    tone = 'calm';
  } else if (s >= 3600) {
    text = `${h}h ${m}m`;
    tone = s < 12 * 3600 ? 'soon' : 'calm';
  } else {
    text = `${pad(m)}:${pad(sec)}`;
    tone = 'urgent';
  }

  return (
    <span className={`time-left time-left--${tone}`}>
      <Timer size={12} strokeWidth={2.4} aria-hidden="true" />
      {/* Screen readers get a coarse version, not one that changes every second */}
      <span aria-hidden="true">{en.community.left(text)}</span>
      <span className="sr-only">{en.community.leftSr(d, h, m)}</span>
    </span>
  );
}

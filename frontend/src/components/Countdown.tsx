import { useEffect, useState } from 'react';
import { en } from '../i18n/en';
import './Countdown.css';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ to }: { to: string }) {
  const end = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const t = parts(end - now);
  const pad = (v: number) => String(v).padStart(2, '0');
  const units = en.ranking.countdownUnits;

  return (
    <div className="countdown">
      {/* Read once by screen readers, not every second */}
      <span className="sr-only">{en.ranking.countdownSr(t.d, t.h, t.m)}</span>
      <div className="countdown__cells" aria-hidden="true">
        {(['d', 'h', 'm', 's'] as const).map((k) => (
          <div key={k} className="countdown__cell">
            <span className="countdown__value">{pad(t[k])}</span>
            <span className="countdown__unit">{units[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useId } from 'react';
import { useMode } from '../mode/ModeContext';

/*
 * Glossy chrome shapes in ACAPS blues. Decorative only: aria-hidden, and not rendered in lite mode.
 * Placeholder SVGs; swap for files from UI_Images/shapes/ when they exist.
 */

export type MetalVariant = 'coil' | 'ring' | 'knot' | 'drop';

const TUBES: Record<'coil' | 'knot', { viewBox: string; d: string; width: number }> = {
  coil: {
    viewBox: '0 0 320 220',
    d: 'M38 168 C 20 70, 150 20, 196 70 C 240 118, 168 190, 122 150 C 76 110, 150 30, 228 48 C 290 62, 300 140, 262 176',
    width: 40,
  },
  knot: {
    viewBox: '0 0 120 120',
    d: 'M60 60 C 40 28, 14 34, 16 60 C 18 86, 44 90, 60 60 C 76 30, 102 34, 104 60 C 106 86, 80 92, 60 60 Z',
    width: 15,
  },
};

interface MetalShapeProps {
  variant: MetalVariant;
  size?: number;
  className?: string;
}

export function MetalShape({ variant, size = 96, className }: MetalShapeProps) {
  const { mode } = useMode();
  const uid = useId().replace(/:/g, '');
  if (mode === 'lite') return null;

  const body = `metal-body-${uid}`;
  const soft = `metal-soft-${uid}`;
  const shine = `metal-shine-${uid}`;

  const defs = (
    <defs>
      <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#00263f" />
        <stop offset="0.22" stopColor="#0196ba" />
        <stop offset="0.42" stopColor="#0096ba" />
        <stop offset="0.5" stopColor="#dff7ff" />
        <stop offset="0.58" stopColor="#0096ba" />
        <stop offset="0.8" stopColor="#0196ba" />
        <stop offset="1" stopColor="#00263f" />
      </linearGradient>
      <radialGradient id={shine} cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.18" stopColor="#bfefff" />
        <stop offset="0.45" stopColor="#0096ba" />
        <stop offset="0.8" stopColor="#0196ba" />
        <stop offset="1" stopColor="#002239" />
      </radialGradient>
      <filter id={soft} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
    </defs>
  );

  if (variant === 'coil' || variant === 'knot') {
    const { viewBox, d, width } = TUBES[variant];
    return (
      <svg className={className} viewBox={viewBox} width={size} height={size} aria-hidden="true" focusable="false">
        {defs}
        <path d={d} fill="none" stroke="#001f33" strokeOpacity="0.22" strokeWidth={width} strokeLinecap="round" transform="translate(4 9)" filter={`url(#${soft})`} />
        <path d={d} fill="none" stroke={`url(#${body})`} strokeWidth={width} strokeLinecap="round" />
        <path d={d} fill="none" stroke="#002239" strokeOpacity="0.45" strokeWidth={width * 0.3} strokeLinecap="round" transform={`translate(${width * 0.12} ${width * 0.18})`} filter={`url(#${soft})`} />
        <path d={d} fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth={width * 0.16} strokeLinecap="round" transform={`translate(${-width * 0.14} ${-width * 0.2})`} filter={`url(#${soft})`} />
        <path d={d} fill="none" stroke="#e6faff" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" transform={`translate(${-width * 0.3} ${-width * 0.34})`} />
      </svg>
    );
  }

  if (variant === 'ring') {
    return (
      <svg className={className} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
        {defs}
        <circle cx="62" cy="66" r="34" fill="none" stroke="#001f33" strokeOpacity="0.25" strokeWidth="20" filter={`url(#${soft})`} />
        <circle cx="60" cy="60" r="34" fill="none" stroke={`url(#${body})`} strokeWidth="20" />
        <circle cx="60" cy="60" r="43" fill="none" stroke="#002239" strokeOpacity="0.4" strokeWidth="2" />
        <path d="M33 44 A 34 34 0 0 1 72 27" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="4" strokeLinecap="round" filter={`url(#${soft})`} />
        <path d="M88 78 A 34 34 0 0 1 64 94" fill="none" stroke="#bfefff" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
      {defs}
      <ellipse cx="62" cy="104" rx="30" ry="6" fill="#001f33" opacity="0.2" filter={`url(#${soft})`} />
      <path d="M60 12 C 78 38, 94 56, 94 74 A 34 34 0 0 1 26 74 C 26 56, 42 38, 60 12 Z" fill={`url(#${shine})`} />
      <ellipse cx="46" cy="66" rx="7" ry="14" fill="#fff" opacity="0.85" transform="rotate(18 46 66)" filter={`url(#${soft})`} />
      <path d="M78 88 A 26 26 0 0 1 56 100" fill="none" stroke="#bfefff" strokeOpacity="0.7" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

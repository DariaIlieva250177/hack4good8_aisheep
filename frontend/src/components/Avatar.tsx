import type { IdentityMode } from '../data/types';
import './Avatar.css';

/* Generated avatars only: initials or an abstract shape. Never photos. */

const COLOURS = ['#0196ba', '#2f6385', '#285f58', '#43623f', '#475670', '#4d5257', '#5f5c36'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 1).toUpperCase();
}

interface AvatarProps {
  name: string;
  identity?: IdentityMode;
  size?: number;
  /** Ring in --acaps-blue: this is you */
  you?: boolean;
  seed?: string;
}

export function Avatar({ name, identity = 'pseudonym', size = 44, you = false, seed }: AvatarProps) {
  const h = hash(seed ?? name);
  const bg = COLOURS[h % COLOURS.length];
  const style = { inlineSize: size, blockSize: size, background: bg, fontSize: size * 0.4 };

  return (
    <span className={`avatar${you ? ' avatar--you' : ''}`} style={style} aria-hidden="true">
      {identity === 'anonymous' ? <AbstractMark seed={h} /> : initials(name)}
    </span>
  );
}

/** A few overlapping circles, deterministic per seed. */
function AbstractMark({ seed }: { seed: number }) {
  const a = 30 + (seed % 40);
  const b = 60 - (seed % 25);
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx={a} cy={b} r="30" fill="rgba(255,255,255,0.28)" />
      <circle cx={100 - a} cy={100 - b} r="22" fill="rgba(255,255,255,0.5)" />
      <circle cx="50" cy="50" r="9" fill="#fff" />
    </svg>
  );
}

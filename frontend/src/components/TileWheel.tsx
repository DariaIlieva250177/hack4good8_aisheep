import { useRef } from 'react';
import { motion, useAnimationFrame, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import type { Family, ImageCategory } from '../data/types';
import { IMAGE_CATEGORIES } from '../data/families';
import { RiskImage } from './RiskImage';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './TileWheel.css';

/*
 * Risk tiles on the rim of a large wheel that keeps rolling sideways.
 * Drag to spin it; it eases back to its slow roll after you let go.
 */

const CATEGORIES: ImageCategory[] = [
  'border', 'drought', 'flood', 'displacement', 'economic',
  'health', 'storm', 'pests', 'political', 'earthquake', 'food', 'infrastructure',
];
const RADIUS = 520; // px from the tile to the wheel centre
const STEP = 13; // degrees between tiles
const SPAN = CATEGORIES.length * STEP;
const AUTO_SPEED = 5; // degrees per second
const DEG_PER_PX = 180 / Math.PI / RADIUS;

export function TileWheel() {
  const { mode, reducedMotion } = useMode();
  const angle = useMotionValue(0);
  const velocity = useRef(reducedMotion ? 0 : AUTO_SPEED);
  const drag = useRef<{ x: number; t: number } | null>(null);

  useAnimationFrame((_, delta) => {
    if (drag.current) return;
    const target = reducedMotion ? 0 : AUTO_SPEED;
    // Ease the fling back toward the slow roll.
    velocity.current += (target - velocity.current) * Math.min(1, delta / 600);
    angle.set(angle.get() + (velocity.current * delta) / 1000);
  });

  if (mode === 'lite') return null;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, t: performance.now() };
    velocity.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const now = performance.now();
    const dDeg = (e.clientX - drag.current.x) * DEG_PER_PX;
    angle.set(angle.get() + dDeg);
    velocity.current = (dDeg / Math.max(1, now - drag.current.t)) * 1000;
    drag.current = { x: e.clientX, t: now };
  };
  const onPointerUp = () => {
    drag.current = null;
    velocity.current = Math.max(-120, Math.min(120, velocity.current));
  };

  return (
    <div
      className="tile-wheel"
      role="img"
      aria-label={en.login.tilesLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {CATEGORIES.map((category, i) => (
        <Tile key={category} index={i} angle={angle} category={category} family={IMAGE_CATEGORIES[category].family} />
      ))}
    </div>
  );
}

function Tile({ index, angle, category, family }: { index: number; angle: MotionValue<number>; category: ImageCategory; family: Family }) {
  // Place each tile on the rim, wrapping so the wheel never runs out.
  const rotate = useTransform(angle, (a) => {
    const raw = (((index * STEP + a) % SPAN) + SPAN) % SPAN;
    return raw - SPAN / 2;
  });
  const opacity = useTransform(rotate, (r) => (Math.abs(r) > 40 ? 0 : 1));

  return (
    <motion.div className="tile-wheel__tile soft-card" style={{ rotate, opacity, transformOrigin: `50% ${RADIUS}px` }}>
      <RiskImage family={family} image={category} variant="tile" decorative />
    </motion.div>
  );
}

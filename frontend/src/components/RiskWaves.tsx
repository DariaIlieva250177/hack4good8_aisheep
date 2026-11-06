import { useEffect, useRef } from 'react';
import { useMode } from '../mode/ModeContext';
import './RiskWaves.css';

/*
 * Fine red particle strands swirling slowly in a ring, like silk or smoke.
 * Marks risks with Very High probability. One animated instance at a time,
 * paused off-screen, capped at 30 fps, a still frame under reduced motion.
 */

const RED = '184, 22, 60';
const STRANDS = 7;
const POINTS = 260;
const THREADS = 5;
const FRAME_MS = 1000 / 30;

interface Strand {
  a1: number; a2: number; a3: number;
  f1: number; f2: number; f3: number;
  w1: number; w2: number; w3: number;
  rot: number; spin: number; gap: number; squash: number;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(1043);
const STRAND_PARAMS: Strand[] = Array.from({ length: STRANDS }, () => ({
  a1: 0.08 + rand() * 0.14,
  a2: 0.05 + rand() * 0.1,
  a3: 0.02 + rand() * 0.05,
  f1: rand() * Math.PI * 2,
  f2: rand() * Math.PI * 2,
  f3: rand() * Math.PI * 2,
  w1: 0.12 + rand() * 0.18,
  w2: 0.08 + rand() * 0.15,
  w3: 0.2 + rand() * 0.25,
  rot: rand() * Math.PI * 2,
  spin: (rand() - 0.5) * 0.06,
  gap: 0.008 + rand() * 0.02,
  squash: 0.82 + rand() * 0.2,
}));

/** Fixed per-particle jitter so strands look grainy, not like lines. */
const JITTER = Float32Array.from({ length: STRANDS * POINTS * THREADS * 2 }, () => rand() - 0.5);

function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, small: boolean) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h * 0.5;
  const R = Math.min(w, h) * (small ? 0.34 : 0.36);
  const dot = small ? 0.8 : 1.15;
  const points = small ? 90 : POINTS;
  const threads = small ? 2 : THREADS;
  let j = 0;

  for (let s = 0; s < STRANDS; s++) {
    const p = STRAND_PARAMS[s];
    const rot = p.rot + t * p.spin;
    for (let i = 0; i < points; i++) {
      const th = (i / points) * Math.PI * 2;
      const wave =
        1 +
        p.a1 * Math.sin(2 * th + p.f1 + t * p.w1) +
        p.a2 * Math.sin(3 * th + p.f2 - t * p.w2) +
        p.a3 * Math.sin(5 * th + p.f3 + t * p.w3);
      // Strands thicken and thin along their length, like silk catching light.
      const glow = 0.5 + 0.5 * Math.sin(2 * th + p.f3 + t * 0.21 + s);
      const alpha = 0.04 + 0.5 * glow * glow * glow;
      const spread = p.gap * (0.4 + glow);
      ctx.fillStyle = `rgba(${RED}, ${alpha.toFixed(3)})`;
      for (let k = 0; k < threads; k++) {
        const r = R * (wave + (k - threads / 2) * spread);
        const jx = JITTER[j++ % JITTER.length] * (small ? 0.6 : 2.2);
        const jy = JITTER[j++ % JITTER.length] * (small ? 0.6 : 2.2);
        const x = cx + Math.cos(th + rot) * r + jx;
        const y = cy + Math.sin(th + rot) * r * p.squash + jy;
        ctx.fillRect(x, y, dot, dot);
      }
    }
  }
}

/* Only one animated instance on screen at a time. */
let activeOwner: symbol | null = null;

interface RiskWavesProps {
  /** Small static version for list rows */
  size?: 'card' | 'row';
}

export function RiskWaves({ size = 'card' }: RiskWavesProps) {
  const { mode, reducedMotion } = useMode();
  const ref = useRef<HTMLCanvasElement>(null);
  const small = size === 'row';
  const animate = !small && !reducedMotion;

  useEffect(() => {
    if (mode === 'lite') return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const me = Symbol('waves');
    let raf = 0;
    let last = 0;
    let visible = false;
    let w = 0;
    let h = 0;
    const start = performance.now() - 12000; // start mid-swirl

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(ctx, w, h, 14, small);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      drawFrame(ctx, w, h, (now - start) / 1000, small);
    };

    const play = () => {
      if (!animate || raf || !visible) return;
      if (activeOwner && activeOwner !== me) return;
      activeOwner = me;
      raf = requestAnimationFrame(loop);
    };

    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (activeOwner === me) activeOwner = null;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else pause();
    });
    io.observe(canvas);

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
    };
  }, [mode, animate, small]);

  if (mode === 'lite') return null;
  return <canvas ref={ref} className={`risk-waves risk-waves--${size}`} aria-hidden="true" />;
}

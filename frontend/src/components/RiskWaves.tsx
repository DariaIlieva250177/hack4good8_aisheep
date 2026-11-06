import { useEffect, useRef } from 'react';
import { useMode } from '../mode/ModeContext';
import './RiskWaves.css';

/*
 * Fine red particle strands swirling slowly in a ring, like silk or smoke.
 * Marks risks with Very High probability. One animated instance at a time,
 * paused off-screen, capped at 30 fps, a still frame under reduced motion.
 */

const RED = '184, 22, 60';
const STRANDS = 6;
const STEPS = 180; // points along each thread
const SEGMENT = 6; // points per stroke, so alpha can vary along the thread
const FRAME_MS = 1000 / 30;

interface Strand {
  a1: number; a2: number; a3: number;
  f1: number; f2: number; f3: number;
  w1: number; w2: number; w3: number;
  rot: number; spin: number; gap: number;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(1066);
const STRAND_PARAMS: Strand[] = Array.from({ length: STRANDS }, () => ({
  a1: 0.08 + rand() * 0.12,
  a2: 0.04 + rand() * 0.08,
  a3: 0.02 + rand() * 0.04,
  f1: rand() * Math.PI * 2,
  f2: rand() * Math.PI * 2,
  f3: rand() * Math.PI * 2,
  w1: 0.1 + rand() * 0.16,
  w2: 0.07 + rand() * 0.12,
  w3: 0.15 + rand() * 0.2,
  rot: rand() * Math.PI * 2,
  spin: (rand() - 0.5) * 0.05,
  gap: 0.06 + rand() * 0.07,
}));

/** Fixed grain so particles shimmer around the threads instead of flickering. */
const GRAIN = Float32Array.from({ length: 4096 }, () => rand() - 0.5);

function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, small: boolean) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rx = small ? w * 0.36 : Math.min(w * 0.3, h * 0.62);
  const ry = small ? h * 0.36 : h * 0.36;
  const threads = small ? 3 : 12;
  const steps = small ? 72 : STEPS;
  ctx.lineWidth = small ? 0.7 : 0.6;
  ctx.lineCap = 'round';
  let g = 0;

  for (let s = 0; s < STRANDS; s++) {
    const p = STRAND_PARAMS[s];
    const rot = p.rot + t * p.spin;
    // Where a strand catches the light, its threads bunch into a bright ribbon.
    const glowAt = (th: number) => {
      const v = 0.5 + 0.5 * Math.sin(2 * th + p.f3 + t * 0.19 + s * 1.7);
      return v * v * v;
    };
    const point = (th: number, offset: number): [number, number] => {
      const glow = glowAt(th);
      const r =
        1 +
        p.a1 * Math.sin(2 * th + p.f1 + t * p.w1) +
        p.a2 * Math.sin(3 * th + p.f2 - t * p.w2) +
        p.a3 * Math.sin(5 * th + p.f3 + t * p.w3) +
        offset * p.gap * (1.6 - 1.1 * glow);
      const a = th + rot;
      return [cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry];
    };

    for (let k = 0; k < threads; k++) {
      const offset = k / (threads - 1 || 1) - 0.5;
      for (let i = 0; i < steps; i += SEGMENT) {
        const mid = ((i + SEGMENT / 2) / steps) * Math.PI * 2;
        const alpha = 0.015 + 0.26 * glowAt(mid);
        if (alpha < 0.03) continue;
        ctx.strokeStyle = `rgba(${RED}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let j = 0; j <= SEGMENT; j++) {
          const [x, y] = point(((i + j) / steps) * Math.PI * 2, offset);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // A dusting of particles drifting off each strand.
    if (!small) {
      for (let i = 0; i < 160; i++) {
        const th = ((i + GRAIN[g++ & 4095] * 3) / 160) * Math.PI * 2;
        const glow = glowAt(th);
        const [x, y] = point(th, GRAIN[g++ & 4095] * 2.4);
        ctx.fillStyle = `rgba(${RED}, ${(0.08 + 0.4 * glow).toFixed(3)})`;
        ctx.fillRect(x + GRAIN[g++ & 4095] * 4, y + GRAIN[g++ & 4095] * 4, 1.2, 1.2);
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

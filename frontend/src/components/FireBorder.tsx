import { useEffect, useRef } from 'react';
import { useMode } from '../mode/ModeContext';
import './FireBorder.css';

/*
 * Red silk strands flowing around the edge of a High risk card, like the
 * "fireball" reference: threads bunch into bright ribbons that travel along
 * the border while particles drift off it.
 * Drawn above the card's soft shadow but clipped to the outside of the card,
 * so the content underneath is never covered.
 * One animated instance at a time, 30 fps, paused off-screen, a still frame
 * under reduced motion, nothing in lite mode.
 */

const PAD = 34; // canvas overhang around the card
const STRANDS = 5;
const THREADS = 9;
const STEPS = 280;
const SEGMENT = 7;
const PARTICLES = 260;
const FRAME_MS = 1000 / 30;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(1043);
const STRAND_PARAMS = Array.from({ length: STRANDS }, () => ({
  k1: 3 + Math.floor(rand() * 4),
  k2: 5 + Math.floor(rand() * 5),
  a1: 5 + rand() * 8,
  a2: 2 + rand() * 5,
  f1: rand() * Math.PI * 2,
  f2: rand() * Math.PI * 2,
  f3: rand() * Math.PI * 2,
  w1: 0.4 + rand() * 0.5,
  w2: 0.3 + rand() * 0.5,
  flow: (rand() > 0.5 ? 1 : -1) * (0.025 + rand() * 0.03), // laps per second
  gap: 1.4 + rand() * 1.4,
  base: 9 + rand() * 7,
}));
const DUST = Array.from({ length: PARTICLES }, () => ({ u: rand(), phase: rand(), drift: 8 + rand() * 18, size: 0.8 + rand() * 0.9 }));

/** A point on a rounded rectangle's perimeter at fraction u, with its outward normal. */
function perimeter(w: number, h: number, r: number) {
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  const total = 2 * sw + 2 * sh + 4 * arc;
  const corner = (cx: number, cy: number, start: number, d: number): [number, number, number, number] => {
    const a = start + d / r;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return [cx + nx * r, cy + ny * r, nx, ny];
  };
  return (u: number): [number, number, number, number] => {
    let d = (((u % 1) + 1) % 1) * total;
    if (d < sw) return [r + d, 0, 0, -1];
    d -= sw;
    if (d < arc) return corner(w - r, r, -Math.PI / 2, d);
    d -= arc;
    if (d < sh) return [w, r + d, 1, 0];
    d -= sh;
    if (d < arc) return corner(w - r, h - r, 0, d);
    d -= arc;
    if (d < sw) return [w - r - d, h, 0, 1];
    d -= sw;
    if (d < arc) return corner(r, h - r, Math.PI / 2, d);
    d -= arc;
    if (d < sh) return [0, h - r - d, -1, 0];
    d -= sh;
    return corner(r, r, Math.PI, d);
  };
}

function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number, t: number, rgb: string) {
  ctx.clearRect(0, 0, w + PAD * 2, h + PAD * 2);
  ctx.save();
  // Everything outside the card, nothing inside it.
  ctx.beginPath();
  ctx.rect(0, 0, w + PAD * 2, h + PAD * 2);
  ctx.roundRect(PAD + 1, PAD + 1, w - 2, h - 2, radius);
  ctx.clip('evenodd');
  const at = perimeter(w, h, radius);
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';

  for (let s = 0; s < STRANDS; s++) {
    const p = STRAND_PARAMS[s];
    const shift = t * p.flow;
    // Bright ribbons travel around the edge.
    const glowAt = (u: number) => {
      const v = 0.5 + 0.5 * Math.sin(Math.PI * 2 * 2 * (u - shift) + p.f3 + s);
      return v * v * v;
    };
    const point = (u: number, thread: number): [number, number] => {
      const [x, y, nx, ny] = at(u);
      const glow = glowAt(u);
      const out =
        p.base +
        p.a1 * Math.sin(Math.PI * 2 * p.k1 * u + p.f1 + t * p.w1) +
        p.a2 * Math.sin(Math.PI * 2 * p.k2 * u + p.f2 - t * p.w2) +
        thread * p.gap * (1.7 - 1.2 * glow);
      return [PAD + x + nx * out, PAD + y + ny * out];
    };

    for (let k = 0; k < THREADS; k++) {
      const thread = k - (THREADS - 1) / 2;
      for (let i = 0; i < STEPS; i += SEGMENT) {
        const alpha = 0.04 + 0.42 * glowAt((i + SEGMENT / 2) / STEPS);
        if (alpha < 0.035) continue;
        ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let j = 0; j <= SEGMENT; j++) {
          const [x, y] = point((i + j) / STEPS, thread);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  // Embers drifting outward and fading.
  for (const d of DUST) {
    const life = (t * 0.25 + d.phase) % 1;
    const u = d.u + Math.sin(t * 0.3 + d.phase * 6) * 0.004;
    const [x, y, nx, ny] = at(u);
    const out = 8 + life * d.drift;
    ctx.fillStyle = `rgba(${rgb}, ${(0.55 * (1 - life)).toFixed(3)})`;
    ctx.fillRect(PAD + x + nx * out, PAD + y + ny * out, d.size, d.size);
  }
  ctx.restore();
}

let activeOwner: symbol | null = null;

export function FireBorder({ radius = 32 }: { radius?: number }) {
  const { mode, reducedMotion } = useMode();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (mode === 'lite') return;
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const me = Symbol('fire');
    let raf = 0;
    let last = 0;
    let visible = false;
    let w = 0;
    let h = 0;
    let rgb = '184, 22, 60';
    const start = performance.now() - 8000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round((w + PAD * 2) * dpr);
      canvas.height = Math.round((h + PAD * 2) * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rgb = getComputedStyle(canvas).getPropertyValue('--fire-rgb').trim() || rgb;
      drawFrame(ctx, w, h, radius, 10, rgb);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME_MS) return;
      last = now;
      drawFrame(ctx, w, h, radius, (now - start) / 1000, rgb);
    };
    const play = () => {
      if (reducedMotion || raf || !visible) return;
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
    ro.observe(host);
    resize();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else pause();
    });
    io.observe(host);

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
    };
  }, [mode, reducedMotion, radius]);

  if (mode === 'lite') return null;
  return <canvas ref={ref} className="fire-border" style={{ inset: -PAD }} aria-hidden="true" />;
}

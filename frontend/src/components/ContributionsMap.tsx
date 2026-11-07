import { useEffect, useRef, useState } from 'react';
import type { CountryContribution } from '../data/types';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './ContributionsMap.css';

/*
 * The expert's contributions as lights on a slowly turning dark globe. Drag to
 * spin it. Lights sit only at country centroids, never at exact places: precise
 * points could identify an expert or expose a community. Lite mode shows a list.
 */

const SIZE = 320;
const START: [number, number] = [20, 10]; // centred near 20°E, 10°N
const SPIN = 6; // degrees per second
const FRAME_MS = 1000 / 30;

type D3 = typeof import('d3-geo');

interface Globe {
  d3: D3;
  land: unknown;
  graticule: unknown;
  lights: { name: string; count: number; at: [number, number] }[];
}

async function loadGlobe(countries: CountryContribution[]): Promise<Globe> {
  const [d3, topojson, atlas] = await Promise.all([
    import('d3-geo'),
    import('topojson-client'),
    import('world-atlas/countries-110m.json'),
  ]);
  const features = topojson.feature(atlas.default, atlas.default.objects.countries).features;
  const lights = countries.flatMap((c) => {
    const f = features.find((x) => String(x.id) === c.isoNumeric);
    return f ? [{ name: c.name, count: c.count, at: d3.geoCentroid(f) }] : [];
  });
  return {
    d3,
    land: topojson.feature(atlas.default, atlas.default.objects.countries),
    graticule: d3.geoGraticule10(),
    lights,
  };
}

function draw(ctx: CanvasRenderingContext2D, g: Globe, rotation: [number, number]) {
  const r = SIZE / 2 - 14;
  const c = SIZE / 2;
  const projection = g.d3
    .geoOrthographic()
    .rotate([-rotation[0], -rotation[1], 0])
    .scale(r)
    .translate([c, c])
    .clipAngle(90)
    .precision(0.6);
  const path = g.d3.geoPath(projection, ctx);

  ctx.clearRect(0, 0, SIZE, SIZE);

  // Atmosphere
  const atmos = ctx.createRadialGradient(c, c, r * 0.9, c, c, r * 1.1);
  atmos.addColorStop(0, 'rgba(0,150,186,0.45)');
  atmos.addColorStop(1, 'rgba(0,150,186,0)');
  ctx.fillStyle = atmos;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Ocean, graticule, land
  ctx.beginPath();
  path({ type: 'Sphere' });
  ctx.fillStyle = '#001f33';
  ctx.fill();
  ctx.beginPath();
  path(g.graticule);
  ctx.strokeStyle = 'rgba(127,211,234,0.1)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.beginPath();
  path(g.land);
  ctx.fillStyle = '#0b3550';
  ctx.fill();
  ctx.strokeStyle = 'rgba(127,211,234,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Light from the upper left, dark on the far limb
  const shade = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
  shade.addColorStop(0, 'rgba(13,74,110,0.5)');
  shade.addColorStop(0.6, 'rgba(0,31,51,0)');
  shade.addColorStop(1, 'rgba(0,12,20,0.6)');
  ctx.beginPath();
  path({ type: 'Sphere' });
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,150,186,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Your lights: blue means "you". Fade out as they turn to the far side.
  ctx.globalCompositeOperation = 'lighter';
  for (const l of g.lights) {
    const distance = g.d3.geoDistance(l.at, rotation);
    if (distance > Math.PI / 2) continue;
    const p = projection(l.at);
    if (!p) continue;
    const fade = Math.min(1, (Math.PI / 2 - distance) / 0.35);
    const radius = 8 + Math.sqrt(l.count) * 6;
    const glow = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], radius);
    glow.addColorStop(0, `rgba(233,251,255,${fade})`);
    glow.addColorStop(0.18, `rgba(127,211,234,${fade})`);
    glow.addColorStop(0.45, `rgba(0,150,186,${0.6 * fade})`);
    glow.addColorStop(1, 'rgba(0,150,186,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p[0] - radius, p[1] - radius, radius * 2, radius * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function ContributionsMap({ countries }: { countries: CountryContribution[] }) {
  const { mode, reducedMotion } = useMode();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [globe, setGlobe] = useState<Globe | null>(null);
  const rotation = useRef<[number, number]>([...START]);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (mode !== 'rich' || globe) return;
    let alive = true;
    loadGlobe(countries).then((g) => alive && setGlobe(g));
    return () => {
      alive = false;
    };
  }, [mode, countries, globe]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || !globe) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = SIZE * dpr;
    el.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, globe, rotation.current);

    let raf = 0;
    let last = 0;
    let visible = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? now - last : 0;
      if (dt && dt < FRAME_MS) return;
      last = now;
      if (!dragging.current && !reducedMotion) rotation.current[0] -= (SPIN * dt) / 1000;
      draw(ctx, globe, rotation.current);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      last = 0;
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [globe, reducedMotion]);

  const list = (
    <ul className={mode === 'rich' ? 'sr-only' : 'contrib-list'}>
      {countries.map((c) => (
        <li key={c.isoNumeric}>
          <span>{c.name}</span>
          <span className="contrib-list__count">{en.ranking.countryCount(c.count)}</span>
        </li>
      ))}
    </ul>
  );

  if (mode === 'lite') return list;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const k = 0.4; // degrees per pixel
    rotation.current[0] -= (e.clientX - dragging.current.x) * k;
    rotation.current[1] = Math.max(-60, Math.min(60, rotation.current[1] + (e.clientY - dragging.current.y) * k));
    dragging.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  return (
    <>
      <div className="contrib-map">
        <canvas
          ref={canvas}
          role="img"
          aria-label={en.ranking.mapLabel(countries.length)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      {list}
    </>
  );
}

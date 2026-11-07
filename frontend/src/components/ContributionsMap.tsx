import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { CountryContribution } from '../data/types';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './ContributionsMap.css';

/*
 * The expert's contributions as lights on a slowly turning dark globe. Drag to
 * spin it; pinch, wheel or +/- to zoom. Lights sit only at country centroids, never at exact places: precise
 * points could identify an expert or expose a community. Lite mode shows a list.
 */

const SIZE = 320;
const START: [number, number] = [20, 10]; // centred near 20°E, 10°N
const SPIN = 6; // degrees per second
const FRAME_MS = 1000 / 30;
const MAX_ZOOM = 4;

type D3 = typeof import('d3-geo');

interface Globe {
  d3: D3;
  land: unknown;
  graticule: unknown;
  lights: { iso: string; name: string; count: number; at: [number, number] }[];
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
    return f ? [{ iso: c.isoNumeric, name: c.name, count: c.count, at: d3.geoCentroid(f) }] : [];
  });
  return {
    d3,
    land: topojson.feature(atlas.default, atlas.default.objects.countries),
    graticule: d3.geoGraticule10(),
    lights,
  };
}

export type GlobePalette = 'night' | 'pearl';

/** Pearl: the globe in the logo blue on a pale blue sea (Ranking). */
const PEARL = {
  halo: 'rgba(1,150,186,0.18)',
  ocean0: '#FFFFFF',
  ocean1: '#D9EEF6',
  grid: 'rgba(1,150,186,0.12)',
  land: 'rgba(1,150,186,0.55)',
  landLine: 'rgba(255,255,255,0.6)',
  rim: 'rgba(1,150,186,0.8)',
  mark: '#0196BA',
};

/**
 * The pearl globe fills a full-width rectangle. Zooming grows the globe past
 * its starting size; it is only cut off by the rectangle, i.e. the phone edges.
 */
/** A dot's place on screen this frame, for tapping and placing the balloon. */
export interface DotHit {
  iso: string;
  x: number;
  y: number;
  r: number;
}

function drawPearl(
  ctx: CanvasRenderingContext2D,
  g: Globe,
  rotation: [number, number],
  zoom: number,
  w: number,
  h: number,
  hits: DotHit[] = [],
) {
  hits.length = 0;
  const base = Math.min(w, h) / 2 - 14;
  const r = base * zoom;
  const cx = w / 2;
  const c = h / 2;
  const projection = g.d3
    .geoOrthographic()
    .rotate([-rotation[0], -rotation[1], 0])
    .scale(r)
    .translate([cx, c])
    .clipAngle(90)
    .precision(0.6);
  const path = g.d3.geoPath(projection, ctx);
  ctx.clearRect(0, 0, w, h);

  const halo = ctx.createRadialGradient(cx, c, r * 0.92, cx, c, r * 1.1);
  halo.addColorStop(0, PEARL.halo);
  halo.addColorStop(1, 'rgba(1,150,186,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  const ocean = ctx.createRadialGradient(cx - r * 0.35, c - r * 0.4, r * 0.1, cx, c, r);
  ocean.addColorStop(0, PEARL.ocean0);
  ocean.addColorStop(1, PEARL.ocean1);
  ctx.beginPath();
  path({ type: 'Sphere' });
  ctx.fillStyle = ocean;
  ctx.fill();
  ctx.beginPath();
  path(g.graticule);
  ctx.strokeStyle = PEARL.grid;
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.beginPath();
  path(g.land);
  ctx.fillStyle = PEARL.land;
  ctx.fill();
  ctx.strokeStyle = PEARL.landLine;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // Pins with a soft ring, fading towards the far side
  for (const l of g.lights) {
    const distance = g.d3.geoDistance(l.at, rotation);
    if (distance > Math.PI / 2) continue;
    const p = projection(l.at);
    if (!p) continue;
    const fade = Math.min(1, (Math.PI / 2 - distance) / 0.35);
    const radius = 3 + Math.sqrt(l.count) * 1.6;
    hits.push({ iso: l.iso, x: p[0], y: p[1], r: radius });
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.arc(p[0], p[1], radius * 2.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(1,150,186,0.25)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p[0], p[1], radius, 0, Math.PI * 2);
    ctx.fillStyle = PEARL.mark;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  path({ type: 'Sphere' });
  ctx.strokeStyle = PEARL.rim;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function draw(
  ctx: CanvasRenderingContext2D,
  g: Globe,
  rotation: [number, number],
  palette: GlobePalette = 'night',
  zoom = 1,
  w = SIZE,
  h = SIZE,
  hits: DotHit[] = [],
) {
  if (palette === 'pearl') return drawPearl(ctx, g, rotation, zoom, w, h, hits);
  const r = (SIZE / 2 - 14) * zoom;
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

/** "Your input helped to prevent … and helped over … people living in this area." */
function helpedText(c: CountryContribution): string {
  const crisis = c.crises?.[0];
  if (!crisis || !c.people) return en.ranking.helpedGeneric(c.name);
  return en.ranking.helped(crisis.title, en.numbers(c.people.count), c.people.upTo);
}

export function ContributionsMap({
  countries,
  palette = 'night',
}: {
  countries: CountryContribution[];
  palette?: GlobePalette;
}) {
  const { mode, reducedMotion } = useMode();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [globe, setGlobe] = useState<Globe | null>(null);
  const rotation = useRef<[number, number]>([...START]);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  // Zoom: 1 = whole globe. Wheel, pinch or the +/- buttons change it.
  const zoom = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [zoomShown, setZoomShown] = useState(1);
  const setZoom = (z: number) => {
    zoom.current = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoomShown(zoom.current);
  };
  // Tapped dot: where the dots are this frame, which one is open, and the balloon
  const hits = useRef<DotHit[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const balloon = useRef<HTMLDivElement>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);

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
    // Pearl fills its (full-width) box; the night globe stays a fixed square.
    let w = SIZE;
    let h = SIZE;
    const fit = () => {
      if (palette === 'pearl') {
        w = el.clientWidth || SIZE;
        h = el.clientHeight || SIZE;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, globe, rotation.current, palette, zoom.current, w, h, hits.current);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    let raf = 0;
    let last = 0;
    let visible = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? now - last : 0;
      if (dt && dt < FRAME_MS) return;
      last = now;
      // Spin only at full view with no balloon open; zoomed in, the globe holds still
      if (!dragging.current && !reducedMotion && zoom.current <= 1 && !selectedRef.current)
        rotation.current[0] -= (SPIN * dt) / 1000;
      draw(ctx, globe, rotation.current, palette, zoom.current, w, h, hits.current);
      placeBalloon();
    };
    // Keep the balloon pinned to its dot as the globe is dragged or zoomed
    const placeBalloon = () => {
      const b = balloon.current;
      if (!b) return;
      const hit = hits.current.find((x) => x.iso === selectedRef.current);
      b.style.visibility = hit ? 'visible' : 'hidden';
      if (hit) {
        b.style.left = `${Math.min(Math.max(hit.x, 120), w - 120)}px`;
        b.style.top = `${hit.y - hit.r - 8}px`;
        b.style.setProperty('--tip-x', `${hit.x - Math.min(Math.max(hit.x, 120), w - 120)}px`);
      }
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
      ro.disconnect();
    };
  }, [globe, reducedMotion, palette]);

  // Mouse wheel / trackpad pinch zooms the globe instead of scrolling the page.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(zoom.current * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [globe]);

  const list = (
    <ul className={mode === 'rich' ? 'sr-only' : `contrib-list contrib-list--${palette}`}>
      {countries.map((c) => (
        <li key={c.isoNumeric}>
          <span>{c.name}</span>
          <span className="contrib-list__count">{en.ranking.countryCount(c.count)}</span>
          {mode === 'rich' && <span>{helpedText(c)}</span>}
        </li>
      ))}
    </ul>
  );

  if (mode === 'lite') return list;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt.current = pointers.current.size === 1 ? { x: e.clientX, y: e.clientY } : null;
    if (pointers.current.size === 2) {
      // Two fingers: pinch to zoom
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoom.current };
      dragging.current = null;
    } else {
      dragging.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setZoom((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
      return;
    }
    if (!dragging.current) return;
    const k = 0.4 / zoom.current; // degrees per pixel; slower when zoomed in
    rotation.current[0] -= (e.clientX - dragging.current.x) * k;
    rotation.current[1] = Math.max(-60, Math.min(60, rotation.current[1] + (e.clientY - dragging.current.y) * k));
    dragging.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    dragging.current = null;
    // A tap (not a drag): open the balloon of the dot under the finger, or close it
    const start = downAt.current;
    downAt.current = null;
    if (!start || e.type === 'pointercancel' || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    let best: DotHit | null = null;
    let bestD = Infinity;
    for (const h of hits.current) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < Math.max(18, h.r * 2.4) && d < bestD) {
        best = h;
        bestD = d;
      }
    }
    setSelected(best ? best.iso : null);
  };

  const open = countries.find((c) => c.isoNumeric === selected);

  return (
    <>
      <div className={`contrib-map contrib-map--${palette}`}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={en.ranking.mapLabel(countries.length)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {open && (
          <div
            ref={balloon}
            className="globe-balloon"
            role="dialog"
            aria-label={open.name}
            onKeyDown={(e) => e.key === 'Escape' && setSelected(null)}
          >
            <button
              type="button"
              className="globe-balloon__close"
              aria-label={en.common.close}
              onClick={() => setSelected(null)}
              autoFocus
            >
              <X size={16} aria-hidden="true" />
            </button>
            <p className="globe-balloon__place">{open.name}</p>
            <p className="globe-balloon__text">{helpedText(open)}</p>
            {(open.crises?.length ?? 0) > 1 && (
              <p className="globe-balloon__more">{en.ranking.moreCrises((open.crises?.length ?? 1) - 1)}</p>
            )}
          </div>
        )}
        <div className="contrib-map__zoom">
          <button
            type="button"
            aria-label={en.ranking.zoomIn}
            disabled={zoomShown >= MAX_ZOOM}
            onClick={() => setZoom(zoom.current * 1.5)}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={en.ranking.zoomOut}
            disabled={zoomShown <= 1}
            onClick={() => setZoom(zoom.current / 1.5)}
          >
            <Minus size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {list}
    </>
  );
}

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import './TileSphere.css';

/*
 * A sphere made of image tiles (after the "Inspo planet" reference). It turns
 * slowly on its own and can be dragged to spin it. The pictures are
 * decorative. Pure CSS 3D, no WebGL.
 */

export interface SphereTile {
  key: string;
  src: string;
  alt: string;
}

/** Latitude bands, from the north pole down; each band is filled with tiles. */
const BANDS = [-72, -52, -31, -10, 10, 31, 52, 72];

export function TileSphere({ tiles }: { tiles: SphereTile[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const angle = useRef({ x: -12, y: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [radius, setRadius] = useState(260);

  // Fit the sphere to the stage
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setRadius(Math.max(130, Math.min(el.clientWidth, el.clientHeight) * 0.36));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tile positions: bands of tiles, sized so neighbours leave small gaps
  const placed = useMemo(() => {
    const out: { lat: number; lon: number; tile: number; w: number; h: number }[] = [];
    let n = 0;
    const tileH = radius * 0.27;
    BANDS.forEach((lat, b) => {
      const ring = 2 * Math.PI * radius * Math.cos((lat * Math.PI) / 180);
      const count = Math.max(5, Math.floor(ring / (tileH * 1.45)));
      const w = Math.min((ring / count) * 0.86, tileH * 1.4);
      for (let i = 0; i < count; i++) {
        // Scatter the pictures so repeats don't line up; the first pass shows each once
        const k = n++;
        const tile = k < tiles.length ? k : (k * 7 + b * 5 + ((k * k) % 11)) % tiles.length;
        out.push({ lat, lon: (360 / count) * i + (b % 2) * (180 / count), tile, w, h: tileH });
      }
    });
    return out;
  }, [radius, tiles.length]);

  // Slow spin; holds while dragging
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? t - last : 0;
      last = t;
      if (!reduce && !drag.current) angle.current.y += dt * 0.008;
      if (ball.current) ball.current.style.transform = `rotateX(${angle.current.x}deg) rotateY(${angle.current.y}deg)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    angle.current.y += dx * 0.3;
    angle.current.x = Math.max(-60, Math.min(60, angle.current.x - dy * 0.3));
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={stage}
      className="tile-sphere"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ '--r': `${radius}px` } as CSSProperties}
    >
      <div ref={ball} className="tile-sphere__ball" aria-hidden="true">
        {placed.map((p, i) => (
          <span
            key={i}
            className="tile-sphere__tile"
            style={{
              width: p.w,
              height: p.h,
              marginLeft: -p.w / 2,
              marginTop: -p.h / 2,
              transform: `rotateY(${p.lon}deg) rotateX(${-p.lat}deg) translateZ(${radius}px)`,
            }}
          >
            <img className="tile-sphere__front" src={tiles[p.tile].src} alt="" draggable={false} loading="lazy" />
            <span className="tile-sphere__back" />
          </span>
        ))}
      </div>
    </div>
  );
}

import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { DATA, WORLD_LABEL, WORLD_NUDGE, WORLD_SHAPES, atlasBack, atlasName, mainCentroid, plural } from '../data';
import { countryHref, go } from '../nav';
import { S } from '../store';
import { picList, signalOf } from './overview-picture';

const fill = (l: string) => (l === 'High' ? 'var(--high)' : l === 'Medium' ? 'var(--med)' : 'var(--low)');

/**
 * The world map of open risks: countries coloured by their highest level,
 * a bubble with the number of open risks, a ring where experts flag something.
 * `hl` dims every country except these (hovering a row or a bubble).
 */
export function WorldMap({ hl }: { hl: Set<string> | null }) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<[number, number]>([900, 700]);

  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const measure = () => setSize([svg.clientWidth || 900, svg.clientHeight || 700]);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  const [W, H] = size;
  const spanX = 722; /* every risk country fits inside this width */
  let scale = W / spanX;
  let vw = spanX;
  let vh = H / scale;
  if (vh < 360) {
    vh = 360;
    scale = H / vh;
    vw = W / scale;
  }
  const x = 503 - vw / 2;
  const y = Math.max(-40, Math.min(560 - vh, 246 - vh * 0.52));
  const u = 1 / scale;

  const byC: Record<string, { n: number; top: string }> = {};
  for (const r of picList(null)) {
    for (const c of r.countries) {
      const e = byC[c] || (byC[c] = { n: 0, top: 'Medium' });
      e.n++;
      if (r.level === 'High') e.top = 'High';
    }
  }
  const sel = S.pic.country;
  const hlCls = (name: string) => (hl?.has(name) || name === sel ? ' hl' : '');
  const open = (name: string) => go(countryHref(name));

  return (
    <svg
      id="world"
      ref={ref}
      role="group"
      aria-label="World map of open risks"
      className={hl ? 'has-hl' : undefined}
      viewBox={`${x.toFixed(1)} ${y.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="-200" y="-200" width="1400" height="1000" fill="var(--sea)" />
      {/*
        The sea contours, drawn in place rather than with <use href="#contours">: inside a <use>
        the ".av .sea-lines" rule does not match, so the lines would be filled black.
        Same geometry as the symbol (viewBox 0 0 1000 560 placed at -200,-160 1400x880).
      */}
      <svg x="-200" y="-160" width="1400" height="880" viewBox="0 0 1000 560" overflow="visible" style={{ opacity: 0.35 }}>
        <g>
          {DATA.maps.contours.map((d, i) => (
            <path key={i} d={d} className="sea-lines" />
          ))}
        </g>
      </svg>
      <g className="land">
        {DATA.maps.world.shapes.map((s, i) => {
          const name = atlasBack[s.name] || s.name;
          const e = byC[name];
          if (!e) return <path key={i} d={s.d} />;
          return (
            <path
              key={i}
              className={`risk${hlCls(name)}`}
              d={s.d}
              style={{ fill: fill(e.top) }}
              data-name={name}
              data-hl={name}
              data-tip={`${name}: ${plural(e.n, 'open risk')}`}
              tabIndex={0}
              role="button"
              aria-label={`${name}, ${plural(e.n, 'open risk')}`}
              onClick={() => open(name)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  open(name);
                }
              }}
            />
          );
        })}
      </g>
      {Object.entries(byC).map(([name, e]) => {
        const shape = WORLD_SHAPES[atlasName(name)];
        if (!shape) return null;
        const [cx0, cy0] = mainCentroid(shape.d);
        const nudge = WORLD_NUDGE[name] || [0, 0];
        const cx = cx0 + nudge[0];
        const cy = cy0 + nudge[1];
        const [dx, dy, anchor] = WORLD_LABEL[name] || [0, 25, 'middle'];
        const sig = signalOf(name);
        return (
          <Fragment key={name}>
            <g
              className={`bub${sel === name ? ' sel' : ''}${sig.length ? ' sig' : ''}${hlCls(name)}`}
              data-name={name}
              data-hl={name}
              data-tip={`${name}: ${plural(e.n, 'open risk')}${sig.length ? `. ${sig.join('; ')}` : ''}. Click to open.`}
              onClick={() => open(name)}
            >
              {sig.length > 0 && <circle className="ring" cx={cx} cy={cy} r={16 * u} />}
              <circle cx={cx} cy={cy} r={11 * u} />
              <text x={cx} y={cy} fontSize={14 * u}>
                {e.n}
              </text>
            </g>
            <text
              className={`c-label${hlCls(name)}`}
              data-name={name}
              x={cx + dx * u}
              y={cy + dy * u}
              fontSize={14.5 * u}
              strokeWidth={3 * u}
              textAnchor={anchor}
            >
              {name}
            </text>
          </Fragment>
        );
      })}
    </svg>
  );
}

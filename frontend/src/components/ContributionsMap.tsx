import { useEffect, useId, useState } from 'react';
import type { CountryContribution } from '../data/types';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './ContributionsMap.css';

/*
 * The expert's contributions as lights on a dark globe. Lights sit only at country
 * centroids, never at exact places: precise points could identify an expert or expose
 * a community. Lite mode shows a plain list instead.
 */

const SIZE = 340;
const CENTRE: [number, number] = [20, 10]; // 20°E, 10°N

interface Light {
  name: string;
  count: number;
  x: number;
  y: number;
}

interface Globe {
  sphere: string;
  graticule: string;
  land: { id: string; d: string }[];
  lights: Light[];
}

async function buildGlobe(countries: CountryContribution[]): Promise<Globe> {
  const [d3, topojson, atlas] = await Promise.all([
    import('d3-geo'),
    import('topojson-client'),
    import('world-atlas/countries-110m.json'),
  ]);
  const projection = d3
    .geoOrthographic()
    .rotate([-CENTRE[0], -CENTRE[1], 0])
    .scale(SIZE / 2 - 8)
    .translate([SIZE / 2, SIZE / 2])
    .clipAngle(90)
    .precision(0.5);
  const path = d3.geoPath(projection);
  const features = topojson.feature(atlas.default, atlas.default.objects.countries).features;

  const lights: Light[] = [];
  for (const c of countries) {
    const f = features.find((x) => String(x.id) === c.isoNumeric);
    if (!f) continue;
    const centroid = d3.geoCentroid(f);
    if (d3.geoDistance(centroid, CENTRE) > Math.PI / 2 - 0.05) continue; // far side
    const p = projection(centroid);
    if (p) lights.push({ name: c.name, count: c.count, x: p[0], y: p[1] });
  }

  return {
    sphere: path({ type: 'Sphere' }) ?? '',
    graticule: path(d3.geoGraticule10()) ?? '',
    land: features.map((f, i) => ({ id: String(f.id ?? i), d: path(f) ?? '' })).filter((l) => l.d),
    lights,
  };
}

export function ContributionsMap({ countries }: { countries: CountryContribution[] }) {
  const { mode } = useMode();
  const [globe, setGlobe] = useState<Globe | null>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    if (mode !== 'rich' || globe) return;
    let alive = true;
    buildGlobe(countries).then((g) => alive && setGlobe(g));
    return () => {
      alive = false;
    };
  }, [mode, countries, globe]);

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

  const glow = `glow-${uid}`;
  const atmos = `atmos-${uid}`;
  const shade = `shade-${uid}`;

  return (
    <>
      <div className="contrib-map">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={en.ranking.mapLabel(countries.length)}>
          <defs>
            <radialGradient id={atmos} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.86" stopColor="#0096ba" stopOpacity="0.35" />
              <stop offset="1" stopColor="#0096ba" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={shade} cx="0.38" cy="0.32" r="0.75">
              <stop offset="0" stopColor="#0d4a6e" stopOpacity="0.55" />
              <stop offset="0.6" stopColor="#001f33" stopOpacity="0" />
              <stop offset="1" stopColor="#000c14" stopOpacity="0.6" />
            </radialGradient>
            <radialGradient id={glow}>
              <stop offset="0" stopColor="#e9fbff" />
              <stop offset="0.18" stopColor="#7fd3ea" />
              <stop offset="0.45" stopColor="#0096ba" stopOpacity="0.6" />
              <stop offset="1" stopColor="#0096ba" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill={`url(#${atmos})`} />
          {globe && (
            <>
              <path d={globe.sphere} fill="#001f33" stroke="#0096ba" strokeOpacity="0.5" />
              <path d={globe.graticule} fill="none" stroke="#7fd3ea" strokeOpacity="0.1" strokeWidth="0.6" />
              <g fill="#0b3550" stroke="#7fd3ea" strokeOpacity="0.18" strokeWidth="0.5">
                {globe.land.map((l) => (
                  <path key={l.id} d={l.d} />
                ))}
              </g>
              <path d={globe.sphere} fill={`url(#${shade})`} />
              <g style={{ mixBlendMode: 'screen' }}>
                {globe.lights.map((l) => (
                  <circle key={l.name} cx={l.x} cy={l.y} r={8 + Math.sqrt(l.count) * 6} fill={`url(#${glow})`} />
                ))}
              </g>
            </>
          )}
        </svg>
      </div>
      {list}
    </>
  );
}

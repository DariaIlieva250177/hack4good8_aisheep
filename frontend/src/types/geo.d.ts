/* Minimal declarations for the parts of d3-geo, topojson-client and world-atlas we use. */

declare module 'd3-geo' {
  export interface GeoProjection {
    (point: [number, number]): [number, number] | null;
    rotate(angles: [number, number, number?]): GeoProjection;
    rotate(): [number, number, number];
    scale(k: number): GeoProjection;
    translate(t: [number, number]): GeoProjection;
    clipAngle(angle: number): GeoProjection;
    precision(p: number): GeoProjection;
  }
  export interface GeoPath {
    (object: unknown): string | null;
    context(ctx: CanvasRenderingContext2D | null): GeoPath;
  }
  export function geoOrthographic(): GeoProjection;
  export function geoPath(projection?: GeoProjection, context?: CanvasRenderingContext2D | null): GeoPath;
  export function geoGraticule10(): unknown;
  export function geoCentroid(object: unknown): [number, number];
  export function geoDistance(a: [number, number], b: [number, number]): number;
}

declare module 'topojson-client' {
  export function feature(topology: unknown, object: unknown): { type: 'FeatureCollection'; features: GeoFeature[] };
  export interface GeoFeature {
    type: 'Feature';
    id?: string | number;
    properties: { name?: string };
    geometry: unknown;
  }
}

declare module 'world-atlas/countries-110m.json' {
  const topology: { type: 'Topology'; objects: { countries: unknown; land: unknown } };
  export default topology;
}

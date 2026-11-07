import type { ReactNode } from 'react';
import type { Family, ImageCategory } from '../data/types';
import { FAMILIES, darken, imageFor, imageUrl } from '../data/families';
import { IMAGE_TREATMENT } from '../config';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './RiskImage.css';

interface RiskImageProps {
  family: Family;
  image?: ImageCategory;
  variant?: 'card' | 'compact' | 'thumb' | 'tile' | 'hero';
  /** Layer drawn between the tint and the image (the waves) */
  behind?: ReactNode;
  /** Layer drawn above the image (swipe labels) */
  overlay?: ReactNode;
  decorative?: boolean;
  /** Show the illustration as-is: no tint, fade or duotone (colour-block cards) */
  plain?: boolean;
}

/**
 * The illustration blended into its surface: multiply blend, all edges faded,
 * a soft family tint behind. Lite mode renders nothing, so nothing downloads.
 */
export function RiskImage({ family, image, variant = 'card', behind, overlay, decorative = false, plain = false }: RiskImageProps) {
  const { mode } = useMode();
  if (mode === 'lite') return null;

  const category = imageFor(family, image);
  const tint = plain ? undefined : FAMILIES[family].tint;
  const filter = !plain && IMAGE_TREATMENT === 'duotone' ? `url(#duotone-${family})` : undefined;

  return (
    <div className={`risk-image risk-image--${variant}${plain ? ' risk-image--plain' : ''}`}>
      {tint && <div className="risk-image__tint" style={{ background: tint }} aria-hidden="true" />}
      {behind}
      <img
        className="risk-image__img"
        src={imageUrl(category)}
        alt={decorative ? '' : en.imageAlt[category]}
        style={{ filter }}
        loading={variant === 'card' || variant === 'hero' ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
      {overlay}
    </div>
  );
}

/** One inline SVG with a duotone filter per family. Rendered once at the app root. */
export function DuotoneFilters() {
  const { mode } = useMode();
  if (IMAGE_TREATMENT !== 'duotone' || mode === 'lite') return null;

  const channel = (hexes: string[], shift: number) =>
    hexes.map((h) => (((parseInt(h.slice(1), 16) >> shift) & 255) / 255).toFixed(3)).join(' ');

  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      {(Object.keys(FAMILIES) as Family[]).map((family) => {
        const { label, tint } = FAMILIES[family];
        const stops = [darken(label, 0.33), label, tint ?? '#e4e8eb', '#fbfaf6'];
        return (
          <filter id={`duotone-${family}`} key={family} colorInterpolationFilters="sRGB">
            {/* Greyscale weighted to blue so skies stay lighter than sand */}
            <feColorMatrix type="matrix" values="0.15 0.35 0.5 0 0  0.15 0.35 0.5 0 0  0.15 0.35 0.5 0 0  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={channel(stops, 16)} />
              <feFuncG type="table" tableValues={channel(stops, 8)} />
              <feFuncB type="table" tableValues={channel(stops, 0)} />
            </feComponentTransfer>
          </filter>
        );
      })}
    </svg>
  );
}

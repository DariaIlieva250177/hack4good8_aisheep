import type { ButtonHTMLAttributes } from 'react';
import GlassSurface from './GlassSurface';
import { useMode } from '../../mode/ModeContext';
import './GlassButton.css';

type Tone = 'soft' | 'primary';

/**
 * The refractive glass from GlassSurface, as a background layer filling its
 * parent. `radius` must be the host's real corner radius (at most half its
 * height) so the displacement map matches the shape. Lite mode renders
 * nothing: the parent keeps its plain style.
 */
export function GlassLayer({ radius, tone = 'soft' }: { radius: number; tone?: Tone }) {
  const { mode } = useMode();
  if (mode === 'lite') return null;
  return (
    <GlassSurface
      width="100%"
      height="100%"
      borderRadius={radius}
      className={`glass-layer glass-layer--${tone}`}
      // Primary buttons keep their solid blue under the glass so white text stays at 4.5:1.
      backgroundOpacity={tone === 'soft' ? 0.15 : 0}
      displace={0.5}
      // Small controls bend less, or the edge refraction sweeps across the label.
      blur={5}
      distortionScale={-70}
    />
  );
}

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'soft' | 'primary';
  pill?: boolean;
  icon?: boolean;
}

/** A real <button> with a glass surface behind its label. */
export function GlassButton({ variant = 'soft', pill = false, icon = false, className = '', children, ...rest }: GlassButtonProps) {
  const classes = ['btn', `btn-${variant}`, pill && 'btn-pill', icon && 'btn-icon', 'glass-btn', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" {...rest} className={classes}>
      <GlassLayer radius={icon ? 22 : pill ? 24 : 16} tone={variant} />
      <span className="glass-btn__label">{children}</span>
    </button>
  );
}

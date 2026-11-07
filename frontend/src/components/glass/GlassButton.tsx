import type { ButtonHTMLAttributes } from 'react';
import GlassSurface from './GlassSurface';
import SpecularButton from '../specular/SpecularButton';
import { useMode } from '../../mode/ModeContext';
import { useTheme } from '../../mode/ThemeContext';
import './GlassButton.css';

type Tone = 'soft' | 'primary';

/**
 * The refractive glass from GlassSurface, as a background layer filling its
 * parent (used for Profile's segmented options). `radius` must be the host's
 * real corner radius. Lite mode renders nothing.
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
      backgroundOpacity={tone === 'soft' ? 0.15 : 0}
      displace={0.5}
      // Small controls bend less, or the edge refraction sweeps across the label.
      blur={5}
      distortionScale={-70}
    />
  );
}

/* Edge-light colours. They feed WebGL, so they must be concrete colours, not var(). */
const LIGHT = {
  dark: { soft: { line: '#ffffff', base: '#6f8f99' }, primary: { line: '#ffffff', base: '#7fc4da' } },
  light: { soft: { line: '#0096ba', base: '#9db4c4' }, primary: { line: '#ffffff', base: '#6aa8c2' } },
};

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'soft' | 'primary';
  pill?: boolean;
  icon?: boolean;
}

/**
 * Every button in the app: a real <button> with SpecularButton's light running
 * along its edge and following the pointer. Lite mode keeps a plain button.
 */
export function GlassButton({ variant = 'soft', pill = false, icon = false, className = '', children, ...rest }: GlassButtonProps) {
  const { mode } = useMode();
  const { theme } = useTheme();
  const classes = ['btn', `btn-${variant}`, pill && 'btn-pill', icon && 'btn-icon', className].filter(Boolean).join(' ');

  if (mode === 'lite') {
    return (
      <button type="button" {...rest} className={classes}>
        {children}
      </button>
    );
  }

  const light = LIGHT[theme][variant];
  return (
    <SpecularButton
      {...rest}
      size="md"
      radius={icon ? 22 : pill ? 24 : 16}
      className={classes}
      lineColor={light.line}
      baseColor={light.base}
      textColor={variant === 'primary' ? '#ffffff' : 'var(--ink)'}
      intensity={1}
      idleIntensity={0.35}
      shineSize={10}
      shineFade={34}
      thickness={1.2}
      glow={1}
      followMouse
      proximity={250}
    >
      {children}
    </SpecularButton>
  );
}

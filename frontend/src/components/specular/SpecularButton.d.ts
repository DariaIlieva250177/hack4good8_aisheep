import type { ButtonHTMLAttributes, ReactElement } from 'react';

/* Types for SpecularButton.jsx (kept as provided, in plain JavaScript). */

export interface SpecularButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  /** Must be a concrete colour: it is parsed for WebGL, so no var() */
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  idleIntensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  glow?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
}

declare const SpecularButton: (props: SpecularButtonProps) => ReactElement;
export default SpecularButton;

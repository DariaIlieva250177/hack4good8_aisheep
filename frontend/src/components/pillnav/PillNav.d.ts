import type { CSSProperties, ElementType, MouseEvent, ReactElement, ReactNode } from 'react';

/* Types for PillNav.jsx (kept as provided, in plain JavaScript). */

export interface PillNavItem {
  /** Usually text; can include a small badge (e.g. a count) */
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  ariaLabel?: string;
}

export interface PillNavProps {
  items: PillNavItem[];
  logo?: string | ReactNode;
  logoAlt?: string;
  logoHref?: string;
  activeHref?: string;
  defaultActiveIndex?: number;
  onItemClick?: (item: PillNavItem, index: number, event: MouseEvent) => void;
  linkComponent?: ElementType;
  theme?: 'dark' | 'light';
  layout?: 'split' | 'joined';
  itemStyle?: 'pill' | 'plain';
  hoverEffect?: 'fill' | 'glide' | 'none';
  indicator?: 'dot' | 'pill' | 'none';
  surface?: 'glass' | 'solid' | 'none';
  size?: 'sm' | 'md' | 'lg';
  highlightColor?: string;
  highlightTextColor?: string;
  barColor?: string;
  textColor?: string;
  bounce?: number;
  stretch?: number;
  collapse?: 'auto' | 'always' | 'never';
  onMenuToggle?: (open: boolean) => void;
  intro?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

declare const PillNav: (props: PillNavProps) => ReactElement;
export default PillNav;

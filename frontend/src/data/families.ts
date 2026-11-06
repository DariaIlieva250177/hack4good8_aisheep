import type { Family, ImageCategory } from './types';

export interface FamilyStyle {
  tint: string | null;
  label: string;
}

export const FAMILIES: Record<Family, FamilyStyle> = {
  conflict: { tint: '#e8e6d6', label: '#5f5c36' },
  political: { tint: '#e3e7ee', label: '#475670' },
  economic: { tint: '#f3ead2', label: '#7a5c17' },
  hydromet: { tint: '#deeaf1', label: '#2f6385' },
  geophysical: { tint: '#ede4dc', label: '#664e3c' },
  environmental: { tint: '#e2ece0', label: '#43623f' },
  technological: { tint: '#e5e6e8', label: '#4d5257' },
  health: { tint: '#dcede9', label: '#285f58' },
  fallback: { tint: null, label: '#4f5a63' },
};

/** Each illustration in public/risk-images and the family it belongs to. */
export const IMAGE_CATEGORIES: Record<ImageCategory, { file: string; family: Family }> = {
  default: { file: 'cat-default.jpg', family: 'fallback' },
  border: { file: 'cat-border.jpg', family: 'conflict' },
  conflict: { file: 'cat-conflict.jpg', family: 'conflict' },
  displacement: { file: 'cat-displacement.jpg', family: 'conflict' },
  political: { file: 'cat-political.jpg', family: 'political' },
  economic: { file: 'cat-economic.jpg', family: 'economic' },
  food: { file: 'cat-food.jpg', family: 'economic' },
  aid: { file: 'cat-aid.jpg', family: 'economic' },
  health: { file: 'cat-health.jpg', family: 'health' },
  flood: { file: 'cat-flood.jpg', family: 'hydromet' },
  drought: { file: 'cat-drought.jpg', family: 'hydromet' },
  storm: { file: 'cat-storm.jpg', family: 'hydromet' },
  earthquake: { file: 'cat-earthquake.jpg', family: 'geophysical' },
  pests: { file: 'cat-pests.jpg', family: 'environmental' },
  infrastructure: { file: 'cat-infrastructure.jpg', family: 'technological' },
};

/** The default illustration for each family, used when a risk names none. */
const FAMILY_DEFAULT_IMAGE: Record<Family, ImageCategory> = {
  conflict: 'conflict',
  political: 'political',
  economic: 'economic',
  hydromet: 'flood',
  geophysical: 'earthquake',
  environmental: 'pests',
  technological: 'infrastructure',
  health: 'health',
  fallback: 'default',
};

export function imageFor(family: Family, image?: ImageCategory): ImageCategory {
  return image && IMAGE_CATEGORIES[image] ? image : FAMILY_DEFAULT_IMAGE[family] ?? 'default';
}

export function imageUrl(category: ImageCategory): string {
  return `${import.meta.env.BASE_URL}risk-images/${IMAGE_CATEGORIES[category].file}`;
}

/** Mix a hex colour toward black by `amount` (0..1). */
export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * (1 - amount));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

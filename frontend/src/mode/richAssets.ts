import { IMAGE_CATEGORIES } from '../data/families';
import { RISKS } from '../data/mock';

let loading: Promise<void> | null = null;

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Loads everything rich mode needs in the background: the self-hosted font
 * (never from a third party) and the illustrations of the first risks.
 */
export function loadRichAssets(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      await import('@fontsource-variable/bricolage-grotesque/standard.css');
      await Promise.all([
        document.fonts.load('400 16px "Bricolage Grotesque Variable"'),
        document.fonts.load('600 24px "Bricolage Grotesque Variable"'),
      ]).catch(() => undefined);
      const firstImages = [...new Set(RISKS.slice(0, 3).map((r) => IMAGE_CATEGORIES[r.image].file))];
      await Promise.all(firstImages.map((f) => preloadImage(`${import.meta.env.BASE_URL}risk-images/${f}`)));
    })();
  }
  return loading;
}

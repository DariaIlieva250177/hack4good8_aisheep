import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode, type UIEventHandler } from 'react';
import './Carousel.css';

interface CarouselProps {
  label: string;
  className?: string;
  onScroll?: UIEventHandler<HTMLUListElement>;
  children: ReactNode;
}

/**
 * Horizontal scroller. Touch and trackpads scroll it natively; on desktop it
 * also scrolls with a mouse drag and the mouse wheel. A drag never opens a card.
 * Used by the To-do rows and the Ranking certificates.
 */
export const Carousel = forwardRef<HTMLUListElement, CarouselProps>(function Carousel(
  { label, className = '', onScroll, children },
  outerRef,
) {
  const ref = useRef<HTMLUListElement>(null);
  useImperativeHandle(outerRef, () => ref.current!, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Vertical wheel scrolls sideways until the row hits an end, then the page scrolls.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY > 0 && el.scrollLeft >= max - 1) || (e.deltaY < 0 && el.scrollLeft <= 0)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY });
    };

    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        el.classList.add('is-dragging');
        el.setPointerCapture(e.pointerId);
      }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      dragging = false;
      el.classList.remove('is-dragging');
    };
    // Swallow the click that ends a drag so it doesn't open the card.
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  return (
    <ul ref={ref} className={`carousel ${className}`} aria-label={label} onScroll={onScroll}>
      {children}
    </ul>
  );
});


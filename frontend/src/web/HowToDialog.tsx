import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { Info } from 'lucide-react';
import { en } from '../i18n/en';
import './HowToDialog.css';

const EASE_IN = 'cubic-bezier(0.2, 0.9, 0.25, 1.15)';

/** Fade the dimmed backdrop. Not every browser can animate ::backdrop; then it just snaps. */
function fadeBackdrop(d: HTMLDialogElement, from: number, to: number) {
  try {
    d.animate([{ opacity: from }, { opacity: to }], {
      duration: to ? 400 : 520,
      pseudoElement: '::backdrop',
      fill: to ? 'none' : 'forwards',
    });
  } catch {
    /* unsupported: no fade */
  }
}
const EASE_OUT = 'cubic-bezier(0.5, 0, 0.75, 0)';

/**
 * "How to use this page" for the web Risks tab. It zooms in over the cards
 * when the page opens (the deck waits, blurred, behind it). "OK" zooms it
 * back down into the "See detailed instructions" link under the heading,
 * and that link zooms it out again.
 */
export function HowToDialog({
  open,
  onClose,
  anchor,
  fromAnchor,
}: {
  open: boolean;
  onClose: () => void;
  /** The "See detailed instructions" link it shrinks into */
  anchor: RefObject<HTMLElement | null>;
  /** Reopened from the link (grow out of it) rather than first shown on arrival */
  fromAnchor: boolean;
}) {
  const t = en.risks.howto;
  const ref = useRef<HTMLDialogElement>(null);
  const okButton = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Transform that puts the dialog over the link, tiny
  const towardAnchor = () => {
    const d = ref.current?.getBoundingClientRect();
    const a = anchor.current?.getBoundingClientRect();
    if (!d || !a) return 'scale(0.4)';
    const dx = a.left + a.width / 2 - (d.left + d.width / 2);
    const dy = a.top + a.height / 2 - (d.top + d.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${Math.max(0.05, a.width / d.width)})`;
  };

  // Open: zoom in
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d || !open || d.open) return;
    closing.current = false;
    d.showModal();
    okButton.current?.focus();
    if (reduce()) return;
    d.animate(
      [
        { transform: fromAnchor ? towardAnchor() : 'scale(0.55)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 620, easing: EASE_IN },
    );
    fadeBackdrop(d, 0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If the page closes it some other way, just close
  useEffect(() => {
    if (!open && ref.current?.open && !closing.current) ref.current.close();
  }, [open]);

  // OK / Escape / backdrop: zoom down into the link, then close
  const dismiss = () => {
    const d = ref.current;
    if (!d || closing.current) return;
    closing.current = true;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      d.close();
      // Drop the end state of the animations so nothing lingers on the closed dialog
      d.getAnimations({ subtree: true }).forEach((a) => a.cancel()); // includes ::backdrop
      onClose();
    };
    if (reduce()) return finish();
    try {
      const anim = d.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: towardAnchor(), opacity: 0 },
        ],
        { duration: 520, easing: EASE_OUT, fill: 'forwards' },
      );
      anim.finished.then(finish, finish);
      fadeBackdrop(d, 1, 0);
    } catch {
      finish();
    }
    // Safety net: a modal dialog left open (even invisible) would block the whole
    // page, including swiping the cards, so it always closes.
    window.setTimeout(finish, 900);
  };

  return (
    <dialog
      ref={ref}
      className="howto"
      aria-labelledby="howto-title"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="howto__panel">
        <h2 id="howto-title" className="howto__title">
          <Info size={18} aria-hidden="true" />
          {t.title}
        </h2>
        <p className="howto__intro">{t.intro}</p>

        <ul className="howto__list">
          <li>
            <span className="howto__keys">
              <kbd aria-label={t.rightKey}>→</kbd>
              <span>{t.orSwipeRight}</span>
            </span>
            <span className="howto__what">
              <b>{t.saveTitle}</b> {t.saveBody}
            </span>
          </li>
          <li>
            <span className="howto__keys">
              <kbd aria-label={t.leftKey}>←</kbd>
              <span>{t.orSwipeLeft}</span>
            </span>
            <span className="howto__what">
              <b>{t.skipTitle}</b> {t.skipBody}
            </span>
          </li>
          <li>
            <span className="howto__keys">
              <kbd className="howto__click">{t.click}</kbd>
              <span>{t.theCard}</span>
            </span>
            <span className="howto__what">
              <b>{t.flipTitle}</b> {t.flipBody}
            </span>
          </li>
          <li>
            <span className="howto__keys">
              <kbd className="howto__click">{t.open}</kbd>
              <span>{t.inTodo}</span>
            </span>
            <span className="howto__what">
              <b>{t.answerTitle}</b> {t.answerBody}
            </span>
          </li>
        </ul>

        <button ref={okButton} type="button" className="howto__ok" onClick={dismiss}>
          {t.ok}
        </button>
        <p className="howto__later">{t.findLater}</p>
      </div>
    </dialog>
  );
}

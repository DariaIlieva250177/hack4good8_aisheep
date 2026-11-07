import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import './FuseButton.css';

/*
 * Fuse button: press it and the action is "done" right away, but a fuse burns
 * around the outline for `undoWindow` ms. While it burns, pressing again undoes.
 * When the fuse reaches its end, onFuseEnd fires — that's when the action is
 * final. Hovering (or focusing) pauses the fuse when pauseOnHover is set.
 */
interface FuseButtonProps {
  label: string;
  doneLabel: string;
  undoLabel: string;
  /** Text colour (any CSS colour, including var()) */
  color?: string;
  background?: string;
  fuseColor?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  undoWindow?: number;
  /** 'outline': the fuse burns along the border */
  fuse?: 'outline';
  fuseThickness?: number;
  crossfadeMs?: number;
  /** 'press': commit on pointer press (no wait for release) */
  commitOn?: 'press' | 'click';
  pauseOnHover?: boolean;
  /** 'reset': back to the start state after the fuse ends; 'done': stay done */
  settle?: 'reset' | 'done';
  disabled?: boolean;
  className?: string;
  /** Return false to stop the commit (e.g. form validation failed) */
  canCommit?: () => boolean;
  onCommit?: () => void;
  onUndo?: () => void;
  onFuseEnd?: () => void;
}

type Phase = 'idle' | 'burning' | 'done';

export function FuseButton({
  label,
  doneLabel,
  undoLabel,
  color = '#f5f5f5',
  background = '#27272a',
  fuseColor = '#f5a524',
  size = 'md',
  radius = 22,
  undoWindow = 4000,
  fuse = 'outline',
  fuseThickness = 1.5,
  crossfadeMs = 200,
  commitOn = 'press',
  pauseOnHover = false,
  settle = 'reset',
  disabled = false,
  className = '',
  canCommit,
  onCommit,
  onUndo,
  onFuseEnd,
}: FuseButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(1); // fuse remaining, 1 → 0
  const [paused, setPaused] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const elapsed = useRef(0);
  const pressed = useRef(false);
  // Latest callback in a ref, so a new function each render doesn't restart the burn
  const fuseEnd = useRef(onFuseEnd);
  useEffect(() => {
    fuseEnd.current = onFuseEnd;
  });

  // Measure the button so the fuse path hugs its rounded outline.
  useLayoutEffect(() => {
    const el = btn.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Burn the fuse. Time only advances while not paused.
  useEffect(() => {
    if (phase !== 'burning' || paused) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      elapsed.current += now - last;
      last = now;
      const remaining = Math.max(0, 1 - elapsed.current / undoWindow);
      setLeft(remaining);
      if (remaining <= 0) {
        setPhase(settle === 'reset' ? 'idle' : 'done');
        fuseEnd.current?.();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, undoWindow, settle]);

  const activate = () => {
    if (disabled) return;
    if (phase === 'burning') {
      setPhase('idle');
      setLeft(1);
      onUndo?.();
      return;
    }
    if (phase === 'done') return;
    if (canCommit && !canCommit()) return;
    elapsed.current = 0;
    setLeft(1);
    setPhase('burning');
    onCommit?.();
  };

  const burning = phase === 'burning';
  const t = fuseThickness;
  const r = Math.max(0, Math.min(radius, box.h / 2) - t / 2);

  return (
    <button
      ref={btn}
      type="button"
      className={`fuse-btn fuse-btn--${size} is-${phase}${paused ? ' is-paused' : ''} ${className}`}
      style={
        {
          '--fuse-color': color,
          '--fuse-bg': background,
          '--fuse-line': fuseColor,
          '--fuse-radius': `${radius}px`,
          '--fuse-fade': `${crossfadeMs}ms`,
        } as CSSProperties
      }
      disabled={disabled}
      aria-live="polite"
      onPointerDown={(e) => {
        if (commitOn !== 'press' || e.button !== 0) return;
        pressed.current = true;
        activate();
      }}
      onClick={() => {
        // A press already acted; keyboard and click-mode still come through here.
        if (pressed.current) {
          pressed.current = false;
          return;
        }
        activate();
      }}
      onPointerEnter={() => pauseOnHover && setPaused(true)}
      onPointerLeave={() => pauseOnHover && setPaused(false)}
      // Pause for keyboard focus only; a mouse or touch press also focuses the
      // button, and that must not hold the fuse forever.
      onFocus={(e) => pauseOnHover && e.currentTarget.matches(':focus-visible') && setPaused(true)}
      onBlur={() => pauseOnHover && setPaused(false)}
    >
      {/* Labels stacked in one cell and crossfaded */}
      <span className="fuse-btn__labels">
        <span className="fuse-btn__label fuse-btn__label--idle" aria-hidden={burning}>
          {phase === 'done' ? doneLabel : label}
        </span>
        <span className="fuse-btn__label fuse-btn__label--burning" aria-hidden={!burning}>
          {doneLabel}
          <span className="fuse-btn__sep" aria-hidden="true">
            ·
          </span>
          <span className="fuse-btn__undo">{undoLabel}</span>
        </span>
      </span>

      {fuse === 'outline' && burning && box.w > 0 && (
        <svg className="fuse-btn__fuse" width={box.w} height={box.h} aria-hidden="true">
          <rect
            x={t / 2}
            y={t / 2}
            width={box.w - t}
            height={box.h - t}
            rx={r}
            ry={r}
            pathLength={100}
            strokeWidth={t}
            strokeDasharray={`${left * 100} 100`}
          />
        </svg>
      )}
    </button>
  );
}

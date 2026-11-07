import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Likelihood } from '../data/types';
import { en } from '../i18n/en';
import './LikelihoodSlider.css';

interface LikelihoodSliderProps {
  value: Likelihood | null;
  onChange: (v: Likelihood) => void;
}

const STEPS: Likelihood[] = [1, 2, 3, 4, 5];

/**
 * Segmented forecast slider: five options on a soft track, with a coloured
 * thumb that slides behind the chosen one. Tap an option, or drag the thumb
 * along the track and it snaps to the nearest option on release.
 * Untouched, no thumb shows, so "not answered" isn't read as the middle.
 */
export function LikelihoodSlider({ value, onChange }: LikelihoodSliderProps) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  // While dragging: thumb position as a fraction 0..1 of the track
  const [drag, setDrag] = useState<number | null>(null);
  const labels = en.answer.scale;

  const fractionAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const pad = 6 + (r.width - 12) / 10; // centre of the first and last option (6px track padding)
    return Math.min(1, Math.max(0, (clientX - r.left - pad) / (r.width - 2 * pad)));
  };
  const stepAt = (f: number) => (Math.round(f * 4) + 1) as Likelihood;

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    track.current!.setPointerCapture(e.pointerId);
    setDrag(fractionAt(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    setDrag(fractionAt(e.clientX));
  };
  const onUp = () => {
    if (drag === null) return;
    onChange(stepAt(drag));
    setDrag(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    let next: number;
    if (e.key in delta) next = value === null ? 3 : value + delta[e.key];
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    else return;
    e.preventDefault();
    onChange(Math.min(5, Math.max(1, next)) as Likelihood);
  };

  // Highlighted option: follows the finger while dragging, else the value
  const active = drag !== null ? stepAt(drag) : value;
  // Thumb centre as a fraction of the inner track (option centres at 10%, 30% … 90%)
  const thumbAt = drag !== null ? 0.1 + drag * 0.8 : value !== null ? 0.1 + ((value - 1) / 4) * 0.8 : null;

  return (
    <div className="seg">
      <p id={`${id}-q`} className="answer__label t-title seg__question">
        {en.answer.likelihood}
      </p>
      <div
        ref={track}
        className={`seg__track${drag !== null ? ' is-dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-labelledby={`${id}-q`}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value !== null ? labels[value - 1] : en.answer.likelihoodUnset}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKey}
      >
        {thumbAt !== null && (
          <span className="seg__thumb" style={{ left: `calc(6px + (100% - 12px) * ${thumbAt})` }} aria-hidden="true" />
        )}
        {STEPS.map((s) => (
          <span key={s} className={`seg__option${active === s ? ' is-on' : ''}`} aria-hidden="true">
            {labels[s - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}

import { useId } from 'react';
import type { Likelihood } from '../data/types';
import { en } from '../i18n/en';
import './LikelihoodSlider.css';

const STEPS: Likelihood[] = [1, 2, 3, 4, 5];

interface LikelihoodSliderProps {
  value: Likelihood | null;
  onChange: (v: Likelihood) => void;
}

/**
 * Forecast slider: "How likely is this to happen?" on a five-point scale from
 * Strongly disagree to Strongly agree. Untouched it shows no value, so the
 * answer can tell "not answered" apart from the middle of the scale.
 */
export function LikelihoodSlider({ value, onChange }: LikelihoodSliderProps) {
  const id = useId();
  const shown = value ?? 3;
  const pct = ((shown - 1) / 4) * 100;

  return (
    <div className={`likelihood${value === null ? ' is-unset' : ''}`}>
      <label htmlFor={id} className="answer__label t-title likelihood__question">
        {en.answer.likelihood}
      </label>
      <p className="likelihood__value" aria-hidden="true">
        {value === null ? en.answer.likelihoodUnset : en.answer.scale[value - 1]}
      </p>
      <input
        id={id}
        className="likelihood__range"
        type="range"
        min={1}
        max={5}
        step={1}
        value={shown}
        style={{ ['--fill' as string]: `${pct}%` }}
        aria-valuetext={value === null ? en.answer.likelihoodUnset : en.answer.scale[value - 1]}
        onChange={(e) => onChange(Number(e.target.value) as Likelihood)}
        // A tap on the middle doesn't fire change, so count it as choosing it.
        onPointerUp={() => value === null && onChange(shown)}
        onKeyUp={() => value === null && onChange(shown)}
      />
      <div className="likelihood__ticks" aria-hidden="true">
        {STEPS.map((s) => (
          <span key={s} className={value === s ? 'is-on' : ''} />
        ))}
      </div>
      <div className="likelihood__ends" aria-hidden="true">
        <span>{en.answer.scale[0]}</span>
        <span>{en.answer.scale[4]}</span>
      </div>
    </div>
  );
}

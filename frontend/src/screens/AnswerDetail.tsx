import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Plus, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RiskCard } from '../components/RiskCard';
import { LikelihoodSlider } from '../components/LikelihoodSlider';
import { AcapsAnalysis } from '../components/AcapsAnalysis';
import { SubmittedDialog } from '../components/SubmittedDialog';
import { VerdictButtons } from '../components/VerdictButtons';
import { FuseButton } from '../components/FuseButton';
import { GlassButton } from '../components/glass/GlassButton';
import { displayNameFor, getMe, getRisk, submitAnswer } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { Likelihood, Verdict } from '../data/types';
import { en } from '../i18n/en';
import './AnswerDetail.css';

interface Source {
  key: number;
  url: string;
  touched: boolean;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

export function AnswerDetail() {
  const { riskId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: risk, loading } = useQuery(() => getRisk(riskId), [riskId]);
  const { data: me } = useQuery(getMe);

  const [verdict, setVerdict] = useState<Verdict | null>((location.state as { verdict?: Verdict } | null)?.verdict ?? null);
  const [forecast, setForecast] = useState<Likelihood | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [text, setText] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const nextKey = useRef(1);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const sourceInputs = useRef(new Map<number, HTMLInputElement>());
  const focusKey = useRef<number | null>(null);

  // Grow the textarea with its text.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.blockSize = 'auto';
    el.style.blockSize = `${el.scrollHeight}px`;
  }, [text]);

  useLayoutEffect(() => {
    if (focusKey.current !== null) {
      sourceInputs.current.get(focusKey.current)?.focus();
      focusKey.current = null;
    }
  }, [sources]);

  if (loading) return <div className="screen" />;
  if (!risk) return <Navigate to="/risks" replace />;

  const filledSources = sources.filter((s) => s.url.trim());
  const invalid = filledSources.filter((s) => !isValidUrl(s.url));
  const empty = !verdict && forecast === null && !text.trim();

  const addSource = () => {
    const key = nextKey.current++;
    focusKey.current = key;
    setSources((list) => [...list, { key, url: '', touched: false }]);
  };

  // Submit starts a fuse; the answer is only sent when the fuse ends, so a
  // press can be undone for a few seconds.
  const validate = () => {
    setTried(true);
    setSources((list) => list.map((s) => ({ ...s, touched: true })));
    return !empty && invalid.length === 0;
  };

  const send = async () => {
    setSending(true);
    await submitAnswer({ riskId: risk.id, verdict, forecast, text, sources: filledSources.map((s) => s.url.trim()) });
    setDone(true);
  };

  // Enter in a field shouldn't bypass the fuse.
  const submit = (e: FormEvent) => e.preventDefault();

  return (
    <div className={`screen answer answer--${risk.level.toLowerCase()}`}>
      <ScreenHeader title={en.answer.title} back />
      {/* Same card as the Risks tab; tap to see the triggers on the back */}
      <div
        className="answer__card"
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <RiskCard risk={risk} flipped={flipped} />
      </div>

      <AcapsAnalysis risk={risk} />

      <form className="answer__form" onSubmit={submit} noValidate>
        <div>
          <p id="answer-question" className="answer__label t-title">
            {en.answer.agreeQuestion}
          </p>
          <VerdictButtons
            value={verdict}
            onChange={setVerdict}
            labelledBy="answer-question"
            options={['yes', 'no']}
            labels={{ yes: en.answer.agree, no: en.answer.disagree }}
            shine={false}
          />
        </div>

        <LikelihoodSlider value={forecast} onChange={setForecast} />

        <div>
          <label htmlFor="answer-text" className="answer__label t-title">
            {en.answer.detailed}
          </label>
          <div className="inset answer__textarea">
            <textarea
              id="answer-text"
              ref={textarea}
              rows={4}
              value={text}
              placeholder={en.answer.placeholder}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="answer__sources">
          <legend className="answer__label t-title">{en.answer.sources}</legend>
          <ul className="stack-md">
            {sources.map((s, i) => {
              const bad = s.touched && s.url.trim() !== '' && !isValidUrl(s.url);
              const errorId = `source-${s.key}-error`;
              return (
                <li key={s.key}>
                  <label className="sr-only" htmlFor={`source-${s.key}`}>
                    {en.answer.sourceLabel(i + 1)}
                  </label>
                  <div className={`inset${bad ? ' inset--invalid' : ''}`}>
                    <input
                      id={`source-${s.key}`}
                      ref={(el) => {
                        if (el) sourceInputs.current.set(s.key, el);
                        else sourceInputs.current.delete(s.key);
                      }}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={en.answer.sourcePlaceholder}
                      value={s.url}
                      aria-invalid={bad}
                      aria-describedby={bad ? errorId : undefined}
                      onChange={(e) =>
                        setSources((list) => list.map((x) => (x.key === s.key ? { ...x, url: e.target.value } : x)))
                      }
                      onBlur={() => setSources((list) => list.map((x) => (x.key === s.key ? { ...x, touched: true } : x)))}
                    />
                    <button
                      type="button"
                      className="answer__remove"
                      aria-label={en.answer.removeSource(i + 1)}
                      onClick={() => setSources((list) => list.filter((x) => x.key !== s.key))}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  {/* Always rendered, so showing the error on blur never shifts the buttons below */}
                  <p id={errorId} className="field-error field-error--reserved t-small" aria-live="polite">
                    {bad && (
                      <>
                        <AlertCircle size={16} aria-hidden="true" />
                        {en.answer.invalidUrl}
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
          <GlassButton pill shine={false} className="answer__add" onClick={addSource}>
            <Plus size={18} aria-hidden="true" />
            {en.answer.addSource}
          </GlassButton>
        </fieldset>

        {tried && empty && (
          <p className="field-error t-small" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {en.answer.needsSomething}
          </p>
        )}

        <FuseButton
          className="answer__submit"
          label={en.answer.submit}
          doneLabel={en.answer.submitted}
          undoLabel={en.answer.undo}
          color="var(--lvl-ink)"
          background="var(--lvl)"
          fuseColor="var(--fuse)"
          size="md"
          radius={24}
          undoWindow={4000}
          fuse="outline"
          fuseThickness={2}
          crossfadeMs={200}
          commitOn="press"
          pauseOnHover
          settle="done"
          disabled={sending}
          canCommit={validate}
          onFuseEnd={send}
        />
        {me && <p className="t-small t-muted answer__note">{en.answer.note(displayNameFor(me))}</p>}
      </form>

      <SubmittedDialog
        open={done}
        // replace: the sent form shouldn't be one Back press away
        onSeeOthers={() => navigate(`/community/${risk.id}`, { replace: true })}
        onBack={() => navigate('/risks', { replace: true })}
      />
    </div>
  );
}

import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Plus, X } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { RiskHeader } from '../components/RiskHeader';
import { VerdictButtons } from '../components/VerdictButtons';
import { useToast } from '../components/Toast';
import { displayNameFor, getMe, getRisk, submitAnswer } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { Verdict } from '../data/types';
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
  const toast = useToast();
  const { data: risk, loading } = useQuery(() => getRisk(riskId), [riskId]);
  const { data: me } = useQuery(getMe);

  const [verdict, setVerdict] = useState<Verdict | null>((location.state as { verdict?: Verdict } | null)?.verdict ?? null);
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
  const empty = !verdict && !text.trim();

  const addSource = () => {
    const key = nextKey.current++;
    focusKey.current = key;
    setSources((list) => [...list, { key, url: '', touched: false }]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setSources((list) => list.map((s) => ({ ...s, touched: true })));
    if (empty || invalid.length) return;
    setSending(true);
    await submitAnswer({ riskId: risk.id, verdict, text, sources: filledSources.map((s) => s.url.trim()) });
    toast({ message: en.answer.sent });
    navigate('/risks');
  };

  return (
    <div className="screen answer">
      <ScreenHeader title={en.answer.title} back />
      <RiskHeader risk={risk} questionId="answer-question" />

      <form className="answer__form" onSubmit={submit} noValidate>
        <VerdictButtons value={verdict} onChange={setVerdict} labelledBy="answer-question" />

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
          <button type="button" className="btn btn-soft btn-pill answer__add" onClick={addSource}>
            <Plus size={18} aria-hidden="true" />
            {en.answer.addSource}
          </button>
        </fieldset>

        {tried && empty && (
          <p className="field-error t-small" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {en.answer.needsSomething}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-pill answer__submit" disabled={sending}>
          {en.answer.submit}
        </button>
        {me && <p className="t-small t-muted answer__note">{en.answer.note(displayNameFor(me))}</p>}
      </form>
    </div>
  );
}

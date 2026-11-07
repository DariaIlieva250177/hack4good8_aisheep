import { useId, useState, type FormEvent } from 'react';
import { AlertCircle, Send } from 'lucide-react';
import { suggestCard } from '../data/api';
import { MessageDialog } from './MessageDialog';
import { en } from '../i18n/en';
import './SuggestCard.css';

/**
 * "Add your own card": an expert proposes a new risk statement for ACAPS.
 * After sending, a pop-up confirms it went to the company.
 */
export function SuggestCard() {
  const id = useId();
  const t = en.suggest;
  const [statement, setStatement] = useState('');
  const [area, setArea] = useState('');
  const [why, setWhy] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const missing = !statement.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (missing) return;
    setSending(true);
    await suggestCard({ statement, area, why });
    setSending(false);
    setSent(true);
    setStatement('');
    setArea('');
    setWhy('');
    setTried(false);
  };

  return (
    <section className="suggest" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="todo__heading">
        {t.title}
      </h2>
      <p className="suggest__intro">{t.intro}</p>

      <form className="suggest__form" onSubmit={submit} noValidate>
        <label className="suggest__label" htmlFor={`${id}-statement`}>
          {t.statement}
        </label>
        <textarea
          id={`${id}-statement`}
          className="suggest__field"
          rows={3}
          value={statement}
          placeholder={t.statementPlaceholder}
          aria-invalid={tried && missing}
          aria-describedby={tried && missing ? `${id}-error` : undefined}
          onChange={(e) => setStatement(e.target.value)}
        />
        {tried && missing && (
          <p id={`${id}-error`} className="suggest__error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {t.needsStatement}
          </p>
        )}

        <label className="suggest__label" htmlFor={`${id}-area`}>
          {t.area}
        </label>
        <input
          id={`${id}-area`}
          className="suggest__field"
          value={area}
          placeholder={t.areaPlaceholder}
          onChange={(e) => setArea(e.target.value)}
        />

        <label className="suggest__label" htmlFor={`${id}-why`}>
          {t.why}
        </label>
        <textarea
          id={`${id}-why`}
          className="suggest__field"
          rows={3}
          value={why}
          placeholder={t.whyPlaceholder}
          onChange={(e) => setWhy(e.target.value)}
        />

        <button type="submit" className="suggest__send" disabled={sending}>
          <Send size={18} aria-hidden="true" />
          {t.send}
        </button>
      </form>

      <MessageDialog
        open={sent}
        title={t.sentTitle}
        body={t.sentBody}
        actions={[{ label: t.ok, onClick: () => setSent(false) }]}
        onClose={() => setSent(false)}
      />
    </section>
  );
}

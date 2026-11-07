import { useId, useState, type FormEvent } from 'react';
import { AlertCircle, ChevronDown, Send } from 'lucide-react';
import { suggestCard } from '../data/api';
import type { Family } from '../data/types';
import { MessageDialog } from './MessageDialog';
import { en } from '../i18n/en';
import './SuggestCard.css';

/** Domains offered in the dropdown: the ACAPS risk families, "Other" last. */
const DOMAINS: Family[] = [
  'conflict',
  'political',
  'economic',
  'hydromet',
  'geophysical',
  'environmental',
  'technological',
  'health',
  'fallback',
];

/**
 * "Report uncovered risk": an expert reports a risk ACAPS isn't covering yet.
 * Statement, domain and why it matters are required; country is optional.
 */
export function SuggestCard() {
  const id = useId();
  const t = en.suggest;
  const [statement, setStatement] = useState('');
  const [area, setArea] = useState('');
  const [domain, setDomain] = useState<Family | ''>('');
  const [why, setWhy] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const errors = {
    statement: !statement.trim(),
    domain: !domain,
    why: !why.trim(),
  };
  const show = (k: keyof typeof errors) => tried && errors[k];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.statement || errors.domain || errors.why) return;
    setSending(true);
    await suggestCard({ statement, area, domain: domain as Family, why });
    setSending(false);
    setSent(true);
    setStatement('');
    setArea('');
    setDomain('');
    setWhy('');
    setTried(false);
  };

  const error = (k: keyof typeof errors, text: string) =>
    show(k) && (
      <p id={`${id}-${k}-error`} className="suggest__error" role="alert">
        <AlertCircle size={16} aria-hidden="true" />
        {text}
      </p>
    );

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
          required
          value={statement}
          placeholder={t.statementPlaceholder}
          aria-invalid={show('statement')}
          aria-describedby={show('statement') ? `${id}-statement-error` : undefined}
          onChange={(e) => setStatement(e.target.value)}
        />
        {error('statement', t.needsStatement)}

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

        <label className="suggest__label" htmlFor={`${id}-domain`}>
          {t.domain}
        </label>
        <div className="suggest__select">
          <select
            id={`${id}-domain`}
            className="suggest__field"
            required
            value={domain}
            aria-invalid={show('domain')}
            aria-describedby={show('domain') ? `${id}-domain-error` : undefined}
            onChange={(e) => setDomain(e.target.value as Family | '')}
          >
            <option value="" disabled>
              {t.domainPlaceholder}
            </option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {en.families[d]}
              </option>
            ))}
          </select>
          <ChevronDown className="suggest__chevron" size={18} aria-hidden="true" />
        </div>
        {error('domain', t.needsDomain)}

        <label className="suggest__label" htmlFor={`${id}-why`}>
          {t.why}
        </label>
        <textarea
          id={`${id}-why`}
          className="suggest__field"
          rows={3}
          required
          value={why}
          placeholder={t.whyPlaceholder}
          aria-invalid={show('why')}
          aria-describedby={show('why') ? `${id}-why-error` : undefined}
          onChange={(e) => setWhy(e.target.value)}
        />
        {error('why', t.needsWhy)}

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

import { useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, ChevronDown, FileText, Paperclip, X } from 'lucide-react';
import { registerExpert } from '../data/api';
import type { Family } from '../data/types';
import { MessageDialog } from './MessageDialog';
import { en } from '../i18n/en';
import './RegisterForm.css';

/** Domains in the dropdown: the ACAPS risk families, "Other" last. */
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

const DOC_TYPES = '.pdf,.doc,.docx';
const MAX_MB = 10;

type Field = 'first' | 'last' | 'email' | 'domain' | 'country' | 'cv' | 'articles';

/**
 * "Become part of our community": expert sign-up on the home page.
 * Required: names, email, one domain, one country, a CV and at least one
 * article in which the expert was cited. A second domain and a second
 * country are optional.
 */
export function RegisterForm() {
  const id = useId();
  const t = en.register;
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  // Up to two domains and two countries; the first of each is required
  const [domain, setDomain] = useState<Family | ''>('');
  const [domain2, setDomain2] = useState<Family | ''>('');
  const [country, setCountry] = useState('');
  const [country2, setCountry2] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [articles, setArticles] = useState<File[]>([]);
  const [tried, setTried] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const cvInput = useRef<HTMLInputElement>(null);
  const articlesInput = useRef<HTMLInputElement>(null);

  const errors: Record<Field, boolean> = {
    first: !first.trim(),
    last: !last.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    domain: !domain,
    country: !country.trim(),
    cv: !cv,
    articles: articles.length === 0,
  };
  const bad = (f: Field) => tried && errors[f];
  const errId = (f: Field) => `${id}-${f}-error`;

  // Keep only documents under the size limit
  const accept = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    const tooBig = list.filter((f) => f.size > MAX_MB * 1024 * 1024);
    setFileError(tooBig.length ? t.tooBig(tooBig[0].name, MAX_MB) : null);
    return list.filter((f) => f.size <= MAX_MB * 1024 * 1024);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    setSending(true);
    await registerExpert({
      first,
      last,
      email,
      domains: [domain as Family, ...(domain2 && domain2 !== domain ? [domain2] : [])],
      countries: [country, ...(country2.trim() ? [country2] : [])],
      cv: cv!,
      articles,
    });
    setSending(false);
    setSent(true);
    setFirst('');
    setLast('');
    setEmail('');
    setDomain('');
    setDomain2('');
    setCountry('');
    setCountry2('');
    setCv(null);
    setArticles([]);
    setTried(false);
  };

  const error = (f: Field, text: string) =>
    bad(f) && (
      <p id={errId(f)} className="reg__error" role="alert">
        <AlertCircle size={16} aria-hidden="true" />
        {text}
      </p>
    );

  const kb = (f: File) =>
    f.size < 1024 * 1024 ? `${Math.max(1, Math.round(f.size / 1024))} KB` : `${(f.size / 1048576).toFixed(1)} MB`;

  return (
    <form className="reg" onSubmit={submit} noValidate>
      <div className="reg__row">
        <div className="reg__field">
          <label className="reg__label" htmlFor={`${id}-first`}>
            {t.first}
          </label>
          <input
            id={`${id}-first`}
            className="reg__input"
            autoComplete="given-name"
            required
            value={first}
            aria-invalid={bad('first')}
            aria-describedby={bad('first') ? errId('first') : undefined}
            onChange={(e) => setFirst(e.target.value)}
          />
          {error('first', t.needsFirst)}
        </div>
        <div className="reg__field">
          <label className="reg__label" htmlFor={`${id}-last`}>
            {t.last}
          </label>
          <input
            id={`${id}-last`}
            className="reg__input"
            autoComplete="family-name"
            required
            value={last}
            aria-invalid={bad('last')}
            aria-describedby={bad('last') ? errId('last') : undefined}
            onChange={(e) => setLast(e.target.value)}
          />
          {error('last', t.needsLast)}
        </div>
      </div>

      <div className="reg__field">
        <label className="reg__label" htmlFor={`${id}-email`}>
          {t.email}
        </label>
        <input
          id={`${id}-email`}
          className="reg__input"
          type="email"
          autoComplete="email"
          required
          value={email}
          placeholder={t.emailPlaceholder}
          aria-invalid={bad('email')}
          aria-describedby={bad('email') ? errId('email') : undefined}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error('email', t.needsEmail)}
      </div>

      {/* Domains: the first is required, a second one is optional */}
      <fieldset className="reg__group">
        <legend className="reg__label">{t.domains}</legend>
        <div className="reg__row">
          <div className="reg__field">
            <label className="reg__sublabel" htmlFor={`${id}-domain`}>
              {t.domainFirst}
            </label>
            <div className="reg__select">
              <select
                id={`${id}-domain`}
                className="reg__input"
                required
                value={domain}
                aria-invalid={bad('domain')}
                aria-describedby={bad('domain') ? errId('domain') : undefined}
                onChange={(e) => {
                  const v = e.target.value as Family | '';
                  setDomain(v);
                  if (v === domain2) setDomain2('');
                }}
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
              <ChevronDown className="reg__chevron" size={18} aria-hidden="true" />
            </div>
            {error('domain', t.needsDomain)}
          </div>
          <div className="reg__field">
            <label className="reg__sublabel" htmlFor={`${id}-domain2`}>
              {t.domainSecond}
            </label>
            <div className="reg__select">
              <select
                id={`${id}-domain2`}
                className="reg__input reg__input--optional"
                value={domain2}
                disabled={!domain}
                onChange={(e) => setDomain2(e.target.value as Family | '')}
              >
                <option value="">{t.none}</option>
                {DOMAINS.filter((d) => d !== domain).map((d) => (
                  <option key={d} value={d}>
                    {en.families[d]}
                  </option>
                ))}
              </select>
              <ChevronDown className="reg__chevron" size={18} aria-hidden="true" />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Countries: the first is required, a second one is optional */}
      <fieldset className="reg__group">
        <legend className="reg__label">{t.countries}</legend>
        <div className="reg__row">
          <div className="reg__field">
            <label className="reg__sublabel" htmlFor={`${id}-country`}>
              {t.countryFirst}
            </label>
            <input
              id={`${id}-country`}
              className="reg__input"
              autoComplete="country-name"
              required
              value={country}
              placeholder={t.countryPlaceholder}
              aria-invalid={bad('country')}
              aria-describedby={bad('country') ? errId('country') : undefined}
              onChange={(e) => setCountry(e.target.value)}
            />
            {error('country', t.needsCountry)}
          </div>
          <div className="reg__field">
            <label className="reg__sublabel" htmlFor={`${id}-country2`}>
              {t.countrySecond}
            </label>
            <input
              id={`${id}-country2`}
              className="reg__input reg__input--optional"
              value={country2}
              placeholder={t.country2Placeholder}
              onChange={(e) => setCountry2(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* CV: one document */}
      <div className="reg__field">
        <span className="reg__label" id={`${id}-cv-label`}>
          {t.cv}
        </span>
        <input
          ref={cvInput}
          id={`${id}-cv`}
          type="file"
          accept={DOC_TYPES}
          className="sr-only"
          aria-labelledby={`${id}-cv-label`}
          aria-invalid={bad('cv')}
          aria-describedby={bad('cv') ? errId('cv') : `${id}-cv-hint`}
          onChange={(e) => {
            const [f] = accept(e.target.files);
            if (f) setCv(f);
            e.target.value = '';
          }}
        />
        {cv ? (
          <ul className="reg__files">
            <FileRow file={cv} size={kb(cv)} onRemove={() => setCv(null)} removeLabel={t.remove(cv.name)} />
          </ul>
        ) : (
          <button
            type="button"
            className={`reg__drop${bad('cv') ? ' is-invalid' : ''}`}
            onClick={() => cvInput.current?.click()}
          >
            <Paperclip size={18} aria-hidden="true" />
            {t.chooseCv}
          </button>
        )}
        <p id={`${id}-cv-hint`} className="reg__hint">
          {t.docHint(MAX_MB)}
        </p>
        {error('cv', t.needsCv)}
      </div>

      {/* Articles where the expert was cited: one or more documents */}
      <div className="reg__field">
        <span className="reg__label" id={`${id}-articles-label`}>
          {t.articles}
        </span>
        <input
          ref={articlesInput}
          type="file"
          multiple
          accept={DOC_TYPES}
          className="sr-only"
          aria-labelledby={`${id}-articles-label`}
          aria-invalid={bad('articles')}
          aria-describedby={bad('articles') ? errId('articles') : `${id}-articles-hint`}
          onChange={(e) => {
            const added = accept(e.target.files);
            setArticles((list) => [...list, ...added.filter((a) => !list.some((b) => b.name === a.name))]);
            e.target.value = '';
          }}
        />
        {articles.length > 0 && (
          <ul className="reg__files">
            {articles.map((a) => (
              <FileRow
                key={a.name}
                file={a}
                size={kb(a)}
                onRemove={() => setArticles((list) => list.filter((b) => b !== a))}
                removeLabel={t.remove(a.name)}
              />
            ))}
          </ul>
        )}
        <button
          type="button"
          className={`reg__drop${bad('articles') ? ' is-invalid' : ''}`}
          onClick={() => articlesInput.current?.click()}
        >
          <Paperclip size={18} aria-hidden="true" />
          {articles.length ? t.addMoreArticles : t.chooseArticles}
        </button>
        <p id={`${id}-articles-hint`} className="reg__hint">
          {t.articlesHint(MAX_MB)}
        </p>
        {error('articles', t.needsArticles)}
      </div>

      {fileError && (
        <p className="reg__error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          {fileError}
        </p>
      )}

      <button type="submit" className="reg__submit" disabled={sending}>
        {t.submit}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      <p className="reg__privacy">{t.privacy}</p>

      <MessageDialog
        open={sent}
        title={t.sentTitle}
        body={t.sentBody}
        actions={[{ label: t.ok, onClick: () => setSent(false) }]}
        onClose={() => setSent(false)}
      />
    </form>
  );
}

function FileRow({
  file,
  size,
  onRemove,
  removeLabel,
}: {
  file: File;
  size: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="reg__file">
      <FileText size={18} aria-hidden="true" />
      <span className="reg__file-name">{file.name}</span>
      <span className="reg__file-size">{size}</span>
      <button type="button" className="reg__file-remove" aria-label={removeLabel} onClick={onRemove}>
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

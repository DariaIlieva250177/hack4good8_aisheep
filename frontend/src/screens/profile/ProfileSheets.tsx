import { useEffect, useId, useState, type FormEvent } from 'react';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { changePassword, setLanguage, setNotificationPrefs, setTwoStep, updateProfile } from '../../data/api';
import type { Family, LanguageCode, NotificationPrefs, User } from '../../data/types';
import { en } from '../../i18n/en';
import { LANGUAGES } from './languages';
import { applyLanguage } from '../../i18n/language';

/*
 * The panels behind the Profile rows. Each one saves through the data layer
 * (in memory in this prototype) and confirms with a toast.
 */

export type SheetName = 'personal' | 'security' | 'notifications' | 'language' | 'about';

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


interface Props {
  me: User;
  open: SheetName | null;
  onClose: () => void;
}

export function ProfileSheets({ me, open, onClose }: Props) {
  return (
    <>
      <PersonalSheet me={me} open={open === 'personal'} onClose={onClose} />
      <SecuritySheet me={me} open={open === 'security'} onClose={onClose} />
      <NotificationsSheet me={me} open={open === 'notifications'} onClose={onClose} />
      <LanguageSheet me={me} open={open === 'language'} onClose={onClose} />
      <AboutSheet open={open === 'about'} onClose={onClose} />
    </>
  );
}

/* ---------- Personal information ---------- */

function PersonalSheet({ me, open, onClose }: { me: User; open: boolean; onClose: () => void }) {
  const id = useId();
  const t = en.settings.personal;
  const toast = useToast();
  const [form, setForm] = useState(() => pick(me));
  const [tried, setTried] = useState(false);

  // Start from the saved values each time it opens
  useEffect(() => {
    if (open) {
      setForm(pick(me));
      setTried(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errors = {
    name: !form.name.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    await updateProfile({
      name: form.name.trim(),
      pseudonym: form.pseudonym.trim(),
      email: form.email.trim(),
      country: form.country.trim(),
      domain: form.domain as Family,
      bio: form.bio.trim(),
    });
    toast({ message: t.saved });
    onClose();
  };

  const field = (k: 'name' | 'email', label: string, type = 'text', hint?: string) => (
    <div className="sheet-field">
      <label className="sheet-label" htmlFor={`${id}-${k}`}>
        {label}
      </label>
      <input
        id={`${id}-${k}`}
        className="sheet-input"
        type={type}
        value={form[k]}
        aria-invalid={tried && errors[k]}
        aria-describedby={hint ? `${id}-${k}-hint` : undefined}
        onChange={set(k)}
      />
      {hint && (
        <p id={`${id}-${k}-hint`} className="sheet-hint">
          {hint}
        </p>
      )}
      {tried && errors[k] && <p className="sheet-error">{t.errors[k]}</p>}
    </div>
  );

  return (
    <Sheet
      open={open}
      title={t.title}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="sheet-btn" onClick={onClose}>
            {en.settings.cancel}
          </button>
          <button type="submit" className="sheet-btn sheet-btn--primary">
            {en.settings.save}
          </button>
        </>
      }
    >
      {field('name', t.name, 'text', t.nameHint)}
      {field('email', t.email, 'email', t.emailHint)}
      <div className="sheet-field">
        <label className="sheet-label" htmlFor={`${id}-country`}>
          {t.country}
        </label>
        <input id={`${id}-country`} className="sheet-input" value={form.country} onChange={set('country')} />
      </div>
      <div className="sheet-field">
        <label className="sheet-label" htmlFor={`${id}-domain`}>
          {t.domain}
        </label>
        <select id={`${id}-domain`} className="sheet-input" value={form.domain} onChange={set('domain')}>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {en.families[d]}
            </option>
          ))}
        </select>
      </div>
      <div className="sheet-field">
        <label className="sheet-label" htmlFor={`${id}-panel`}>
          {t.panel}
        </label>
        <input id={`${id}-panel`} className="sheet-input" value={en.profile.panel(me.panel)} readOnly />
        <p className="sheet-hint">{t.panelHint}</p>
      </div>
      <div className="sheet-field">
        <label className="sheet-label" htmlFor={`${id}-bio`}>
          {t.bio}
        </label>
        <textarea id={`${id}-bio`} className="sheet-input" value={form.bio} onChange={set('bio')} maxLength={280} />
        <p className="sheet-hint">{t.bioHint(form.bio.length)}</p>
      </div>
    </Sheet>
  );
}

function pick(me: User) {
  return {
    name: me.name,
    pseudonym: me.pseudonym,
    email: me.email,
    country: me.country,
    domain: me.domain,
    bio: me.bio,
  };
}

/* ---------- Password and security ---------- */

function strength(pw: string): number {
  if (!pw) return 0;
  let n = 0;
  if (pw.length >= 8) n++;
  if (pw.length >= 12) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) n++;
  return Math.max(1, n);
}

function SecuritySheet({ me, open, onClose }: { me: User; open: boolean; onClose: () => void }) {
  const id = useId();
  const t = en.settings.security;
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setTried(false);
    }
  }, [open]);

  const errors = {
    current: !current,
    next: next.length < 8,
    confirm: confirm !== next || !confirm,
  };
  const level = strength(next);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.current || errors.next || errors.confirm) return;
    setSaving(true);
    const res = await changePassword(current, next);
    setSaving(false);
    if (!res.ok) return;
    toast({ message: t.changed });
    onClose();
  };

  const pw = (key: 'current' | 'next' | 'confirm', label: string, value: string, onChange: (v: string) => void) => (
    <div className="sheet-field">
      <label className="sheet-label" htmlFor={`${id}-${key}`}>
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        className="sheet-input"
        type="password"
        autoComplete={key === 'current' ? 'current-password' : 'new-password'}
        value={value}
        aria-invalid={tried && errors[key]}
        onChange={(e) => onChange(e.target.value)}
      />
      {tried && errors[key] && <p className="sheet-error">{t.errors[key]}</p>}
    </div>
  );

  return (
    <Sheet
      open={open}
      title={t.title}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="sheet-btn" onClick={onClose}>
            {en.settings.close}
          </button>
          <button type="submit" className="sheet-btn sheet-btn--primary" disabled={saving}>
            {t.change}
          </button>
        </>
      }
    >
      <h3 className="sheet-section-title">{t.password}</h3>
      <p className="sheet-hint">{t.lastChanged(me.passwordChanged)}</p>
      {pw('current', t.current, current, setCurrent)}
      {pw('next', t.next, next, setNext)}
      <div className="strength" data-level={level} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="sheet-hint" aria-live="polite">
        {next ? t.strength[level - 1] : t.rules}
      </p>
      {pw('confirm', t.confirm, confirm, setConfirm)}

      <h3 className="sheet-section-title">{t.signIn}</h3>
      <label className="sheet-row">
        <span className="sheet-row__text">
          <span className="sheet-row__title">{t.twoStep}</span>
          <span className="sheet-hint">{t.twoStepHint}</span>
        </span>
        <input
          type="checkbox"
          className="switch"
          checked={me.twoStep}
          onChange={async (e) => {
            await setTwoStep(e.target.checked);
            toast({ message: e.target.checked ? t.twoStepOn : t.twoStepOff });
          }}
        />
      </label>

      <h3 className="sheet-section-title">{t.sessions}</h3>
      <ul className="sessions">
        {t.sessionList.map((s, i) => (
          <li key={s.device}>
            <span>{s.device}</span>
            <span className={i === 0 ? 'sessions__now' : 'sheet-hint'}>{i === 0 ? t.thisDevice : s.when}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="sheet-btn" onClick={() => toast({ message: t.signedOutOthers })}>
        {t.signOutOthers}
      </button>
    </Sheet>
  );
}

/* ---------- Notifications ---------- */

function NotificationsSheet({ me, open, onClose }: { me: User; open: boolean; onClose: () => void }) {
  const t = en.settings.notifications;
  const toast = useToast();
  const keys = Object.keys(t.items) as (keyof NotificationPrefs)[];

  const toggle = async (k: keyof NotificationPrefs, on: boolean) => {
    await setNotificationPrefs({ ...me.notifications, [k]: on });
    toast({ message: t.saved });
  };

  return (
    <Sheet
      open={open}
      title={t.title}
      onClose={onClose}
      footer={
        <button type="button" className="sheet-btn sheet-btn--primary" onClick={onClose}>
          {en.settings.done}
        </button>
      }
    >
      <p className="sheet-hint">{t.intro}</p>
      <div>
        {keys.map((k) => (
          <label key={k} className="sheet-row">
            <span className="sheet-row__text">
              <span className="sheet-row__title">{t.items[k].title}</span>
              <span className="sheet-hint">{t.items[k].body}</span>
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={me.notifications[k]}
              onChange={(e) => toggle(k, e.target.checked)}
            />
          </label>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------- Language ---------- */

function LanguageSheet({ me, open, onClose }: { me: User; open: boolean; onClose: () => void }) {
  const t = en.settings.language;
  const [choice, setChoice] = useState<LanguageCode>(me.language);

  useEffect(() => {
    if (open) setChoice(me.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    await setLanguage(choice);
    onClose();
    // Switches every screen to the chosen language (and right-to-left for Arabic)
    applyLanguage(choice);
  };

  return (
    <Sheet
      open={open}
      title={t.title}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="sheet-btn" onClick={onClose}>
            {en.settings.cancel}
          </button>
          <button type="submit" className="sheet-btn sheet-btn--primary">
            {en.settings.save}
          </button>
        </>
      }
    >
      <fieldset className="lang-list">
        <legend className="sr-only">{t.title}</legend>
        {LANGUAGES.map((l) => (
          <label key={l.code} className="lang-option">
            <span>
              <span className="lang-option__name">{l.name}</span>
              <span className="lang-option__native" lang={l.code} dir={l.code === 'ar' ? 'rtl' : undefined}>
                {l.native}
              </span>
            </span>
            <input
              type="radio"
              name="language"
              value={l.code}
              checked={choice === l.code}
              onChange={() => setChoice(l.code)}
            />
          </label>
        ))}
      </fieldset>
    </Sheet>
  );
}

/* ---------- About ---------- */

function AboutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = en.settings.about;
  return (
    <Sheet
      open={open}
      title={t.title}
      onClose={onClose}
      footer={
        <button type="button" className="sheet-btn sheet-btn--primary" onClick={onClose}>
          {en.settings.close}
        </button>
      }
    >
      {t.paragraphs.map((p) => (
        <p key={p} className="sheet-hint" style={{ fontSize: 15, color: 'var(--ink)' }}>
          {p}
        </p>
      ))}
      <p className="sheet-hint">{t.version}</p>
    </Sheet>
  );
}

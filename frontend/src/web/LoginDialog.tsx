import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { signIn } from './auth';
import { useLoginDefaults } from '../mode/loginDefaults';
import { en } from '../i18n/en';
import './LoginDialog.css';

/**
 * "Log in" pop-up on the home page. On success it signs in and opens the
 * full website (Risks), where the menu and your avatar appear.
 * Prototype: any well-formed email and a password are accepted.
 */
export function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const id = useId();
  const t = en.webLogin;
  const ref = useRef<HTMLDialogElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const applyDefaults = useLoginDefaults();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start in the email field, not on the close button
      emailInput.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const badPassword = !password;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (badEmail || badPassword) return;
    applyDefaults();
    signIn();
    onClose();
    navigate('/risks');
  };

  const apply = () => {
    onClose();
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <dialog
      ref={ref}
      className="login-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Clicking the dimmed backdrop closes it
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="login-dialog__panel" onSubmit={submit} noValidate>
        <button type="button" className="login-dialog__close" aria-label={t.close} onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <Logo className="login-dialog__logo" label="" />
        <h2 id={`${id}-title`} className="login-dialog__title">
          {t.title}
        </h2>
        <p className="login-dialog__intro">{t.intro}</p>

        <label className="login-dialog__label" htmlFor={`${id}-email`}>
          {t.email}
        </label>
        <input
          id={`${id}-email`}
          className="login-dialog__input"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={tried && badEmail}
          aria-describedby={tried && badEmail ? `${id}-email-error` : undefined}
          onChange={(e) => setEmail(e.target.value)}
          ref={emailInput}
        />
        {tried && badEmail && (
          <p id={`${id}-email-error`} className="login-dialog__error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {t.needsEmail}
          </p>
        )}

        <label className="login-dialog__label" htmlFor={`${id}-password`}>
          {t.password}
        </label>
        <input
          id={`${id}-password`}
          className="login-dialog__input"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={tried && badPassword}
          aria-describedby={tried && badPassword ? `${id}-password-error` : undefined}
          onChange={(e) => setPassword(e.target.value)}
        />
        {tried && badPassword && (
          <p id={`${id}-password-error`} className="login-dialog__error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {t.needsPassword}
          </p>
        )}

        <button type="submit" className="login-dialog__submit">
          {t.submit}
        </button>
        <p className="login-dialog__alt">
          {t.newHere}{' '}
          <button type="button" className="login-dialog__link" onClick={apply}>
            {t.apply}
          </button>
        </p>
      </form>
    </dialog>
  );
}

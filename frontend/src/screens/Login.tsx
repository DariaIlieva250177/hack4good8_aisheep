import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserRound } from 'lucide-react';
import type { Family, ImageCategory } from '../data/types';
import { MetalShape } from '../components/MetalShape';
import { RiskImage } from '../components/RiskImage';
import { useToast } from '../components/Toast';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './Login.css';

const FAN: { family: Family; image: ImageCategory }[] = [
  { family: 'hydromet', image: 'flood' },
  { family: 'conflict', image: 'displacement' },
  { family: 'conflict', image: 'border' },
  { family: 'hydromet', image: 'drought' },
  { family: 'economic', image: 'economic' },
];

export function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const { mode } = useMode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // UI only: any input logs in. Real authentication comes with the backend.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/risks');
  };

  const notYet = () => toast({ message: en.common.notInPrototype });

  return (
    <main className="login">
      <div className="login__hero">
        <MetalShape variant="coil" size={230} />
      </div>

      <form className="login__card soft-card" onSubmit={submit}>
        <h1 className="login__title t-title">{en.login.title}</h1>
        <p className="t-small t-muted">{en.login.intro}</p>

        <div>
          <label className="field-label" htmlFor="username">
            {en.login.username}
          </label>
          <div className="inset">
            <UserRound size={18} aria-hidden="true" />
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            {en.login.password}
          </label>
          <div className="inset">
            <Lock size={18} aria-hidden="true" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-pill login__submit">
          {en.login.submit}
        </button>

        <p className="login__links t-small">
          <button type="button" className="link-btn" onClick={notYet}>
            {en.login.forgot}
          </button>
          <span className="t-muted">{en.login.or}</span>
          <button type="button" className="link-btn" onClick={notYet}>
            {en.login.signUp}
          </button>
        </p>
      </form>

      {mode === 'rich' && (
        <ul className="login__fan" aria-hidden="true">
          {FAN.map((tile, i) => {
            const offset = i - (FAN.length - 1) / 2;
            return (
              <li
                key={tile.image}
                className="login__tile soft-card"
                style={{
                  transform: `rotate(${offset * 11}deg)`,
                }}
              >
                <RiskImage family={tile.family} image={tile.image} variant="tile" decorative />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

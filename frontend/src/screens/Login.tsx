import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Lock, UserRound } from 'lucide-react';
import type { Family, ImageCategory } from '../data/types';
import { MetalShape } from '../components/MetalShape';
import { RiskImage } from '../components/RiskImage';
import { TileWheel } from '../components/TileWheel';
import { useToast } from '../components/Toast';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './Login.css';

const STORY_IMAGES: { family: Family; image: ImageCategory }[] = [
  { family: 'conflict', image: 'border' },
  { family: 'hydromet', image: 'drought' },
  { family: 'conflict', image: 'displacement' },
];
const STORY_MS = 4500;

export function Login() {
  const [stage, setStage] = useState<'intro' | 'login'>('intro');
  const { reducedMotion } = useMode();

  return (
    <main className="login">
      <AnimatePresence mode="wait" initial={false}>
        {stage === 'intro' ? (
          <Intro key="intro" onDone={() => setStage('login')} reducedMotion={reducedMotion} />
        ) : (
          <LoginForm key="login" reducedMotion={reducedMotion} />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ---------- Onboarding stories ---------- */

function Intro({ onDone, reducedMotion }: { onDone: () => void; reducedMotion: boolean }) {
  const [index, setIndex] = useState(0);
  const stories = en.intro.stories;
  const last = stories.length - 1;

  // Advance once through the stories, then stop. No auto-advance under reduced motion.
  useEffect(() => {
    if (reducedMotion || index === last) return;
    const id = window.setTimeout(() => setIndex((i) => Math.min(last, i + 1)), STORY_MS);
    return () => window.clearTimeout(id);
  }, [index, last, reducedMotion]);

  const story = stories[index];

  return (
    <motion.section
      className="intro soft-card"
      aria-label={en.intro.label}
      exit={reducedMotion ? { opacity: 0 } : { scale: 0.24, y: 300, opacity: 0, borderRadius: 80 }}
      transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.6, 0, 0.3, 1] }}
    >
      <ol className="intro__progress" aria-label={en.intro.storyOf(index + 1, stories.length)}>
        {stories.map((s, i) => (
          <li key={s.title} className="intro__bar">
            <span
              key={`${i}-${index}`}
              className={`intro__fill${i < index ? ' is-done' : ''}${i === index ? ' is-active' : ''}${reducedMotion ? ' is-still' : ''}`}
              style={{ animationDuration: `${STORY_MS}ms` }}
            />
          </li>
        ))}
      </ol>

      <div className="intro__media">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={index}
            className="intro__image"
            initial={reducedMotion ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RiskImage family={STORY_IMAGES[index].family} image={STORY_IMAGES[index].image} variant="hero" />
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          className="intro__tap intro__tap--prev"
          aria-label={en.intro.previous}
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        />
        <button
          type="button"
          className="intro__tap intro__tap--next"
          aria-label={en.intro.next}
          disabled={index === last}
          onClick={() => setIndex((i) => Math.min(last, i + 1))}
        />
      </div>

      <div className="intro__text" aria-live="polite">
        <h1 className="intro__title t-question">{story.title}</h1>
        <p className="t-muted">{story.body}</p>
      </div>

      <div className="intro__actions">
        <button type="button" className="btn btn-primary btn-pill intro__start" onClick={onDone}>
          {en.intro.start}
        </button>
        <button type="button" className="link-btn" onClick={onDone}>
          {en.intro.haveAccount}
        </button>
      </div>
    </motion.section>
  );
}

/* ---------- Log in ---------- */

function LoginForm({ reducedMotion }: { reducedMotion: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI only: any input logs in. Real authentication comes with the backend.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/risks');
  };

  const notYet = () => toast({ message: en.common.notInPrototype });
  const enter = (delay: number) =>
    reducedMotion
      ? {}
      : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay } };

  return (
    <div className="login__stage">
      <motion.div className="login__hero" {...enter(0.05)}>
        <MetalShape variant="coil" size={170} />
      </motion.div>

      <motion.form className="login__card soft-card" onSubmit={submit} {...enter(0.15)}>
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="login__eye"
              aria-label={en.login.showPassword}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
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
      </motion.form>

      <motion.div
        className="login__wheel"
        {...(reducedMotion ? {} : { initial: { opacity: 0, y: 60 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.3 } })}
      >
        <TileWheel />
      </motion.div>
    </div>
  );
}

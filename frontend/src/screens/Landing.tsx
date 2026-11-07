import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { TileSphere, type SphereTile } from '../components/TileSphere';
import { RegisterForm } from '../components/RegisterForm';
import { WebNav } from '../components/WebNav';
import { LoginDialog } from '../web/LoginDialog';
import { useSignedIn } from '../web/auth';
import { IMAGE_CATEGORIES, imageUrl } from '../data/families';
import type { ImageCategory } from '../data/types';
import { en } from '../i18n/en';
import './Landing.css';

/*
 * Home page of the web version: introduces the ACAPS Community sub-brand.
 * The hero follows the "Inspo planet" reference: a sphere of picture tiles
 * (our risk illustrations) with editorial text in the corners. The globe
 * turns on its own and can be dragged; the pictures are decorative.
 */

const CATEGORIES = Object.keys(IMAGE_CATEGORIES) as ImageCategory[];

export function Landing() {
  const t = en.landing;
  const signedIn = useSignedIn();
  // ?login=1 (sent here from a web page while signed out) opens the log-in pop-up
  const [loginOpen, setLoginOpen] = useState(() => new URLSearchParams(window.location.search).has('login'));
  const tiles: SphereTile[] = useMemo(
    () => CATEGORIES.map((c) => ({ key: c, src: imageUrl(c), alt: t.categories[c] })),
    [t.categories],
  );

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="landing">
      {/* Signed out: logo + "Log in"; signed in: the full menu and your avatar */}
      {signedIn ? <WebNav /> : <WebNav onLogin={() => setLoginOpen(true)} />}
      <LoginDialog open={loginOpen && !signedIn} onClose={() => setLoginOpen(false)} />
      {/* ---------- Hero: the risk sphere ---------- */}
      <section className="lp-hero" aria-label={t.brand}>
        <div className="lp-hero__sphere" role="group" aria-label={t.sphereLabel}>
          <TileSphere tiles={tiles} />
        </div>

        <header className="lp-corner lp-corner--tl">
          <h1 className="lp-title">
            <span className="lp-accent">{t.heroA}</span>
            <br />
            {t.heroB}
          </h1>
          <a className="lp-link" href="#how">
            <span className="lp-dot" aria-hidden="true" />
            {t.howLink}
          </a>
        </header>

        <div className="lp-corner lp-corner--tr" aria-hidden="true">
          <span className="lp-tag">{t.tagA}</span>
          <span className="lp-tag">{t.tagB}</span>
        </div>

        <p className="lp-corner lp-corner--bl lp-intro">{t.intro}</p>

        {/* Under the globe: jumps to the registration form at the end of the page */}
        <a href="#register" className="lp-register-now">
          {t.registerNow}
          <ArrowDown size={18} aria-hidden="true" />
        </a>

        <p className="lp-corner lp-corner--br lp-big">
          <span className="lp-accent">{t.bigA}</span>
          <br />
          {t.bigB}
        </p>

      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="lp-section" aria-labelledby="lp-how">
        <h2 id="lp-how" className="lp-h2">
          {t.howTitle}
        </h2>
        <ol className="lp-steps">
          {t.how.map((s, i) => (
            <li key={s.title} className={`lp-step lp-step--${i + 1}`}>
              <span className="lp-step__n" aria-hidden="true">
                {pad(i + 1)}
              </span>
              <h3 className="lp-step__title">{s.title}</h3>
              <p className="lp-step__body">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Why to choose us ---------- */}
      <section className="lp-section" aria-labelledby="lp-choose">
        <h2 id="lp-choose" className="lp-h2">
          {t.chooseTitle}
        </h2>
        <ol className="lp-choose">
          {t.choose.map((c, i) => (
            <li key={c.title} className="lp-choose__item">
              <span className="lp-choose__n" aria-hidden="true">
                {pad(i + 1)}
              </span>
              <div>
                <h3 className="lp-step__title">{c.title}</h3>
                <p className="lp-step__body">{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Why ---------- */}
      <section className="lp-section" aria-labelledby="lp-why">
        <h2 id="lp-why" className="lp-h2">
          {t.whyTitle}
        </h2>
        <ul className="lp-why">
          {t.why.map((w) => (
            <li key={w.title} className="lp-why__item">
              <h3 className="lp-step__title">{w.title}</h3>
              <p className="lp-step__body">{w.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- The app itself, live: a blue band with the phone over it ---------- */}
      <section className="lp-app" aria-labelledby="lp-app">
        <div className="lp-app__inner">
          <div className="lp-app__text">
            <h2 id="lp-app" className="lp-app__title">
              {t.appTitleA}
              <br />
              {t.appTitleB}
            </h2>
            <p className="lp-app__body">{t.appBody}</p>
            <a href="/app/login" className="lp-button lp-button--white">
              {t.appCta}
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="lp-phone">
            {/* The real app (its Community screen, light), scaled down into the frame */}
            <iframe
              className="lp-phone__screen"
              src="/app/community?appearance=light"
              title={t.appFrame}
              loading="lazy"
              tabIndex={-1}
            />
          </div>
        </div>
      </section>

      {/* ---------- Registration ---------- */}
      <section id="register" className="lp-section lp-register" aria-labelledby="lp-register">
        <div className="lp-register__head">
          <h2 id="lp-register" className="lp-h2 lp-register__title">
            {en.register.titleA}
            <br />
            {en.register.titleB}
            <br />
            <span className="lp-accent">{en.register.titleC}</span>
          </h2>
          <p className="lp-step__body">{en.register.intro}</p>
        </div>
        <RegisterForm />
      </section>

      {/* ---------- Call to action ---------- */}
      <footer className="lp-footer">
        <h2 className="lp-footer__title">{t.ctaTitle}</h2>
        <p className="lp-step__body">{t.ctaBody}</p>
        {/* Joining means applying: back up to the registration form */}
        <a href="#register" className="lp-button lp-button--light">
          {t.join}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
        <p className="lp-credit">{t.credit}</p>
      </footer>
    </div>
  );
}

import { useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { DATA, calm, fmtISO, plural } from '../data';
import { S, askReason, blankUp, commit, decide, toast, useAnalyst } from '../store';
import type { Upload as UploadForm } from '../store';
import { LevelChip, Wdots } from '../ui';
import { go } from '../nav';
import { useAfterPaint } from './cx-sections';

/*
 * Upload a risk: write a risk card, see who would get it, publish it to the
 * experts approved for its countries or fields. (Demo: publishing is logged.)
 */

const PROB_ORDER = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const STEP_WORDS = ['Very unlikely', 'Unlikely', 'Even chance', 'Likely', 'Very likely'];
const HORIZON: Record<string, string> = { 3: 'three months', 6: 'six months' };
const BAND: Record<string, string> = {
  'Very Low': '0–20%',
  Low: '21–40%',
  Medium: '41–60%',
  High: '61–80%',
  'Very High': '81–100%',
};
const UP_ERR: Record<string, string> = {
  statement: 'Write the risk statement.',
  countries: 'Add at least one country.',
  field: 'Pick the field.',
  prob: 'Pick the probability.',
  impact: 'Pick the impact.',
  level: 'Pick the risk level.',
  closes: 'Answers must close after they open.',
};

/** Experts who would get the card: know the country and the field, only the country, only the field */
function receivers(u: UploadForm) {
  const t = { both: 0, country: 0, field: 0 };
  for (const e of DATA.experts) {
    const c = u.countries.some((x) => e.countries.includes(x));
    const d = [u.field, ...(u.more || [])].some((f) => f && e.fields.includes(f));
    if (c && d) t.both++;
    else if (c) t.country++;
    else if (d) t.field++;
  }
  return t;
}

/** A form value changed (the original's data-up="k") */
function setUp(k: string, v: string) {
  const u = S.up;
  if (k === 'from') {
    if (v) go(`/upload/${v}`);
    else {
      S.up = blankUp();
      go('/upload', { replace: true });
      commit();
    }
    return;
  }
  if (k.startsWith('trig:')) {
    const [, i, f] = k.split(':');
    u.triggers[+i][f as 'title' | 'goal'] = v;
  } else (u as unknown as Record<string, string>)[k] = v;
  delete u.err[k];
  commit();
}
const bind = (k: string) => ({
  'data-up': k,
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setUp(k, e.target.value),
});

const Opt = ({ v, l }: { v: string | number; l: string }) => <option value={String(v)}>{l}</option>;

function UpFormFields({ after }: { after: (f: () => void) => void }) {
  const u = S.up;
  const [country, setCountry] = useState('');
  const [more, setMore] = useState('');
  const countryBox = useRef<HTMLInputElement>(null);
  const er = (k: string): ReactNode => (u.err[k] ? <p className="err">{UP_ERR[k]}</p> : null);

  const upAddCountry = () => {
    const v = country.trim();
    const hit = DATA.countryList.find((c) => c.toLowerCase() === v.toLowerCase());
    S.ui.err.upCountry = !!v && !hit;
    if (hit && !S.up.countries.includes(hit)) {
      S.up.countries.push(hit);
      delete S.up.err.countries;
    }
    if (hit) setCountry('');
    after(() => countryBox.current?.focus());
    commit();
  };
  const upAddField = () => {
    const uu = S.up;
    uu.more = uu.more || [];
    if (more && more !== uu.field && !uu.more.includes(more)) uu.more.push(more);
    setMore('');
    commit();
  };

  return (
    <>
      <div className="fld">
        <label className="lab" htmlFor="upFrom">
          Start from a suggested risk
        </label>
        <select id="upFrom" className="sel" value={u.from || ''} {...bind('from')}>
          <Opt v="" l="Start blank" />
          {DATA.cards.map((c) => (
            <Opt
              key={c.id}
              v={c.id}
              l={`${c.area}: ${c.statement.length > 80 ? c.statement.slice(0, 80).trim() + '…' : c.statement}`}
            />
          ))}
        </select>
      </div>
      <div className="fld">
        <label className="lab" htmlFor="upStatement">
          Risk statement
        </label>
        <textarea
          id="upStatement"
          className="serif-in"
          rows={3}
          placeholder="What could happen, where, and what it would cause"
          value={u.statement}
          {...bind('statement')}
        />
        {er('statement')}
      </div>
      <div className="two">
        <div className="fld">
          <label className="lab" htmlFor="upCountry">
            Countries <span className="req">at least one</span>
          </label>
          <div className="row">
            <input
              type="text"
              id="upCountry"
              ref={countryBox}
              list="upCountries"
              placeholder="Type a country, then Enter"
              autoComplete="off"
              className="grow"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  upAddCountry();
                }
              }}
            />
            <button type="button" className="btn" onClick={upAddCountry}>
              Add
            </button>
          </div>
          <datalist id="upCountries">
            {DATA.countryList
              .filter((c) => !u.countries.includes(c))
              .map((c) => (
                <option key={c} value={c} />
              ))}
          </datalist>
          {u.countries.length > 0 && (
            <div className="cchips">
              {u.countries.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-label={`Remove ${c}`}
                  onClick={() => {
                    S.up.countries = S.up.countries.filter((x) => x !== c);
                    after(() => countryBox.current?.focus());
                    commit();
                  }}
                >
                  {c} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
          {er('countries')}
          {S.ui.err.upCountry && <p className="err">Pick a country from the list.</p>}
        </div>
        <div className="fld">
          <label className="lab" htmlFor="upArea">
            Area on the card
          </label>
          <input type="text" id="upArea" value={u.area} placeholder="For example, Eastern Chad" {...bind('area')} />
        </div>
      </div>
      <div className="two">
        <div className="fld">
          <label className="lab" htmlFor="upField">
            Main field <span className="req">required</span>
          </label>
          <select id="upField" className="sel" value={u.field} {...bind('field')}>
            <Opt v="" l="Pick a field" />
            {DATA.fieldList.map((d) => (
              <Opt key={d} v={d} l={d} />
            ))}
          </select>
          {er('field')}
        </div>
        <div className="fld">
          <label className="lab" htmlFor="upMore">
            More fields <span className="opt">optional</span>
          </label>
          <div className="row">
            <select id="upMore" className="sel grow" value={more} onChange={(e) => setMore(e.target.value)}>
              <Opt v="" l="Add another field" />
              {DATA.fieldList
                .filter((d) => d !== u.field && !(u.more || []).includes(d))
                .map((d) => (
                  <Opt key={d} v={d} l={d} />
                ))}
            </select>
            <button type="button" className="btn" onClick={upAddField}>
              Add
            </button>
          </div>
          {(u.more || []).length > 0 && (
            <div className="cchips">
              {u.more.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="chip"
                  aria-label={`Remove ${f}`}
                  onClick={() => {
                    S.up.more = (S.up.more || []).filter((x) => x !== f);
                    commit();
                  }}
                >
                  {f} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="three">
        <div className="fld">
          <label className="lab" htmlFor="upProb">
            Probability
          </label>
          <select id="upProb" className="sel" value={u.prob} {...bind('prob')}>
            <Opt v="" l="Pick" />
            {PROB_ORDER.map((p) => (
              <Opt key={p} v={p} l={BAND[p] ? `${p} (${BAND[p]})` : p} />
            ))}
          </select>
          {er('prob')}
        </div>
        <div className="fld">
          <label className="lab" htmlFor="upImpact">
            Impact
          </label>
          <select id="upImpact" className="sel" value={String(u.impact)} {...bind('impact')}>
            <Opt v="" l="Pick" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Opt key={i} v={i} l={`${i} of 5`} />
            ))}
          </select>
          {er('impact')}
        </div>
        <div className="fld">
          <label className="lab" htmlFor="upLevel">
            Risk level
          </label>
          <select id="upLevel" className="sel" value={u.level} {...bind('level')}>
            <Opt v="" l="Pick" />
            {['High', 'Medium', 'Low'].map((l) => (
              <Opt key={l} v={l} l={l} />
            ))}
          </select>
          {er('level')}
        </div>
      </div>
      <fieldset className="fld trigs">
        <legend className="lab">Triggers</legend>
        {u.triggers.map((t, i) => (
          <div key={i} className="trig-in">
            <input
              type="text"
              aria-label={`Trigger ${i + 1}`}
              value={t.title}
              placeholder={`Trigger ${i + 1}: what to watch`}
              {...bind(`trig:${i}:title`)}
            />
            <input
              type="text"
              aria-label={`Trigger ${i + 1}, 100% when`}
              value={t.goal}
              placeholder="100% when"
              {...bind(`trig:${i}:goal`)}
            />
            {u.triggers.length > 1 ? (
              <button
                type="button"
                className="btn btn-ghost"
                aria-label={`Remove trigger ${i + 1}`}
                onClick={() => {
                  S.up.triggers.splice(i, 1);
                  commit();
                }}
              >
                Remove
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        <div className="row-t">
          <button
            type="button"
            className="btn"
            onClick={() => {
              S.up.triggers.push({ title: '', goal: '' });
              after(() =>
                document.querySelector<HTMLInputElement>(`[data-up="trig:${S.up.triggers.length - 1}:title"]`)?.focus(),
              );
              commit();
            }}
          >
            Add a trigger
          </button>
        </div>
      </fieldset>
      <div className="fld">
        <label className="lab" htmlFor="upRationale">
          Rationale
        </label>
        <textarea
          id="upRationale"
          className="serif-in"
          rows={4}
          placeholder="Why ACAPS sees this risk now"
          value={u.rationale}
          {...bind('rationale')}
        />
      </div>
      <div className="three">
        <div className="fld">
          <label className="lab" htmlFor="upOpens">
            Answers open
          </label>
          <input type="date" id="upOpens" className="sel" value={u.opens} {...bind('opens')} />
        </div>
        <div className="fld">
          <label className="lab" htmlFor="upCloses">
            Answers close
          </label>
          <input type="date" id="upCloses" className="sel" value={u.closes} {...bind('closes')} />
          {er('closes')}
        </div>
        <div className="fld">
          <label className="lab" htmlFor="upHorizon">
            Likelihood question
          </label>
          <select id="upHorizon" className="sel" value={u.horizon} {...bind('horizon')}>
            <Opt v="3" l="Within three months" />
            <Opt v="6" l="Within six months" />
          </select>
        </div>
      </div>
    </>
  );
}

function UpSide({ after }: { after: (f: () => void) => void }) {
  const u = S.up;
  const t = receivers(u);
  const n = t.both + t.country + t.field;

  const upPublish = (anchor: HTMLElement) => {
    const err: Record<string, number> = {};
    if (!u.statement.trim()) err.statement = 1;
    if (!u.countries.length) err.countries = 1;
    if (!u.field) err.field = 1;
    if (!u.prob) err.prob = 1;
    if (!u.impact) err.impact = 1;
    if (!u.level) err.level = 1;
    if (!u.closes || (u.opens && u.closes <= u.opens)) err.closes = 1;
    u.err = err;
    if (Object.keys(err).length) {
      after(() => {
        const first = document.querySelector('#upForm .err');
        const f = first?.closest('.fld')?.querySelector<HTMLElement>('input,textarea,select');
        if (f) {
          f.focus({ preventScroll: true });
          f.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
        }
      });
      commit();
      return;
    }
    askReason(anchor, {
      title: 'Why publish this risk now?',
      ok: 'Publish',
      quick: ['Not on the radar yet', 'Raised by experts and checked'],
      done: (why) => {
        const what = `Published a risk to ${plural(n, 'expert')}: ${u.statement.trim()}`;
        S.published.unshift({ statement: u.statement.trim(), countries: [...u.countries], n, closes: u.closes });
        if (u.from) S.cards[u.from] = { action: 'add', why, when: new Date(), published: true };
        S.up = blankUp();
        if (u.from) {
          // Leaving /upload/<card> closes the toast, so show it once the page has changed
          decide(what, why, false);
          go('/upload', { replace: true });
          setTimeout(() => toast(what), 60);
        } else decide(what, why);
      },
    });
  };

  return (
    <>
      <section className="pn-card">
        <h2>
          Preview <small>the card as experts will see it</small>
        </h2>
        <div className="prev">
          <div className="op-meta">
            <span>{u.area || u.countries.join(', ') || 'Area'}</span>
            {u.level && <LevelChip level={u.level} />}
          </div>
          <p className="st">
            {u.statement.trim() ? u.statement : <span className="muted">Your risk statement shows here.</span>}
          </p>
          <p className="q">Do you agree with this statement?</p>
          <div className="opts">
            <span>Agree</span>
            <span>Disagree</span>
          </div>
          <p className="q">How likely is it within {HORIZON[u.horizon]}?</p>
          <div className="opts">
            {STEP_WORDS.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          <p className="small muted prev-when">
            {u.opens && u.closes
              ? `Answers open ${fmtISO(u.opens)} and close ${fmtISO(u.closes)}.`
              : 'Set when answers open and close.'}
          </p>
        </div>
      </section>
      <section className="pn-card">
        <h2>Who receives it</h2>
        {n ? (
          <>
            <ul className="rcv">
              {(
                [
                  ['both', 3, 'Know the country and the field'],
                  ['country', 2, 'Know the country'],
                  ['field', 1, 'Know the field'],
                ] as const
              ).map(([k, w, l]) => (
                <li key={k}>
                  <Wdots w={w} />
                  <span>{l}</span>
                  <b>{t[k]}</b>
                </li>
              ))}
              <li className="rcv-t">
                <span />
                <span>All matched experts</span>
                <b>{n}</b>
              </li>
            </ul>
            <p className="small muted">
              Matched on the countries and fields ACAPS approved for each expert. Those who know the country and the field
              count most when you read the answers.
            </p>
          </>
        ) : (
          <p className="small muted">Add a country or a field to see who gets it.</p>
        )}
        <div className="row row-t">
          <button type="button" className="btn btn-ink" onClick={(e) => upPublish(e.currentTarget)}>
            {n ? `Publish to ${plural(n, 'expert')}` : 'Publish'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const from = S.up.from;
              S.up = blankUp();
              S.ui.err.upCountry = false;
              if (from) go('/upload', { replace: true });
              commit();
            }}
          >
            Clear form
          </button>
        </div>
      </section>
      {S.published.length > 0 && (
        <section className="pn-card">
          <h2>Published from this page</h2>
          <ol className="pub">
            {S.published.map((p, i) => (
              <li key={i}>
                <b>{p.statement}</b>
                <span className="small muted">
                  {p.countries.join(', ')} · {plural(p.n, 'expert')} · answers close {fmtISO(p.closes)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

export function Upload() {
  useAnalyst();
  const after = useAfterPaint();
  const { from } = useParams();

  // Arriving on /upload/<card>: start the form from that suggested risk
  const [seen, setSeen] = useState<string | null | undefined>(null);
  if (from !== seen) {
    setSeen(from);
    if (from && from !== S.up.from) {
      const c = DATA.cards.find((x) => x.id === from);
      if (c) S.up = { ...blankUp(), statement: c.statement, area: c.area, countries: c.country ? [c.country] : [], from: c.id };
    }
  }

  return (
    <div className="pn scroll">
      <div className="pn-in pn-wide">
        <h1>Upload a risk</h1>
        <p className="sub">Experts approved for its countries or its field get the card when you publish.</p>
        <div className="up-grid">
          <form className="pn-card up-form" id="upForm" noValidate onSubmit={(e) => e.preventDefault()}>
            <UpFormFields after={after} />
          </form>
          <aside className="up-side" id="upSide" aria-label="Preview and who receives it">
            <UpSide after={after} />
          </aside>
        </div>
      </div>
    </div>
  );
}

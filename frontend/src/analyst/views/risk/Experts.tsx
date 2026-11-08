import { Fragment, useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CL, DATA, QUICK, R, byStrength, claimById, claimsOn, hasWritten, keepTitle, plural, rk } from '../../data';
import { riskHref } from '../../nav';
import { S, askReason, commit, decide, freshCls, inkNow, openDialog, useAnalyst } from '../../store';
import { Cited, Wdots, newNums } from '../../ui';
import type { Answer, Claim, Risk } from '../../types';
import { SaveBtn } from './bits';
import { CodeBtn } from '../overview-ui';
import { LEVEL_WORDS, PROB_ORDER, SJ, STEP_WORDS, SUBJ, goTrig, subjName, themeOf } from './helpers';

/* ---------- actions ---------- */
function keepArg(el: HTMLElement, id: string) {
  const sum = id.startsWith('sum:');
  const title = keepTitle(id);
  askReason(el, {
    title: sum ? 'Why keep this summary?' : 'Why keep this grouping?',
    ok: sum ? 'Keep this summary' : 'Keep this grouping',
    quick: QUICK.keep,
    done: (why) => {
      S.kept[id] = { why, when: new Date() };
      inkNow(id);
      decide(`Kept ${sum ? 'summary' : 'grouping'}: ${title}`, why);
    },
  });
}
function unkeep(el: HTMLElement, id: string) {
  const title = keepTitle(id);
  askReason(el, {
    title: 'Why return this to pencil?',
    ok: 'Back to pencil',
    quick: QUICK.back,
    done: (why) => {
      delete S.kept[id];
      decide(`Returned to pencil: ${title}`, why);
    },
  });
}
const toggleArg = (id: string) => {
  S.ui.args[id] = !S.ui.args[id];
  commit();
};
const toggleSubj = (id: string, open: boolean) => {
  SJ()[id] = !open;
  commit();
};
const subjCancel = () => {
  S.ui.renaming = null;
  S.ui.newSubj = null;
  commit();
};
function sendAsk(id: string) {
  const k = 'ask:' + id;
  const q = String(S.drafts[k] || '').trim();
  const a = DATA.answers[id];
  S.ui.err[k] = !q;
  if (!q) return commit();
  (S.follow[id] = S.follow[id] || []).push(q);
  delete S.drafts[k];
  S.ui.ask = null;
  decide(`Asked ${a.by} a follow-up in the ${a.risk} chat`, q);
}
const at = (fn: (el: HTMLElement, id: string) => void, id: string) => (e: MouseEvent<HTMLElement>) => fn(e.currentTarget, id);

/* ---------- pieces ---------- */

/** Expert likelihood counts as bars (ACAPS's own level marked) */
export function BandBars({ r, counts }: { r: Risk; counts: number[] }) {
  const a = PROB_ORDER.indexOf(r.probability);
  const max = Math.max(...counts, 1);
  return (
    <ol className="bands" aria-label="Expert likelihood counts">
      {LEVEL_WORDS.map((l, i) => (
        <li key={l} className={i === a ? 'acaps' : ''}>
          <span className="n">{counts[i]}</span>
          <span className="col" style={{ height: `${Math.round((counts[i] / max) * 64)}px` }} />
          <span className="l">{l}</span>
        </li>
      ))}
    </ol>
  );
}

/** One expert's answer, with replies, follow-ups and "Ask a follow-up" */
function AnswerCard({ a }: { a: Answer }) {
  useAnalyst();
  let text: ReactNode = a.text;
  if (a.words) {
    const i = a.text.toLowerCase().indexOf(a.words.toLowerCase());
    if (i >= 0)
      text = (
        <>
          {a.text.slice(0, i)}
          <mark>{a.text.slice(i, i + a.words.length)}</mark>
          {a.text.slice(i + a.words.length)}
        </>
      );
  }
  const asking = S.ui.ask === a.id;
  const asked = S.follow[a.id] || [];
  const code = DATA.answerExpert[a.id];
  return (
    <article className="ans">
      <div className="ans-top">
        <strong>{a.by}</strong>
        {code && <CodeBtn id={code} />}
        <span className="pill">
          <Wdots w={a.weight} />
          {a.matchLabel}
        </span>
        {a.hidden && <span className="pill">Name hidden from ACAPS</span>}
        <span className="pill">
          {a.basis}
          {a.words && <em>{a.words}</em>}
        </span>
        <span className="pill">Forecast: {a.forecast ? a.forecast : 'not given'}</span>
        <span className="pill">{'♥'} {a.likes || 0}</span>
        <span className="lab" style={{ marginLeft: 'auto' }}>
          Sample
        </span>
      </div>
      <p className="ans-text">{text}</p>
      {a.attachment && <p className="small muted">Attached: {a.attachment}</p>}
      {a.replies.map((x, i) => (
        <div key={i} className={`reply${x.pushback ? ' push' : ''}`}>
          <b>
            {x.by}
            {x.pushback && (
              <>
                {' '}
                <span className="push-tag">pushes back</span>
              </>
            )}
          </b>
          {x.text}
        </div>
      ))}
      {asked.map((q, i) => (
        <div key={i} className="asked">
          You asked: {q}
        </div>
      ))}
      <div className="row row-t">
        <SaveBtn k={'ans:' + a.id} label="Save" />
        <button
          type="button"
          className="btn"
          aria-expanded={asking}
          onClick={() => {
            S.ui.ask = S.ui.ask === a.id ? null : a.id;
            commit();
          }}
        >
          {asking ? 'Cancel' : 'Ask a follow-up'}
        </button>
      </div>
      {asking && <AskBox a={a} />}
    </article>
  );
}

function AskBox({ a }: { a: Answer }) {
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => box.current?.focus({ preventScroll: true }), []);
  const k = 'ask:' + a.id;
  return (
    <div className="row-t">
      <label className="lab" htmlFor={`ask-${a.id}`}>
        Your question to {a.by}, posted in the chat
      </label>
      <textarea
        id={`ask-${a.id}`}
        ref={box}
        rows={2}
        value={String(S.drafts[k] ?? '')}
        onChange={(e) => {
          S.drafts[k] = e.target.value;
          commit();
        }}
      />
      {S.ui.err[k] && <p className="err">Write your question first.</p>}
      <div className="row-t">
        <button type="button" className="btn btn-ink" onClick={() => sendAsk(a.id)}>
          Send follow-up
        </button>
      </div>
    </div>
  );
}

/** An argument card (claims grouped by AI), filtered by `test` */
export function ArgCard({ g, test }: { g: Claim; test: (a: Answer) => boolean }) {
  useAnalyst();
  const all = g.answers.map((id) => DATA.answers[id]);
  const vis = all.filter(test);
  if (!vis.length) return null;
  const r = R[g.risk];
  const kept = S.kept[g.id];
  const open = S.ui.args[g.id];
  const n = newNums();
  const ordered = [...vis].sort((a, b) => b.weight - a.weight);
  const trig = g.trigger ? r.triggers.find((x) => x.id === g.trigger) : undefined;
  const shared = g.shared ? CL.filter((x) => x.shared === g.shared && x.risk !== g.risk) : [];
  const moved = (g.moved || []).map((id) => DATA.answers[id]);
  return (
    <article className={`arg ${kept ? 'ink' : 'pencil'}${freshCls(g.id)}`}>
      <div className="arg-top">
        <span className={`stag${g.side === 'challenge' ? ' ch' : ''}`}>
          {g.side === 'challenge' ? 'Challenges ACAPS' : 'Adds to the picture'}
        </span>
        <span className="small muted">
          {g.answers.length === 1 ? '1 expert makes' : g.answers.length + ' experts make'} this point
          {kept && (
            <>
              {' · Accepted '}
              <button type="button" className="x" onClick={at(unkeep, g.id)}>
                Undo
              </button>
            </>
          )}
        </span>
      </div>
      <h4 className="qhead">{`“${g.quote}”`}</h4>
      {g.against && (
        <div className="vs">
          <span className="lab">Against this ACAPS line</span>
          {DATA.cites[g.against].quote} <Cited text={`{${g.against}}`} nums={n} />
        </div>
      )}
      <ul className="who-l" aria-label="Who makes this claim">
        {ordered.map((a) => (
          <li key={a.id}>
            <Wdots w={a.weight} />
            <b>{a.by}</b>
            <span>
              {a.matchLabel}
              {a.rank ? `, ${rk(String(a.rank))}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {trig && (
        <p className="small row-t">
          Speaks to{' '}
          <button type="button" className="link" style={{ fontSize: 14.5 }} onClick={() => goTrig(trig.id)}>
            {trig.id}
          </button>{' '}
          {trig.title}, {trig.rate == null ? 'rate not given' : trig.rate + '% complete'}
        </p>
      )}
      {moved.length > 0 && <p className="moved">{moved.map((a) => a.by).join(', ')} changed their mind after this argument</p>}
      {shared.length > 0 && (
        <p className="moved">
          Same point raised on{' '}
          {shared.map((x, i) => (
            <Fragment key={x.id}>
              {i > 0 && ', '}
              <Link to={riskHref(x.risk, 'experts')}>
                {x.risk}, {R[x.risk].country}
              </Link>
            </Fragment>
          ))}
        </p>
      )}
      {kept && <p className="sec-why">Why: {kept.why}</p>}
      <div className="row row-t">
        <button type="button" className="btn" aria-expanded={!!open} onClick={() => toggleArg(g.id)}>
          {open ? 'Hide answers' : vis.length === 1 ? 'Show answer' : 'Show answers'}
        </button>
        {!kept && (
          <button type="button" className="btn" onClick={at(keepArg, g.id)}>
            Accept
          </button>
        )}
      </div>
      {open && ordered.map((a) => <AnswerCard key={a.id} a={a} />)}
    </article>
  );
}

/** The AI summary of the answers on a risk */
function SummaryCard({ r }: { r: Risk }) {
  const id = 'sum:' + r.id;
  const kept = S.kept[id];
  const c = newNums();
  const lines = DATA.summaries[r.id] || [];
  const n = Object.values(DATA.answers).filter((a) => a.risk === r.id).length;
  return (
    <article className={`sum ${kept ? 'ink' : 'pencil'}${freshCls(id)}`}>
      <div className="arg-top">
        <span className="small muted">
          Written by AI from the answers. Each number opens the quote it comes from
          {kept && (
            <>
              {' '}
              <button type="button" className="x" onClick={at(unkeep, id)}>
                Undo
              </button>
            </>
          )}
        </span>
      </div>
      <h2>Summary of {plural(n, 'answer')}</h2>
      <ol>
        {lines.map((l, i) => (
          <li key={i}>
            <Cited text={l} nums={c} />
          </li>
        ))}
      </ol>
      {kept ? (
        <p className="sec-why">Why: {kept.why}</p>
      ) : (
        <div className="row row-t">
          <button type="button" className="btn" onClick={at(keepArg, id)}>
            Accept summary
          </button>
        </div>
      )}
    </article>
  );
}

/** "Do experts agree?": share agreeing with ACAPS and the likelihood bands */
function AgreeBlock({ r }: { r: Risk }) {
  const g = r.group;
  const total = r.bands.reduce((x, y) => x + y, 0);
  const top = total ? r.bands.indexOf(Math.max(...r.bands)) : -1;
  const ac = PROB_ORDER.indexOf(r.probability);
  const rel = top < 0 || ac < 0 ? '' : top === ac ? ', the same as ACAPS' : top > ac ? ', higher than ACAPS' : ', lower than ACAPS';
  const mx = Math.max(1, ...r.bands);
  const wa = g && g.weighted_agree != null ? g : null;
  return (
    <section className="xa">
      <h2>Do experts agree?</h2>
      <div className="xa-tiles">
        <div className="xa-tile">
          <b>{wa ? wa.weighted_agree + '%' : '–'}</b>
          <span>agree with ACAPS</span>
          {wa && (
            <small>
              {wa.agree} agree · {wa.disagree} disagree
            </small>
          )}
        </div>
        {total > 0 && (
          <div className="xa-tile">
            <b className="w">{STEP_WORDS[top]}</b>
            <span>what most experts say</span>
            <small>{rel ? rel.slice(2).replace(/^./, (c) => c.toUpperCase()) : ''}</small>
          </div>
        )}
      </div>
      {total > 0 && (
        <p className="xa-q">
          Question to experts: <b>“How likely is it to happen within six months?”</b>
        </p>
      )}
      {total > 0 && (
        <div className="xa-bands" role="img" aria-label={r.bands.map((n, i) => `${STEP_WORDS[i]} ${n}`).join(', ')}>
          {r.bands.map((n, i) => (
            <div key={i} className={i === ac ? 'acaps' : ''} data-tip={`${STEP_WORDS[i]}: ${n}${i === ac ? ' (ACAPS)' : ''}`}>
              <span style={{ height: `${Math.round((n / mx) * 100)}%` }} />
              <em>{n}</em>
              <small>{STEP_WORDS[i]}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** A claim in a subject: who says it, and (opened) the answers, subject and Accept */
function ClaimRow({ g }: { g: Claim }) {
  const r = R[g.risk];
  const open = S.ui.args[g.id];
  const kept = S.kept[g.id];
  const n = newNums();
  const all = g.answers.map((id) => DATA.answers[id]).sort((x, y) => y.weight - x.weight);
  const lead = all[0];
  const more = all.length - 1;
  const trig = g.trigger ? r.triggers.find((x) => x.id === g.trigger) : undefined;
  const shared = g.shared ? CL.filter((x) => x.shared === g.shared && x.risk !== g.risk) : [];
  const likes = all.reduce((s, a) => s + (a.likes || 0), 0);
  const reps = all.flatMap((a) => a.replies);
  const push = reps.filter((x) => x.pushback);
  const talk =
    likes || reps.length ? (
      <>
        <span className="xr-talk">
          {'♥'} {plural(likes, 'like')}
          {reps.length ? ` · ${plural(reps.length, 'reply', 'replies')}` : ''}
          {push.length ? `, ${push.length} ${push.length === 1 ? 'pushes' : 'push'} back:` : ''}
        </span>
        {push.map((x, i) => (
          <span key={i} className="xr-push">
            {`“${x.text}”`} <span className="xr-who">{x.by}</span>
          </span>
        ))}
      </>
    ) : null;
  const subjects = [...new Set(claimsOn(g.risk).map(themeOf))];

  return (
    <li className={`xr${open ? ' open' : ''}${kept ? ' kept' : ''}`}>
      <button type="button" className="xr-head" aria-expanded={!!open} onClick={() => toggleArg(g.id)}>
        <span className={`xr-tag${lead.stance === 'disagree' ? ' ch' : ''}`}>{lead.stance === 'disagree' ? 'Disagrees' : 'Agrees'}</span>
        <span>
          {more ? (
            <>
              <span className="xr-sum">
                {all.length} experts say: {g.title}
              </span>{' '}
              {all.map((a) => (
                <span key={a.id} className="xr-q2">
                  {`“${g.quotes[a.id]}”`}
                  <span className="xr-who">{a.matchLabel}</span>
                </span>
              ))}
              {kept && <span className="xr-who">Accepted</span>}
              {talk}
            </>
          ) : (
            <>
              <span className="xr-q">{`“${g.quote}”`}</span>{' '}
              <span className="xr-who">
                {lead.matchLabel}
                {kept ? ' · accepted' : ''}
              </span>
              {talk}
            </>
          )}
        </span>
        <span className="xr-chev" aria-hidden="true">
          {open ? '▾' : '›'}
        </span>
      </button>
      {open && (
        <div className="xr-body">
          {g.against && (
            <div className="vs">
              <span className="lab">The ACAPS sentence it disputes</span>
              {DATA.cites[g.against].quote} <Cited text={`{${g.against}}`} nums={n} />
            </div>
          )}
          {trig && <p className="small row-t">About the trigger: {trig.title}</p>}
          {shared.length > 0 && (
            <p className="small row-t">
              Same point raised on{' '}
              {shared.map((x, i) => (
                <Fragment key={x.id}>
                  {i > 0 && ', '}
                  <Link to={riskHref(x.risk)}>
                    {x.risk}, {R[x.risk].country}
                  </Link>
                </Fragment>
              ))}
            </p>
          )}
          {all.map((a) => (
            <AnswerCard key={a.id} a={a} />
          ))}
          <div className="xr-move row row-t">
            <label className="small" htmlFor={`mv-${g.id}`}>
              Subject
            </label>
            <select
              id={`mv-${g.id}`}
              value={themeOf(g)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__new') S.ui.newSubj = g.id;
                else {
                  SUBJ().move[g.id] = v;
                  SJ()[`${claimById(g.id).risk}:${v}`] = true;
                  S.ui.newSubj = null;
                }
                commit();
              }}
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {subjName(g.risk, s)}
                </option>
              ))}
              <option value="__new">New subject{'…'}</option>
            </select>
            {S.ui.newSubj === g.id && (
              <>
                <input
                  value={String(S.drafts['newsubj:' + g.id] ?? '')}
                  onChange={(e) => {
                    S.drafts['newsubj:' + g.id] = e.target.value;
                    commit();
                  }}
                  placeholder="Name the new subject"
                  aria-label="Name the new subject"
                />
                <button
                  type="button"
                  className="btn btn-ink"
                  onClick={() => {
                    const v = String(S.drafts['newsubj:' + g.id] || '').trim();
                    if (!v) return;
                    SUBJ().move[g.id] = v;
                    SJ()[`${g.risk}:${v}`] = true;
                    S.ui.newSubj = null;
                    delete S.drafts['newsubj:' + g.id];
                    commit();
                  }}
                >
                  Create
                </button>
                <button type="button" className="btn btn-ghost" onClick={subjCancel}>
                  Cancel
                </button>
              </>
            )}
          </div>
          <div className="row row-t">
            {kept ? (
              <>
                <span className="small muted">Accepted. Why: {kept.why}</span>
                <button type="button" className="x" onClick={at(unkeep, g.id)}>
                  Undo
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-ink" onClick={at(keepArg, g.id)}>
                Accept
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** Rename a subject: the box gets focus with its text selected */
function SubjRename({ k, i, current }: { k: string; i: number; current: string }) {
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    box.current?.focus();
    box.current?.select();
  }, []);
  return (
    <div className="xs-rename">
      <label className="sr" htmlFor={`ren-${i}`}>
        New name for this subject
      </label>
      <input
        id={`ren-${i}`}
        ref={box}
        value={String(S.drafts['ren:' + k] ?? current)}
        onChange={(e) => {
          S.drafts['ren:' + k] = e.target.value;
          commit();
        }}
      />
      <button
        type="button"
        className="btn btn-ink"
        onClick={() => {
          const v = String(S.drafts['ren:' + k] ?? '').trim();
          if (v) SUBJ().name[k] = v;
          S.ui.renaming = null;
          delete S.drafts['ren:' + k];
          commit();
        }}
      >
        Save
      </button>
      <button type="button" className="btn btn-ghost" onClick={subjCancel}>
        Cancel
      </button>
    </div>
  );
}

/** "What experts talk about": claims grouped into subjects */
function SubjectsBlock({ r }: { r: Risk }) {
  const gs = claimsOn(r.id);
  const subs = [...new Set(gs.map(themeOf))]
    .map((th) => ({ th, list: gs.filter((g) => themeOf(g) === th).sort(byStrength) }))
    .sort((x, y) => byStrength(x.list[0], y.list[0]));
  return (
    <section className="xs">
      <h2>
        What experts talk about <small>grouped by AI</small>
      </h2>
      <ul className="xs-list">
        {subs.map(({ th, list }, i) => {
          const k = `${r.id}:${th}`;
          const open = SJ()[k] ?? i === 0;
          const ch = list.filter((g) => g.side === 'challenge').length;
          return (
            <li key={th} className={`xs-item${open ? ' open' : ''}`}>
              <div className="xs-top">
                {S.ui.renaming === k ? (
                  <SubjRename k={k} i={i} current={subjName(r.id, th)} />
                ) : (
                  <>
                    <button type="button" className="xs-head" aria-expanded={open} onClick={() => toggleSubj(k, open)}>
                      <span className="xs-chev" aria-hidden="true">
                        {open ? '▾' : '▸'}
                      </span>
                      <b>{subjName(r.id, th)}</b>
                      {SUBJ().name[k] && <span className="xs-you">renamed by you</span>}{' '}
                      <span className="muted">
                        {plural(list.length, 'claim')}
                        {ch ? ` · ${ch} ${ch === 1 ? 'disagrees' : 'disagree'} with ACAPS` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="x xs-ren"
                      onClick={() => {
                        S.ui.renaming = k;
                        commit();
                      }}
                    >
                      Rename
                    </button>
                  </>
                )}
              </div>
              {open && (
                <ul>
                  {list.map((g) => (
                    <ClaimRow key={g.id} g={g} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** ACAPS triggers no expert wrote about */
function GapsBlock({ r }: { r: Risk }) {
  const gs = claimsOn(r.id);
  const silent = r.triggers.filter((x) => !gs.some((g) => g.trigger === x.id));
  if (!silent.length) return null;
  return (
    <section className="xg">
      <h2>Nobody mentioned</h2>
      <ul>
        {silent.map((x) => (
          <li key={x.id}>{x.title}</li>
        ))}
      </ul>
      <p className="small muted row-t">ACAPS triggers no expert wrote about.</p>
    </section>
  );
}

/** The AI summary and all answers, each behind a button, and "Prepare report notes" */
function AllBlock({ r }: { r: Risk }) {
  const ans = Object.values(DATA.answers)
    .filter((a) => a.risk === r.id)
    .sort((x, y) => y.weight - x.weight);
  const showAll = !!SJ()['all:' + r.id];
  const showSum = !!SJ()['sum:' + r.id];
  return (
    <>
      <div className="xb">
        <button type="button" className="btn" onClick={() => toggleSubj('sum:' + r.id, showSum)}>
          {showSum ? 'Hide' : 'Read'} the AI summary
        </button>
        <button type="button" className="btn" onClick={() => toggleSubj('all:' + r.id, showAll)}>
          {showAll ? 'Hide' : 'Read'} all {plural(ans.length, 'answer')}
        </button>
        <button type="button" className="btn btn-ink" style={{ marginLeft: 'auto' }} onClick={() => openDialog('report')}>
          Prepare report notes
        </button>
      </div>
      {showSum && <SummaryCard r={r} />}
      {showAll && (
        <div className="xall">
          {ans.map((a) => (
            <AnswerCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </>
  );
}

/** Experts tab */
export function Experts({ r }: { r: Risk }) {
  useAnalyst();
  if (!hasWritten(r.id)) {
    return (
      <div className="xw">
        <AgreeBlock r={r} />
        <p className="empty">
          No written answers on this risk in this demo, only votes and forecasts. Written answers exist on{' '}
          {DATA.written.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && ', '}
              <Link to={riskHref(id)}>{id}</Link>
            </Fragment>
          ))}
          .
        </p>
      </div>
    );
  }
  return (
    <div className="xw xw2">
      <div className="xw-main">
        <SubjectsBlock r={r} />
        <AllBlock r={r} />
      </div>
      <aside className="xw-side">
        <AgreeBlock r={r} />
        <GapsBlock r={r} />
      </aside>
    </div>
  );
}

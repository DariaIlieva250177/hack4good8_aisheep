import { useEffect, useRef, useState } from 'react';
import { AI_RISK, R, WATCH_KEY, fmtWhen } from '../../data';
import { S, commit, decide, useAnalyst } from '../../store';
import { Icon, TagI } from '../../ui';
import type { Risk, RiskUpdate, Trigger } from '../../types';
import { SaveBtn } from './bits';
import { FLAG, riskEvents, trigState } from './helpers';
import { Replay } from './Replay';

/** Situation tab: the event replay, the triggers (with reviews) and ACAPS's updates */
export function Situation({ r }: { r: Risk }) {
  useAnalyst();
  const ev = riskEvents(r.id).length;
  /** triggers related to the event the replay is on */
  const [related, setRelated] = useState<string[]>([]);
  return (
    <>
      {ev > 0 && <Replay r={r} onRelated={setRelated} />}
      <h2 className="sec-h" style={ev ? undefined : { marginTop: 6 }}>
        Triggers
      </h2>
      {r.triggers.length ? (
        r.triggers.map((t) => <TriggerRow key={t.id} r={r} t={t} related={related.includes(t.id)} />)
      ) : (
        <p className="empty">No triggers listed for this risk.</p>
      )}
      <h2 className="sec-h">ACAPS updates</h2>
      {r.updates.length ? (
        r.updates.map((u, i) => <UpdateRow key={i} r={r} u={u} i={i} />)
      ) : (
        <p className="empty">ACAPS has not published a dated update on this risk.</p>
      )}
    </>
  );
}

function saveReview(k: string) {
  const [rid, tid] = k.split(':');
  const t = R[rid].triggers.find((x) => x.id === tid)!;
  const why = String(S.drafts['why:' + k] || '').trim();
  S.ui.err[k] = !why;
  if (!why) return commit();
  const rate = Number(S.drafts['rate:' + k] ?? (S.trig[k] ? S.trig[k].rate : t.rate) ?? 0);
  S.trig[k] = { rate, was: S.trig[k] ? S.trig[k].was : t.rate, why, when: new Date() };
  S.ui.review = null;
  delete S.drafts['why:' + k];
  delete S.drafts['rate:' + k];
  decide(`Reviewed trigger ${tid}: ${t.rate == null ? 'not given' : t.rate + '%'} to ${rate}%`, why);
}

function TriggerRow({ r, t, related }: { r: Risk; t: Trigger; related: boolean }) {
  const k = WATCH_KEY(r.id, t.id);
  const { rev, rate } = trigState(r, t);
  const open = S.ui.goal[k];
  const reviewing = S.ui.review === k;
  const draft = Number(S.drafts['rate:' + k] ?? rate ?? 0);
  const why = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (reviewing) why.current?.focus({ preventScroll: true });
  }, [reviewing]);

  return (
    <article className={`trig${related ? ' related' : ''}`} id={`trig-${t.id}`} data-trig={t.id}>
      <div>
        <h4>{t.title}</h4>
        <div className="trig-sub">
          <span className="small muted">{t.id}</span>
          {FLAG[t.id] && r.id === AI_RISK && !rev ? (
            <span className="flag">
              {Icon.pencil}Set before the August strikes
            </span>
          ) : null}
          {rev && <TagI />}
          <button
            type="button"
            className="link small"
            aria-expanded={!!open}
            style={{ fontSize: 14 }}
            onClick={() => {
              S.ui.goal[k] = !S.ui.goal[k];
              commit();
            }}
          >
            {open ? 'Hide 100% when' : '100% when'}
          </button>
        </div>
      </div>
      <div className="trig-rate">
        {rate == null ? (
          <span className="na">Completion rate not given</span>
        ) : (
          <>
            <span className={`bar${rev ? ' inked' : ''}`}>
              <i id={`fill-${t.id}`} style={{ width: `${reviewing ? draft : rate}%` }} />
            </span>
            <b id={`num-${t.id}`}>{reviewing ? draft : rate}%</b>
          </>
        )}
      </div>
      <div className="trig-last">
        Last updated
        <br />
        {rev ? fmtWhen(rev.when).split(',')[0] : t.last || 'Unknown'}
      </div>
      <button
        type="button"
        className="btn"
        aria-expanded={reviewing}
        onClick={() => {
          S.ui.review = S.ui.review === k ? null : k;
          S.ui.err[k] = false;
          commit();
        }}
      >
        {reviewing ? 'Cancel' : 'Review'}
      </button>
      {open && (
        <div className="trig-more">
          <span className="lab">100% when</span>
          {t.goal || 'ACAPS gives no 100% condition for this trigger.'}
        </div>
      )}
      {reviewing && (
        <div className="trig-rev">
          <label className="lab" htmlFor={`rg-${t.id}`}>
            Completion rate: <span id={`rv-${t.id}`}>{draft}%</span>
            <input
              type="range"
              id={`rg-${t.id}`}
              min={0}
              max={100}
              step={10}
              value={draft}
              onChange={(e) => {
                S.drafts['rate:' + k] = Number(e.target.value);
                commit();
              }}
            />
          </label>
          <div>
            <label className="lab" htmlFor={`rr-${t.id}`}>
              Reason, required
            </label>
            <textarea
              id={`rr-${t.id}`}
              ref={why}
              rows={2}
              value={String(S.drafts['why:' + k] ?? '')}
              onChange={(e) => {
                S.drafts['why:' + k] = e.target.value;
                commit();
              }}
            />
            {S.ui.err[k] && <p className="err">Add a reason to save this review.</p>}
            <div className="row-t">
              <button type="button" className="btn btn-ink" onClick={() => saveReview(k)}>
                Save review
              </button>
            </div>
          </div>
        </div>
      )}
      {rev && (
        <div className="trig-done">
          <b>
            {rev.was == null ? 'Set' : `Reviewed from ${rev.was}%`} to {rev.rate}%.
          </b>
          <span>Why: {rev.why}</span>
        </div>
      )}
    </article>
  );
}

function UpdateRow({ r, u, i }: { r: Risk; u: RiskUpdate; i: number }) {
  const k = `upd:${r.id}:${i}`;
  return (
    <article className="update">
      <div className="update-top">
        <b>{u.label}</b>
        <SaveBtn k={k} label="Save to notes" />
      </div>
      <p>{u.text}</p>
      <div className="src">
        {u.links.length
          ? u.links.map((l, j) => (
              <a key={j} href={l.url} target="_blank" rel="noopener">
                {l.label}
              </a>
            ))
          : 'No sources listed'}
      </div>
    </article>
  );
}

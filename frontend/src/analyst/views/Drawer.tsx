import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DATA, fmtISO, fmtWhen } from '../data';
import type { SuggestedCard } from '../types';
import { S, commit, decide, freshCls, inkNow, overlay, useAnalyst } from '../store';
import { CloseBtn, Icon } from '../ui';
import { useAfterPaint } from './cx-sections';

/*
 * The drawer: suggested risks waiting for a decision (add as a risk, watch,
 * decline, each with a reason), then the log of every decision made.
 */

const CARD_ACTS: Record<string, string> = { add: 'Add as a risk', watch: 'Development to watch', decline: 'Decline' };
const CARD_DONE: Record<string, string> = { add: 'Added as a risk', watch: 'Watching', decline: 'Declined' };

function Card({ c, after }: { c: SuggestedCard; after: (f: () => void) => void }) {
  const done = S.cards[c.id];
  const k = 'card:' + c.id;
  const mode = S.ui.card && S.ui.card.id === c.id ? S.ui.card.action : null;
  const focusBox = () => document.getElementById(`cw-${c.id}`)?.focus();

  const cardDecide = () => {
    const why = String(S.drafts[k] || '').trim();
    const action = S.ui.card!.action;
    S.ui.err[k] = !why;
    if (!why) {
      after(focusBox);
      commit();
      return;
    }
    S.cards[c.id] = { action, why, when: new Date() };
    S.ui.card = null;
    delete S.drafts[k];
    inkNow(k);
    decide(`${CARD_ACTS[action]}: ${c.statement}`, why, false);
  };

  return (
    <article className={`w-card ${done ? 'ink' : 'plain'}${freshCls(k)}`}>
      <div className="w-top">
        <span>
          {c.area} · Suggested {fmtISO(c.created_at)}
        </span>
        {done ? (
          <span className={`tag ${done.action === 'decline' ? 'tag-p' : 'tag-i'}`}>{CARD_DONE[done.action]}</span>
        ) : (
          <span className="tag tag-new">New</span>
        )}
      </div>
      <h3>{c.statement}</h3>
      <p className="w-why">{c.why}</p>
      <p className="w-note pencil">
        <span className="tag tag-p">{Icon.pencil}Suggested</span>
        {c.note}
        {c.related && (
          <>
            {' '}
            <Link to={`/risk/${c.related}`}>Open {c.related}</Link>
          </>
        )}
      </p>
      {done ? (
        <p className="sec-why">
          <b>{CARD_ACTS[done.action]}.</b> Why: {done.why}
          {done.published ? (
            ' Published from Upload a risk.'
          ) : done.action === 'add' ? (
            <>
              {' '}
              <Link to={`/upload/${c.id}`}>Upload it as a risk</Link>
            </>
          ) : (
            ''
          )}
        </p>
      ) : mode ? (
        <div className="row-t">
          <label className="lab" htmlFor={`cw-${c.id}`}>
            {CARD_ACTS[mode]}. Reason, required
          </label>
          <textarea
            id={`cw-${c.id}`}
            rows={2}
            value={String(S.drafts[k] ?? '')}
            onChange={(e) => {
              S.drafts[k] = e.target.value;
              commit();
            }}
          />
          {S.ui.err[k] && <p className="err">Add a reason to continue.</p>}
          <div className="row row-t">
            <button className="btn btn-ink" onClick={cardDecide}>
              {CARD_ACTS[mode]}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                S.ui.card = null;
                commit();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="row row-t">
          {Object.entries(CARD_ACTS).map(([a, l]) => (
            <button
              key={a}
              className="btn"
              onClick={() => {
                S.ui.card = { id: c.id, action: a };
                after(focusBox);
                commit();
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function DrawerDialog() {
  useAnalyst();
  const after = useAfterPaint();
  const decided = DATA.cards.filter((c) => S.cards[c.id]).length;
  const scrollTo = overlay.dialog?.scrollTo;

  // "Open Decisions" from the toast: open at the log
  useEffect(() => {
    if (scrollTo !== 'decisions') return;
    const raf = requestAnimationFrame(() => document.getElementById('decisions')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(raf);
  }, [scrollTo]);

  return (
    <>
      <div className="dlg-head">
        <h2>Waiting for you</h2>
        <CloseBtn />
      </div>
      <div className="dlg-body">
        {decided === DATA.cards.length && (
          <p className="muted" style={{ marginBottom: 10 }}>
            All {DATA.cards.length} suggestions have a decision. Your reasons are in the log below.
          </p>
        )}
        {DATA.cards.map((c) => (
          <Card key={c.id} c={c} after={after} />
        ))}
        <h2 className="log-h" id="decisions">
          Decisions
        </h2>
        {S.log.length ? (
          <ol className="log">
            {S.log.map((l, i) => (
              <li key={S.log.length - i}>
                <time>{fmtWhen(l.when)}</time>
                <b>{l.what}</b>
                <p>
                  <span className="muted">Why:</span> {l.why}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            Nothing logged yet. Each confirmation, rejection, trigger review and follow-up lands here with your reason.
          </p>
        )}
      </div>
    </>
  );
}

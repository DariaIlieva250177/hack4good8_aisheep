import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { AI_RISK, DATA, QUICK, calm } from '../../data';
import { riskHref } from '../../nav';
import { S, askReason, commit, decide, freshCls, inkNow, nextId, openDialog, useAnalyst } from '../../store';
import type { Note } from '../../store';
import { Cited, TagI, TagP, newNums } from '../../ui';
import type { Risk } from '../../types';
import { addOwn, dropNote } from './notes';
import type { NoteSrc } from './notes';

/* ---------- AI helper actions ---------- */
function aiAsk(k: string) {
  if (S.ai[k]) {
    document.getElementById('ai-' + k)?.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });
    return;
  }
  S.ai[k] = 'reading';
  S.aiOrder.unshift(k);
  commit();
  setTimeout(() => {
    if (S.ai[k] === 'reading') {
      S.ai[k] = 'shown';
      commit();
    }
  }, 950);
}
function aiAdd(e: MouseEvent<HTMLElement>, k: string) {
  const a = DATA.ai[k];
  askReason(e.currentTarget, {
    title: 'Why add this draft to your notes?',
    ok: 'Add to notes',
    done: (why) => {
      S.ai[k] = 'added';
      S.notes.push({ id: 'n' + nextId(), key: 'ai:' + k, kind: 'ai', risk: AI_RISK, title: a.title, lines: a.lines, why });
      inkNow('ai:' + k);
      decide(`Added AI draft to notes: ${a.title}`, why);
    },
  });
}
function aiDismiss(e: MouseEvent<HTMLElement>, k: string) {
  const a = DATA.ai[k];
  askReason(e.currentTarget, {
    title: 'Why dismiss this draft?',
    ok: 'Dismiss',
    quick: QUICK.dismiss,
    done: (why) => {
      delete S.ai[k];
      S.aiOrder = S.aiOrder.filter((x) => x !== k);
      decide(`Dismissed AI draft: ${a.title}`, why);
    },
  });
}

/** One AI draft: "Reading …" first, then the draft with Add / Dismiss */
function AiCard({ k }: { k: string }) {
  const a = DATA.ai[k];
  const st = S.ai[k];
  if (st === 'reading')
    return (
      <div className="reading-now pencil">
        <i />
        Reading {a.reading}
      </div>
    );
  const c = newNums();
  const done = st === 'added';
  return (
    <article className={`aicard ${done ? 'ink' : 'pencil'}${freshCls('ai:' + k)}`} id={`ai-${k}`}>
      <div className="aicard-top">
        {done ? <TagI /> : <TagP />}
        {done && <span className="small muted">In notes</span>}
      </div>
      <h3>{a.title}</h3>
      <ol>
        {a.lines.map((l, i) => (
          <li key={i}>
            <Cited text={l} nums={c} />
          </li>
        ))}
      </ol>
      {!done && (
        <div className="row row-t">
          <button type="button" className="btn btn-ink" onClick={(e) => aiAdd(e, k)}>
            Add to notes
          </button>
          <button type="button" className="btn btn-ghost" onClick={(e) => aiDismiss(e, k)}>
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}

/** A note in the notebook */
function NoteCard({ n }: { n: Note }) {
  const c = newNums();
  const src = n.src as NoteSrc | undefined;
  return (
    <article className={`note${n.kind === 'ai' ? ' solid' : ''}`}>
      <div className="note-top">
        {n.kind === 'ai' ? <TagI /> : <span className="lab">{n.kind === 'own' ? 'Your note' : n.title}</span>}
        <span className="row">
          <span className="small muted">{n.risk || ''}</span>
          <button type="button" className="x" onClick={() => dropNote(n.id)}>
            Remove
          </button>
        </span>
      </div>
      {n.kind === 'ai' ? (
        <>
          <h4>{n.title}</h4>
          <ol>
            {(n.lines ?? []).map((l, i) => (
              <li key={i} className="serif" style={{ fontSize: 15, marginTop: 3 }}>
                <Cited text={l} nums={c} />
              </li>
            ))}
          </ol>
          <p className="src">Why: {n.why}</p>
        </>
      ) : n.kind === 'own' ? (
        <p>{n.text}</p>
      ) : (
        <>
          <p>{n.text}</p>
          <p className="src">{src?.label}</p>
        </>
      )}
    </article>
  );
}

/** The right-hand notebook on a risk: the AI helper and the notes */
export function Dock({ r }: { r: Risk }) {
  useAnalyst();
  const tab = S.dock;
  const n = S.notes.length;
  const setTab = (t: string) => {
    S.dock = t;
    commit();
  };
  const head = (
    <div className="dock-head">
      <h2>Notebook</h2>
      <div className="seg" role="tablist" aria-label="Notebook views">
        <button type="button" role="tab" aria-selected={tab === 'helper'} onClick={() => setTab('helper')}>
          AI helper
        </button>
        <button type="button" role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>
          Notes{n ? ` ${n}` : ''}
        </button>
      </div>
    </div>
  );

  if (tab === 'notes') {
    return (
      <>
        {head}
        <div className="dock-body">
          {S.notes.length ? (
            S.notes.map((x) => <NoteCard key={x.id} n={x} />)
          ) : (
            <p className="muted" style={{ marginBottom: 10 }}>
              Save a quote, an update or an AI draft and it lands here.
            </p>
          )}
          <label className="lab" htmlFor="ownNote" style={{ display: 'block', margin: '10px 0 3px' }}>
            Your own note
          </label>
          <textarea
            id="ownNote"
            rows={3}
            value={String(S.drafts.own ?? '')}
            onChange={(e) => {
              S.drafts.own = e.target.value;
              commit();
            }}
          />
          {S.ui.err.own && <p className="err">Write something first.</p>}
          <div className="row-t">
            <button type="button" className="btn" onClick={() => addOwn(r.id)}>
              Add note
            </button>
          </div>
        </div>
        <div className="dock-foot">
          <button type="button" className="btn btn-ink btn-wide" onClick={() => openDialog('report')}>
            Prepare report notes
          </button>
        </div>
      </>
    );
  }

  if (r.id !== AI_RISK)
    return (
      <>
        {head}
        <div className="dock-body">
          <p className="muted">The AI helper is set up for {AI_RISK} only in this demo.</p>
          <p className="row-t">
            <Link to={riskHref(AI_RISK)}>Open {AI_RISK}</Link>
          </p>
        </div>
      </>
    );

  return (
    <>
      {head}
      <div className="dock-body">
        <div className="ai-chips">
          {Object.keys(DATA.ai).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={!!S.ai[k]} onClick={() => aiAsk(k)}>
              {DATA.ai[k].chip}
            </button>
          ))}
        </div>
        {S.aiOrder.map((k) => (
          <AiCard key={k} k={k} />
        ))}
      </div>
    </>
  );
}

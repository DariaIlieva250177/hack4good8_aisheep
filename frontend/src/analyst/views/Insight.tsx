import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { DATA, NEED, QUICK, R, WATCH_KEY, calm, fmtWhen, markers, strip } from '../data';
import { S, askReason, commit, decide, freshCls, inkNow, openDialog, useAnalyst } from '../store';
import { Cited, Icon, TagI, TagP, citePop, newNums } from '../ui';
import type { CiteNums } from '../ui';
import { CONFIRMABLE, I, SECTIONS, insightDone, isInk, needDone, sectionText, useAfterPaint } from './cx-sections';
import type { GeoValue, Section, SectionState } from './cx-sections';

/*
 * Insight: the joined analysis of the linked risks, section by section. Each
 * section is pencil (suggested) until a person confirms it into ink.
 */

/** A text box that keeps what is typed in S.drafts[k] */
function Draft({ k, id, rows, input }: { k: string; id: string; rows?: number; input?: boolean }) {
  const props = {
    id,
    value: String(S.drafts[k] ?? ''),
    onChange: (e: { target: { value: string } }) => {
      S.drafts[k] = e.target.value;
      commit();
    },
  };
  return input ? <input type="text" {...props} /> : <textarea rows={rows} {...props} />;
}

function SectionBody({ s, st, nums }: { s: Section; st?: SectionState; nums: CiteNums }) {
  const ink = st?.state === 'ink';
  const editing = S.ui.edit === s.k;
  const noteP = st?.note ? <p>{st.note}</p> : null;

  if (s.k === 'when') {
    if (ink) return <p>{String(st!.value)}</p>;
    return (
      <label className="field">
        <span className="lab">The data has no date. A person sets this.</span>
        <Draft k="fill:when" id="f-when" input />
      </label>
    );
  }
  if (s.k === 'geo') {
    if (ink) {
      const v = st!.value as GeoValue;
      return (
        <>
          {v.geo && (
            <p>
              <b>Geopolitics.</b> {v.geo}
            </p>
          )}
          {v.season && (
            <p>
              <b>Season.</b> {v.season}
            </p>
          )}
        </>
      );
    }
    return (
      <>
        <label className="field">
          <span className="lab">Geopolitics</span>
          <Draft k="fill:geo" id="f-geo" rows={2} />
        </label>
        <label className="field">
          <span className="lab">Season</span>
          <Draft k="fill:season" id="f-season" rows={2} />
        </label>
      </>
    );
  }

  const editor = editing ? (
    <>
      <label className="field">
        <span className="lab">{s.list ? 'Add your wording' : 'Your wording. The citations stay attached.'}</span>
        <Draft k={'edit:' + s.k} id={'f-' + s.k} rows={s.list ? 2 : 4} />
      </label>
      <div className="row row-t">
        <button className="btn btn-ink" onClick={() => secSave(s)}>
          Save wording
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            S.ui.edit = null;
            commit();
          }}
        >
          Cancel
        </button>
      </div>
    </>
  ) : null;

  if (s.k === 'actors')
    return (
      <>
        <div className="actors">
          {I.actors.map((a) => (
            <button key={a.name} className="chip" onClick={(e) => citePop(e.currentTarget, a.cite)}>
              {a.name}
            </button>
          ))}
        </div>
        {noteP}
        {editor}
      </>
    );
  if (s.k === 'against')
    return (
      <>
        {I.against.map((k) => {
          const q = DATA.cites[k];
          return (
            <div key={k} className="quote">
              <div>
                {q.quote} <Cited text={`{${k}}`} nums={nums} />
              </div>
              <div className="src">
                {q.label}, {q.risk}
              </div>
            </div>
          );
        })}
        {noteP}
        {editor}
      </>
    );
  if (s.k === 'watch')
    return (
      <>
        <div>
          {I.watch.map(([rid, tid]) => {
            const t = R[rid].triggers.find((x) => x.id === tid)!;
            const v = S.trig[WATCH_KEY(rid, tid)];
            const rate = v ? v.rate : t.rate;
            return (
              <div key={rid + tid} className="w-row">
                <Link to={`/risk/${rid}`}>{rid}</Link>
                <span>
                  {t.title}
                  <br />
                  <span className="small muted">
                    {tid}, last updated {t.last}
                  </span>
                </span>
                <span className={`bar${v ? ' inked' : ''}`}>
                  <i style={{ width: `${rate ?? 0}%` }} />
                </span>
                <b>{rate == null ? 'n/a' : rate + '%'}</b>
              </div>
            );
          })}
        </div>
        {noteP}
        {editor}
      </>
    );
  if (s.never)
    return (
      <>
        {I.gaps.map((g, i) => (
          <p key={i}>{g}</p>
        ))}
      </>
    );
  if (editing) return editor;
  return (
    <>
      {sectionText(s, st)
        .split('\n')
        .map((p, i) => (
          <p key={i}>
            <Cited text={p} nums={nums} />
          </p>
        ))}
    </>
  );
}

type Focus = (f: () => void) => void;

function secSave(s: Section) {
  const v = String(S.drafts['edit:' + s.k] || '').trim();
  const st = (S.ins[s.k] = S.ins[s.k] || { state: 'pencil' });
  if (s.list) st.note = v;
  else if (v)
    st.text =
      v +
      markers(s.base!())
        .filter((k, i, a) => a.indexOf(k) === i)
        .map((k) => `{${k}}`)
        .join('');
  st.edited = true;
  S.ui.edit = null;
  commit();
}

function SectionView({ s, nums, after }: { s: Section; nums: CiteNums; after: Focus }) {
  const st = S.ins[s.k];
  const ink = st?.state === 'ink';

  const secEdit = () => {
    S.drafts['edit:' + s.k] = s.list ? st?.note || '' : strip(sectionText(s, st));
    S.ui.edit = s.k;
    after(() => document.getElementById('f-' + s.k)?.focus());
    commit();
  };

  const secConfirm = (anchor: HTMLElement) => {
    let value: string | GeoValue | null = null;
    if (s.k === 'when') {
      value = String(S.drafts['fill:when'] || '').trim();
      if (!value) {
        S.ui.err['sec:when'] = true;
        commit();
        return;
      }
    }
    if (s.k === 'geo') {
      value = { geo: String(S.drafts['fill:geo'] || '').trim(), season: String(S.drafts['fill:season'] || '').trim() };
      if (!value.geo && !value.season) {
        S.ui.err['sec:geo'] = true;
        commit();
        return;
      }
    }
    S.ui.err['sec:' + s.k] = false;
    askReason(anchor, {
      title: `Why confirm ${s.h}?`,
      done: (why) => {
        S.ins[s.k] = { ...(S.ins[s.k] || {}), state: 'ink', why, when: new Date(), value };
        inkNow('sec:' + s.k);
        decide(`Confirmed insight section: ${s.h}`, why);
      },
    });
  };

  const secBack = (anchor: HTMLElement) =>
    askReason(anchor, {
      title: `Why return ${s.h} to pencil?`,
      ok: 'Back to pencil',
      quick: QUICK.back,
      done: (why) => {
        S.ins[s.k].state = 'pencil';
        decide(`Returned insight section to pencil: ${s.h}`, why);
      },
    });

  const acts = s.never ? (
    <span className="small muted">Stays in pencil, never in the notes</span>
  ) : ink ? (
    <button className="x" onClick={(e) => secBack(e.currentTarget)}>
      Undo
    </button>
  ) : S.ui.edit === s.k ? null : (
    <>
      <button className="btn btn-ink" onClick={(e) => secConfirm(e.currentTarget)}>
        Confirm
      </button>
      {!s.fill && (
        <button className="btn" onClick={secEdit}>
          Edit
        </button>
      )}
    </>
  );

  return (
    <section
      className={`sec ${ink ? 'ink' : 'pencil'}${freshCls('sec:' + s.k)}${s.k === 'judgement' ? ' sec-judge' : ''}`}
      id={`sec-${s.k}`}
    >
      <div className="sec-top">
        <h2>{s.h}</h2>
        {ink ? (
          <TagI />
        ) : s.fill ? (
          <span className="tag tag-p">{Icon.pencil}Empty until you fill it</span>
        ) : (
          <TagP />
        )}
        {st?.edited && !ink && <span className="small muted">Edited by you</span>}
        <div className="sec-acts">{acts}</div>
      </div>
      <div className="sec-b">
        <SectionBody s={s} st={st} nums={nums} />
      </div>
      {ink && (
        <p className="sec-why">
          Confirmed {fmtWhen(st.when!)}. Why: {st.why}
        </p>
      )}
      {S.ui.err['sec:' + s.k] && (
        <p className="err">{s.k === 'geo' ? 'Fill in at least one of these first.' : 'Add a date first.'}</p>
      )}
    </section>
  );
}

export function Insight() {
  useAnalyst();
  const after = useAfterPaint();

  if (needDone() < NEED.length) {
    return (
      <div className="gate">
        <h1>Confirm the links first</h1>
        <p>
          This insight joins {I.risks.map((id) => DATA.connect[id].name).join(', ')}. It needs the {NEED.length} links
          between them confirmed by a person. {needDone()} of {NEED.length} so far.
        </p>
        <p className="row-t">
          <Link className="btn btn-ink" to="/connect">
            Go to Connect
          </Link>
        </p>
      </div>
    );
  }

  const done = insightDone();
  const total = CONFIRMABLE.length;
  const nums = newNums();
  const jumpSec = (e: MouseEvent, k: string) => {
    e.preventDefault();
    document.getElementById('sec-' + k)?.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
  };

  return (
    <div className="docw">
      <aside className="rail-d" aria-label="Insight progress">
        <h2>
          {done} of {total} confirmed
        </h2>
        <div className="prog-t" aria-hidden="true">
          {CONFIRMABLE.map((s) => (
            <i key={s.k} className={isInk(s.k) ? 'on' : ''} />
          ))}
        </div>
        <nav className="toc" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.k} href="#" className={isInk(s.k) ? 'on' : ''} onClick={(e) => jumpSec(e, s.k)}>
              {s.h}
            </a>
          ))}
        </nav>
        <button className="btn btn-ink btn-wide" onClick={() => openDialog('report')}>
          Prepare report notes
        </button>
        <Link className="btn btn-ghost btn-wide" to="/connect" style={{ marginTop: 4 }}>
          Back to Connect
        </Link>
      </aside>
      <article className="doc">
        <h1>Insight</h1>
        <div className="doc-risks">
          {I.risks.map((id) => (
            <Link key={id} to={`/risk/${id}`}>
              <b>{id}</b>
              {DATA.connect[id]?.name || R[id].country}
            </Link>
          ))}
        </div>
        {SECTIONS.map((s) => (
          <SectionView key={s.k} s={s} nums={nums} after={after} />
        ))}
      </article>
    </div>
  );
}

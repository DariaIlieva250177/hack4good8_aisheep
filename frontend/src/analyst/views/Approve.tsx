import { DATA, PRIV, fmtISO, fmtWhen, plural } from '../data';
import { S, commit, decide, useAnalyst } from '../store';
import type { Approval } from '../types';
import { APNOTE } from './overview-helpers';

/** Everything one application asks for: "country:Chad", "field:Health"… */
const apKeys = (x: Approval) => [...x.countries.map((c) => 'country:' + c.name), ...x.fields.map((f) => 'field:' + f.name)];

const apState = (id: string) => (S.ap[id] = S.ap[id] || { items: {} });

function ApItem({ x, kind, name }: { x: Approval; kind: string; name: string }) {
  const st = apState(x.id);
  const key = kind + ':' + name;
  const v = st.items[key];
  const set = (to: 'approve' | 'deny') => {
    st.items[key] = st.items[key] === to ? undefined : to;
    commit();
  };
  return (
    <li>
      <span>{name}</span>
      {st.sent ? (
        <b>{v === 'deny' ? 'Denied' : 'Approved'}</b>
      ) : (
        <span className="ap-btns">
          <button type="button" className="chip" aria-pressed={v === 'approve'} onClick={() => set('approve')}>
            Approve
          </button>
          <button type="button" className="chip" aria-pressed={v === 'deny'} onClick={() => set('deny')}>
            Deny
          </button>
        </span>
      )}
    </li>
  );
}

function ApCard({ x }: { x: Approval }) {
  const st = apState(x.id);
  const keys = apKeys(x);
  const decided = keys.filter((k) => st.items[k]).length;
  return (
    <article className={`ap${st.sent ? ' done' : ''}`}>
      <header>
        <h2>{x.name || x.id}</h2>
        <span className="muted">
          Applied {fmtISO(x.registered)} · chose: {PRIV(x.privacy)}
        </span>
        {st.sent && <span className="tag tag-i">Decided</span>}
      </header>
      {!st.sent && APNOTE[x.privacy] && <p className="ap-note">{APNOTE[x.privacy]}</p>}
      <div className="ap-grid">
        <div>
          <h3>About them</h3>
          {x.org && <p>{x.org}</p>}
          {x.education && <p>{x.education}</p>}
          {x.comment && <p className="serif ap-quote">{`“${x.comment}”`}</p>}
          <h3>What they uploaded</h3>
          <ul className="ap-docs">
            {x.docs.length ? (
              x.docs.map((d, i) => (
                <li key={i}>
                  <span className="ap-file">{d.file}</span>{' '}
                  <span className="muted">
                    {d.type}
                    {d.supports ? `, for ${d.supports}` : ''}
                  </span>
                </li>
              ))
            ) : (
              <li className="muted">Nothing uploaded</li>
            )}
          </ul>
        </div>
        <div>
          <h3>Countries they asked for</h3>
          <ul className="ap-items">
            {x.countries.length ? (
              x.countries.map((c) => <ApItem key={c.name} x={x} kind="country" name={c.name} />)
            ) : (
              <li className="muted">None</li>
            )}
          </ul>
          <h3>Fields they asked for</h3>
          <ul className="ap-items">
            {x.fields.length ? (
              x.fields.map((f) => <ApItem key={f.name} x={x} kind="field" name={f.name} />)
            ) : (
              <li className="muted">None</li>
            )}
          </ul>
        </div>
      </div>
      {st.sent ? (
        <p className="small muted row-t">Decision sent {fmtWhen(st.sent)}.</p>
      ) : (
        <div className="row row-t">
          <button
            type="button"
            className="btn"
            onClick={() => {
              keys.forEach((k) => {
                st.items[k] = 'approve';
              });
              commit();
            }}
          >
            Approve all
          </button>
          <button
            type="button"
            className="btn btn-ink"
            disabled={decided < keys.length}
            onClick={() => {
              st.sent = new Date();
              decide(
                `Sent a decision to ${x.name || x.id}`,
                keys.map((k) => `${k.split(':')[1]}: ${st.items[k] === 'deny' ? 'denied' : 'approved'}`).join(', '),
              );
            }}
          >
            Send decision
          </button>
          <span className="small muted">
            {decided} of {keys.length} decided
          </span>
        </div>
      )}
    </article>
  );
}

/** Experts to approve: the queue on the left, one application on the right. */
export function Approve() {
  const st = useAnalyst();
  const left = DATA.approvals.filter((x) => !st.ap[x.id]?.sent);
  const all = [...left, ...DATA.approvals.filter((x) => !left.includes(x))];
  const cur = all.find((x) => x.id === st.apSel) || all[0];
  if (cur) S.apSel = cur.id;

  return (
    <div className="pn scroll">
      <div className="pn-in pn-wide">
        <h1>Experts to approve</h1>
        <p className="sub">{left.length ? `${plural(left.length, 'person', 'people')} waiting` : 'Nobody is waiting'}</p>
        <div className="ap-split">
          <ul className="ap-queue">
            {all.map((x) => {
              const s = st.ap[x.id];
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    className="ap-row"
                    aria-current={x.id === S.apSel}
                    onClick={() => {
                      S.apSel = x.id;
                      commit();
                    }}
                  >
                    <b>{x.name || x.id}</b>
                    <span className="muted small">{fmtISO(x.registered)}</span>
                    <span className="ap-tags">
                      {x.countries.map((c) => (
                        <span key={'c' + c.name} className="pill">
                          {c.name}
                        </span>
                      ))}
                      {x.fields.map((f) => (
                        <span key={'f' + f.name} className="pill">
                          {f.name}
                        </span>
                      ))}
                    </span>
                    <span className="ap-state">{s && s.sent ? 'Decided' : PRIV(x.privacy)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="ap-detail">{cur ? <ApCard key={cur.id} x={cur} /> : <p className="empty">Nobody is waiting.</p>}</div>
        </div>
      </div>
    </div>
  );
}

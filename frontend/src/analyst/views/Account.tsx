import { DATA, EXP, PRIV, fmtISO, plural } from '../data';
import { overlay, useAnalyst } from '../store';
import type { Expert } from '../types';
import { CloseBtn } from '../ui';
import { ORD, rankText } from './overview-helpers';

/** One expert's account: privacy, identity (if kept), rank, track record, activity */
function Account({ e }: { e: Expert }) {
  const id = e.privacy !== 'verified_deleted' ? DATA.identity[e.id] : undefined;
  return (
    <div className="acc">
      <p className="acc-top">
        <span className="pill">{PRIV(e.privacy)}</span>
        <span className="small muted">
          Member since {fmtISO(e.since)} · {e.last ? `last active ${fmtISO(e.last)}` : 'not active yet'}
        </span>
      </p>
      {id ? (
        <dl className="id-card">
          <dt>Name</dt>
          <dd>{id.name}</dd>
          <dt>Email</dt>
          <dd>{id.email}</dd>
          <dt>Organisation</dt>
          <dd>{id.org}</dd>
        </dl>
      ) : (
        <p className="id-gone">
          Fully anonymous. Their name, email and documents were deleted after approval. ACAPS follows their activity by
          this code only.
        </p>
      )}
      <h3>Rank</h3>
      {e.rank ? (
        <p>
          <b>{rankText(e)}</b> overall, {plural(e.rank.points, 'point')}
        </p>
      ) : (
        <p>No rank yet. They need 5 or more scored forecasts.</p>
      )}
      {e.groups.length > 0 && (
        <ul className="acc-list">
          {e.groups.map((g) => (
            <li key={g.type + g.name}>
              <span>
                {g.name} <span className="muted">{g.type}</span>
              </span>
              <span>
                {ORD(g.position)} of {g.outOf}
              </span>
            </li>
          ))}
        </ul>
      )}
      {e.rank && (
        <>
          <h3>Track record</h3>
          <dl className="acc-dl">
            <dt>Calls right</dt>
            <dd>
              {e.rank.correct} of {e.rank.calls} resolved
            </dd>
            <dt>Forecasts</dt>
            <dd>{e.rank.forecasts}</dd>
            {e.rank.brier != null && (
              <>
                <dt>Brier score</dt>
                <dd>
                  {e.rank.brier}
                  {e.rank.acapsBrier != null ? `, ACAPS ${e.rank.acapsBrier} on the same questions` : ''}. Lower is better.
                </dd>
              </>
            )}
          </dl>
        </>
      )}
      <h3>Approved for</h3>
      <dl className="acc-dl">
        <dt>Countries</dt>
        <dd>{e.countries.join(', ') || 'None'}</dd>
        <dt>Fields</dt>
        <dd>{e.fields.join(', ') || 'None'}</dd>
        {e.pending.length > 0 && (
          <>
            <dt>Waiting</dt>
            <dd>{e.pending.map((p) => p.name).join(', ')}</dd>
          </>
        )}
      </dl>
      <h3>This round</h3>
      <p>Voted on {plural(e.round.answered, 'risk')}.</p>
      {e.contrib.length > 0 && (
        <>
          <h3>Activity by country</h3>
          <table className="pn-t acc-t">
            <thead>
              <tr>
                <th>Country</th>
                <th>Votes</th>
                <th>Forecasts</th>
              </tr>
            </thead>
            <tbody>
              {e.contrib.map((c) => (
                <tr key={c.country}>
                  <td>{c.country}</td>
                  <td>{c.votes}</td>
                  <td>{c.forecasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

/** The expert account dialog (opened with openDialog('acct', { id })) */
export function AccountDialog() {
  useAnalyst();
  const e = overlay.dialog?.name === 'acct' && overlay.dialog.id ? EXP[overlay.dialog.id] : undefined;
  if (!e) return null;
  return (
    <>
      <div className="dlg-head">
        <h2>Expert {e.id}</h2>
        <CloseBtn />
      </div>
      <div className="dlg-body">
        <Account e={e} />
      </div>
    </>
  );
}

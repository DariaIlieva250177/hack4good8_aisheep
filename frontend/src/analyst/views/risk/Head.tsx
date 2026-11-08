import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DATA } from '../../data';
import { countryHref } from '../../nav';
import { useAnalyst } from '../../store';
import { LevelChip } from '../../ui';
import type { Risk } from '../../types';
import { CountryLinks } from '../overview-ui';
import { goTrig, trigState } from './helpers';

/** The risk's header: the compact card on Experts, facts and the lead on the other tabs */
export function WsHead({ r, tab }: { r: Risk; tab: string }) {
  useAnalyst();
  if (tab === 'experts') return <CompactHead r={r} />;
  const u = r.updates[0];
  const facts: [string, ReactNode][] = [
    ['Probability', `${r.probability} (${r.band})`],
    ['Impact', `${r.impact} of 5`],
    ['Risk level', <LevelChip level={r.level} />],
    ['People exposed', r.exposure],
    ['Trend', r.trend ? r.trend : 'Not given'],
    ['Priority needs', r.needs.length ? r.needs.join(', ') : 'Not given'],
    ['Latest update', u ? u.label : 'None yet'],
    ['Chat closes', r.closes ? r.closes : 'Unknown'],
  ];
  return (
    <>
      <div className="eyebrow">
        <Link to="/picture">Picture</Link> · <CountryLinks r={r} /> · {r.id} · {r.category}
      </div>
      <h1 className="ws-title">{r.title}</h1>
      <dl className="facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {tab === 'situation' && (
        <div className="lead">
          <div>
            <div className="lab">{u ? `Latest ACAPS update, ${u.label}` : 'Latest ACAPS update'}</div>
            <p>{u ? u.first : 'ACAPS has not published a dated update on this risk.'}</p>
          </div>
          <div>
            <div className="lab">Trigger completion</div>
            {r.triggers.length ? (
              r.triggers.map((t) => {
                const { rate, rev } = trigState(r, t);
                return (
                  <button key={t.id} type="button" className="mini" data-tip={t.title} onClick={() => goTrig(t.id)}>
                    <span>{t.id}</span>
                    <span className={`bar${rev ? ' inked' : ''}`}>
                      <i style={{ width: `${rate ?? 0}%` }} />
                    </span>
                    <span>{rate == null ? 'Not given' : rate + '%'}</span>
                  </button>
                );
              })
            ) : (
              <p className="muted small">No triggers listed.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** The header card on the Experts tab */
function CompactHead({ r }: { r: Risk }) {
  const first = r.countries[0];
  return (
    <div className={`ws-card l-${r.level.toLowerCase()}`}>
      <div className="eyebrow">
        {DATA.countries[first] ? <Link to={countryHref(first)}>← {first}</Link> : <Link to="/picture">← Picture</Link>} ·{' '}
        <CountryLinks r={r} /> · {r.id}
      </div>
      <h1 className="ws-title">{r.title}</h1>
      <div className="ws-chips">
        <LevelChip level={r.level} />
        <span className="pill">{r.exposure} people exposed</span>
        {r.closes && <span className="pill">Chat closes {r.closes}</span>}
        <span className="pill">ACAPS: {r.probability}</span>
      </div>
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { DATA, R, fmtISO, plural } from '../data';
import { go, riskHref } from '../nav';
import { S, commit, openDialog, useAnalyst } from '../store';
import { LevelChip } from '../ui';
import type { Link as RiskLink, Risk } from '../types';
import { CARD_DONE, LEVEL_ORDER, ORD, PROB_ORDER, STEP_WORDS } from './overview-helpers';
import { CodeBtn } from './overview-ui';

/** How the experts vote on a risk, and what most of them say will happen */
function CpAgree({ r }: { r: Risk }) {
  const g = r.group;
  const total = r.bands.reduce((x, y) => x + y, 0);
  const top = total ? r.bands.indexOf(Math.max(...r.bands)) : -1;
  return (
    <div className="cp-ag">
      {g && g.weighted_agree != null ? (
        <>
          <p className="xa-big">
            <b>{g.weighted_agree}%</b> agree with ACAPS
          </p>
          <p className="small muted">
            {g.agree} agree · {g.disagree} disagree
          </p>
        </>
      ) : (
        <p className="xa-big">No votes yet</p>
      )}
      {total > 0 && (
        <p className="cp-likely">
          Most say <b>{STEP_WORDS[top]}</b> within six months
        </p>
      )}
    </div>
  );
}

function CpRisk({ r }: { r: Risk }) {
  return (
    <li className={`pn-card cp-risk l-${r.level.toLowerCase()}`}>
      <div>
        <p className="cp-facts">
          <LevelChip level={r.level} />
          <span className="op-meta">
            {r.id}
            {r.closes ? ` · closes ${r.closes}` : ''}
          </span>
        </p>
        <h3>
          <Link to={riskHref(r.id)}>{r.title}</Link>
        </h3>
      </div>
      <CpAgree r={r} />
    </li>
  );
}

function CpLink({ l }: { l: RiskLink }) {
  const st = S.links[l.id];
  const state = st ? (st.state === 'confirmed' ? 'Confirmed' : 'Rejected') : 'Suggestion';
  return (
    <li className={`cp-link ${st && st.state === 'confirmed' ? 'ink' : 'pencil'}`}>
      <span className="op-meta">
        {l.from} to {l.to} · {l.strength} · {state}
      </span>
      <b>{l.name}</b>
      <button
        type="button"
        className="btn"
        onClick={() => {
          S.sel = l.id;
          S.ui.linkMode = null;
          commit();
          go('/connect');
        }}
      >
        Open in Connect
      </button>
    </li>
  );
}

/** A country's page: its open risks, links to other risks, its expert panel. */
export function Country() {
  const st = useAnalyst();
  const name = useParams().name ?? '';
  const c = DATA.countries[name];
  if (!c) {
    return (
      <div className="gate">
        <h1>No open risks in {name || 'this country'}</h1>
        <p>
          <Link to="/picture">Back to the Picture</Link>
        </p>
      </div>
    );
  }
  const risks = c.ids
    .map((id) => R[id])
    .filter(Boolean)
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
        PROB_ORDER.indexOf(b.probability) - PROB_ORDER.indexOf(a.probability) ||
        b.impact - a.impact,
    );
  const ids = new Set(risks.map((r) => r.id));
  const panel = DATA.experts
    .filter((e) => e.countries.includes(name))
    .map((e) => ({ e, g: e.groups.find((g) => g.type === 'country' && g.name === name) }))
    .sort((a, b) => (a.g ? a.g.position : 1e9) - (b.g ? b.g.position : 1e9) || a.e.id.localeCompare(b.e.id));
  const links = DATA.links.filter((l) => ids.has(l.from) || ids.has(l.to));
  const cards = DATA.cards.filter((x) => x.country === name);

  return (
    <div className="pn scroll">
      <div className="pn-in pn-wide">
        <div className="eyebrow">
          <Link to="/picture">Picture</Link> · Country
        </div>
        <h1 className="cp-h1">{name}</h1>
        <p className="sub">
          {plural(risks.length, 'open risk')} · {plural(panel.length, 'expert')} on the panel
        </p>
        <div className="cp-grid">
          <div>
            <section aria-labelledby="cpRisks">
              <h2 className="cp-h2" id="cpRisks">
                Risks
              </h2>
              <ol>
                {risks.map((r) => (
                  <CpRisk key={r.id} r={r} />
                ))}
              </ol>
            </section>
            <section className="pn-card" aria-labelledby="cpLinks">
              <h2 id="cpLinks">Links to other risks</h2>
              {links.length ? (
                <ol className="cp-links">
                  {links.map((l) => (
                    <CpLink key={l.id} l={l} />
                  ))}
                </ol>
              ) : (
                <p className="muted">No links yet.</p>
              )}
            </section>
          </div>
          <aside>
            <section className="pn-card">
              <h2>Panel for {name}</h2>
              {panel.length ? (
                <ul className="cp-panel">
                  {panel.map(({ e, g }) => (
                    <li key={e.id}>
                      <CodeBtn id={e.id} />
                      <span>
                        {g ? `${ORD(g.position)} of ${g.outOf}` : <span className="muted">No rank yet</span>}
                        <span className="small muted">{e.fields.join(', ')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No experts approved for this country yet.</p>
              )}
            </section>
            {cards.length > 0 && (
              <section className="pn-card">
                <h2>Suggested risks</h2>
                <ul className="cp-sugg">
                  {cards.map((x) => (
                    <li key={x.id}>
                      <button type="button" className="link" onClick={() => openDialog('drawer')}>
                        {x.statement}
                      </button>
                      <span className="small muted">
                        {x.area} · suggested {fmtISO(x.created_at)}
                        {st.cards[x.id] ? ` · ${CARD_DONE[st.cards[x.id].action]}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

import { Link, useParams, useSearchParams } from 'react-router-dom';
import { R, hasWritten } from '../../data';
import { S, useAnalyst } from '../../store';
import { WsHead } from './Head';
import { Situation } from './Situation';
import { Experts } from './Experts';
import { Analysis } from './Analysis';
import { Dock } from './Dock';
import './risk.css';

/**
 * A risk's workspace (/risk/:id, /risk/:id/:tab).
 *
 * As on the original page, only the Experts tab is shown: the analyst already
 * has ACAPS's own analysis in the Risk Radar, so the original forced
 * tab = 'experts' and rendered no notebook. The Situation (event replay,
 * trigger reviews, updates) and Analysis tabs and the notebook (AI helper,
 * notes) are ported too; add `?tabs` to the address to use them.
 */
export function Risk() {
  useAnalyst();
  const { id = '', tab: tabParam } = useParams();
  const [search] = useSearchParams();
  const allTabs = search.has('tabs');
  const r = R[id];
  if (!r) {
    return (
      <div className="gate">
        <h1>No open risk called {id}</h1>
        <p>
          <Link to="/picture">Back to the Picture</Link>
        </p>
      </div>
    );
  }
  const tab = allTabs ? tabParam || (hasWritten(id) ? 'experts' : 'situation') : 'experts';
  S.lastRisk = id;
  S.tab = tab;

  return (
    <div className={`ws${allTabs ? ' ws-dock' : ''}`}>
      <div className="ws-main" id="wsMain">
        <div className="ws-head">
          <WsHead r={r} tab={tab} />
        </div>
        <div className="tab-body" id="tabBody">
          {tab === 'experts' ? <Experts r={r} /> : tab === 'analysis' ? <Analysis r={r} /> : <Situation key={r.id} r={r} />}
        </div>
      </div>
      {allTabs && (
        <aside className="dock" id="dock" aria-label="Notebook">
          <Dock r={r} />
        </aside>
      )}
    </div>
  );
}

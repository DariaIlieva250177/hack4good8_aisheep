import { DATA } from '../data';
import { CloseBtn } from '../ui';

const ROWS: [string, string][] = [
  ['Real', 'ACAPS risks, updates, triggers and outcomes.'],
  ['Simulated', 'Experts and their forecasts, accounts, ranks and approvals.'],
  [
    'Sample',
    'Written answers on R1043 and five Sudan risks. Who wrote each one, and their match, rank and forecast, come from the simulated data.',
  ],
  ['Mock', 'AI summaries, claim groupings and drafts were written in advance. No model ran.'],
  ['Demo only', 'Upload a risk sends nothing. Publishing is only logged.'],
];

/** "What's real here": which parts of the page are real data, simulated or mock. */
export function RealDialog() {
  return (
    <>
      <div className="dlg-head">
        <h2>What's real here</h2>
        <CloseBtn />
      </div>
      <div className="dlg-body">
        <dl className="real">
          {ROWS.map(([a, b]) => (
            <div key={a} style={{ display: 'contents' }}>
              <dt>{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
        <p className="muted" style={{ marginTop: 11 }}>
          The {Object.keys(DATA.cites).length} quotes the drafts cite were checked word for word against their sources when
          this page was built.
        </p>
      </div>
    </>
  );
}

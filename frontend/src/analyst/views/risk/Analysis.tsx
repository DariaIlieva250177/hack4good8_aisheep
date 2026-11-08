import { Fragment } from 'react';
import type { Risk } from '../../types';
import { SaveBtn } from './bits';
import { ANALYSIS } from './notes';

/** Analysis tab: ACAPS's rationale, vulnerability and expected impact, sentence by sentence */
export function Analysis({ r }: { r: Risk }) {
  return (
    <div className="reading">
      {ANALYSIS.map(([k, h]) => (
        <Fragment key={k}>
          <h3>{h}</h3>
          <ol>
            {r[k].map((s, i) => (
              <li key={i} className="sent">
                <span>{s}</span>
                <SaveBtn k={`sent:${r.id}:${k}:${i}`} label="Save" />
              </li>
            ))}
          </ol>
        </Fragment>
      ))}
    </div>
  );
}

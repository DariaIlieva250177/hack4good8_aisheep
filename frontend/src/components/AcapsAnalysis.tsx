import { useId, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { Risk } from '../data/types';
import { en } from '../i18n/en';
import './AcapsAnalysis.css';

/**
 * "See the full ACAPS analysis": a disclosure under the card on the Answer
 * page. Closed by default so the answer form stays close to the card.
 */
export function AcapsAnalysis({ risk }: { risk: Risk }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const a = risk.analysis;
  if (!a) return null;
  const t = en.analysis;

  return (
    <section className={`acaps${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="acaps__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{open ? t.hide : t.show}</span>
        <ChevronDown className="acaps__chevron" size={20} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="acaps__panel">
          <dl className="acaps__facts">
            <div>
              <dt>{t.probability}</dt>
              <dd>{risk.probability}</dd>
            </div>
            <div>
              <dt>{t.impact}</dt>
              <dd>{t.impactOf(risk.impact)}</dd>
            </div>
            {a.trend && (
              <div>
                <dt>{t.trend}</dt>
                <dd>{a.trend}</dd>
              </div>
            )}
            <div>
              <dt>{t.exposure}</dt>
              <dd>{risk.exposure}</dd>
            </div>
          </dl>

          {a.update && <Block title={t.latest(a.update.date)} paras={a.update.text} highlight />}
          <Block title={t.rationale} paras={a.rationale} />
          <Block title={t.vulnerability} paras={a.vulnerability} />
          <Block title={t.expectedImpact} paras={a.expectedImpact} />

          {a.priorityNeeds.length > 0 && (
            <div className="acaps__block">
              <h3 className="acaps__heading">{t.needs}</h3>
              <ul className="acaps__needs">
                {a.priorityNeeds.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {a.sources.length > 0 && (
            <div className="acaps__block">
              <h3 className="acaps__heading">{t.sources}</h3>
              <ul className="acaps__sources">
                {a.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="sr-only">{t.newTab}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="acaps__credit">{t.credit}</p>
        </div>
      )}
    </section>
  );
}

function Block({ title, paras, highlight = false }: { title: string; paras: string[]; highlight?: boolean }) {
  if (!paras.length) return null;
  return (
    <div className={`acaps__block${highlight ? ' acaps__block--latest' : ''}`}>
      <h3 className="acaps__heading">{title}</h3>
      {paras.map((p, i) => (
        <p key={i} className="acaps__para">
          {p}
        </p>
      ))}
    </div>
  );
}

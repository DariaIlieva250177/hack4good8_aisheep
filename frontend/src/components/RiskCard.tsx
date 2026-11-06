import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import type { Risk, User, Verdict } from '../data/types';
import { RiskImage } from './RiskImage';
import { AreaChip, FamilyChip, LevelChip, VeryHighBadge } from './Chips';
import { VerdictButtons } from './VerdictButtons';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './RiskCard.css';

interface RiskCardProps {
  risk: Risk;
  me: User;
  verdict: Verdict | null;
  onVerdict: (v: Verdict) => void;
  onAddNote: () => void;
  onSend: () => void;
  /** Swipe hint drawn over the image */
  overlay?: ReactNode;
}

export function RiskCard({ risk, me, verdict, onVerdict, onAddNote, onSend, overlay }: RiskCardProps) {
  const titleId = `risk-${risk.id}-title`;

  return (
    <article className="risk-card soft-card" aria-labelledby={titleId}>
      <RiskImage family={risk.family} image={risk.image} overlay={overlay} />
      <div className="risk-card__body">
        <RiskChips risk={risk} />
        <h2 id={titleId} className="risk-card__title t-title">
          {risk.title}
        </h2>
        <p className="risk-card__question expert t-quote">{en.card.question}</p>
        <VerdictButtons value={verdict} onChange={onVerdict} labelledBy={titleId} />
        <div className="risk-card__actions">
          <button type="button" className="btn btn-soft btn-pill" onClick={onAddNote}>
            {en.card.addNote}
          </button>
          <button type="button" className="btn btn-primary btn-pill" onClick={onSend} aria-disabled={!verdict}>
            {en.card.send}
          </button>
          <span className="risk-card__count t-small t-muted">{en.card.answered(risk.answered, risk.panelSize)}</span>
        </div>
        <IdentityFooter me={me} />
      </div>
    </article>
  );
}

export function RiskChips({ risk }: { risk: Risk }) {
  const { mode } = useMode();
  return (
    <div className="chip-row">
      <LevelChip level={risk.level} />
      <FamilyChip family={risk.family} />
      <AreaChip area={risk.area} />
      {risk.probability === 'Very High' && mode === 'lite' && <VeryHighBadge />}
      {risk.probability === 'Very High' && mode === 'rich' && <span className="sr-only">{en.veryHigh}</span>}
      <span className="chip-row__id">{risk.id}</span>
    </div>
  );
}

export function IdentityFooter({ me }: { me: User }) {
  const label =
    me.identity === 'anonymous'
      ? en.card.peersSeeYouAnonymous
      : en.card.peersSeeYouAs(me.identity === 'name' ? me.name : me.pseudonym);
  return (
    <p className="identity-footer t-small">
      <UserRound size={18} color="var(--acaps-blue)" aria-hidden="true" />
      <span>{label}</span>
      <Link to="/profile#privacy" className="identity-footer__change">
        {en.card.change}
      </Link>
    </p>
  );
}

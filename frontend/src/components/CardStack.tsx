import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { Clock, X } from 'lucide-react';
import type { Risk, Verdict } from '../data/types';
import { RiskCard, RiskChips } from './RiskCard';
import { RiskImage } from './RiskImage';
import { useMode } from '../mode/ModeContext';
import { GlassButton } from './glass/GlassButton';
import { en } from '../i18n/en';
import './CardStack.css';

type Exit = 'later' | 'skip' | 'sent';

interface CardStackProps {
  risks: Risk[];
  onLater: (risk: Risk) => void;
  onSkip: (risk: Risk) => void;
  onSend: (risk: Risk, verdict: Verdict) => void;
}

/* Long enough to see your choice pressed before the card leaves. */
const SEND_DELAY_MS = 350;

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 600;

export function CardStack({ risks, onLater, onSkip, onSend }: CardStackProps) {
  const { reducedMotion } = useMode();
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [exit, setExit] = useState<Exit>('later');
  const sending = useRef<string | null>(null);
  const [front, ...rest] = risks;
  const behind = rest.slice(0, 2);

  const act = (kind: 'later' | 'skip', risk: Risk) => {
    setExit(kind);
    if (kind === 'later') onLater(risk);
    else onSkip(risk);
  };

  // One tap answers: show the choice, then send it.
  const answer = (risk: Risk, v: Verdict) => {
    if (sending.current === risk.id) return;
    sending.current = risk.id;
    setVerdicts((s) => ({ ...s, [risk.id]: v }));
    window.setTimeout(() => {
      setExit('sent');
      onSend(risk, v);
      sending.current = null;
    }, reducedMotion ? 0 : SEND_DELAY_MS);
  };

  return (
    <section className="card-stack" aria-label={en.risks.stackLabel}>
      <div className="card-stack__deck">
        {behind
          .slice()
          .reverse()
          .map((risk, i, arr) => (
            <GhostCard key={risk.id} risk={risk} tilt={arr.length - i === 1 ? -6 : 6} />
          ))}
        <AnimatePresence custom={{ exit, reducedMotion }} initial={false}>
          {front && (
            <SwipeCard
              key={front.id}
              reducedMotion={reducedMotion}
              onSwipe={(dir) => act(dir === 1 ? 'later' : 'skip', front)}
            >
              <RiskCard risk={front} verdict={verdicts[front.id] ?? null} onVerdict={(v) => answer(front, v)} />
            </SwipeCard>
          )}
        </AnimatePresence>
      </div>

      {front && (
        <div className="card-stack__buttons">
          <GlassButton pill onClick={() => act('skip', front)}>
            <X size={18} aria-hidden="true" />
            {en.card.skip}
          </GlassButton>
          <GlassButton pill onClick={() => act('later', front)}>
            <Clock size={18} aria-hidden="true" />
            {en.card.later}
          </GlassButton>
        </div>
      )}
    </section>
  );
}

const exitVariants = {
  enter: { opacity: 0, scale: 0.96, y: 14 },
  center: { opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 },
  exit: ({ exit, reducedMotion }: { exit: Exit; reducedMotion: boolean }) => {
    if (reducedMotion) return { opacity: 0, transition: { duration: 0 } };
    if (exit === 'sent') return { opacity: 0, y: -40, scale: 0.96, transition: { duration: 0.25 } };
    const dir = exit === 'later' ? 1 : -1;
    return { x: dir * 460, rotate: dir * 14, opacity: 0, transition: { duration: 0.3, ease: 'easeIn' as const } };
  },
};

function SwipeCard({
  children,
  onSwipe,
  reducedMotion,
}: {
  children: React.ReactNode;
  onSwipe: (dir: 1 | -1) => void;
  reducedMotion: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-10, 10]);
  const laterOpacity = useTransform(x, [24, SWIPE_DISTANCE], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_DISTANCE, -24], [1, 0]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onSwipe(1);
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onSwipe(-1);
  };

  return (
    <motion.div
      className="card-stack__front"
      style={{ x, rotate: reducedMotion ? 0 : rotate }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.9}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      variants={exitVariants}
      initial={reducedMotion ? false : 'enter'}
      animate="center"
      exit="exit"
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
    >
      {children}
      <motion.span className="swipe-label swipe-label--later glass" style={{ opacity: laterOpacity }} aria-hidden="true">
        <Clock size={18} /> {en.card.dragLater}
      </motion.span>
      <motion.span className="swipe-label swipe-label--skip glass" style={{ opacity: skipOpacity }} aria-hidden="true">
        <X size={18} /> {en.card.dragSkip}
      </motion.span>
    </motion.div>
  );
}

/** The cards peeking out behind, fanned. Decorative and inert. */
function GhostCard({ risk, tilt }: { risk: Risk; tilt: number }) {
  return (
    <div className="card-stack__ghost soft-card" style={{ rotate: `${tilt}deg` }} aria-hidden="true" inert>
      <RiskImage family={risk.family} image={risk.image} decorative />
      <div className="card-stack__ghost-body">
        <RiskChips risk={risk} />
        <p className="t-title card-stack__ghost-title">{risk.title}</p>
      </div>
    </div>
  );
}

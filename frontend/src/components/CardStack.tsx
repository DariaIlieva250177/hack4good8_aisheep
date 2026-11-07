import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { ArrowLeft, ArrowRight, Clock, X } from 'lucide-react';
import type { Risk } from '../data/types';
import { RiskCard, RiskChips } from './RiskCard';
import { RiskImage } from './RiskImage';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './CardStack.css';

type Exit = 'later' | 'skip' | 'sent';

interface CardStackProps {
  risks: Risk[];
  onLater: (risk: Risk) => void;
  onSkip: (risk: Risk) => void;
  /** Shown in the front card's top-right corner, e.g. "1/4" */
  counter?: string;
}

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 600;

export function CardStack({ risks, onLater, onSkip, counter }: CardStackProps) {
  const { reducedMotion } = useMode();
  const [exit, setExit] = useState<Exit>('later');
  // Which card is turned over; a new front card always starts face up.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [front, ...rest] = risks;
  const behind = rest.slice(0, 2);

  const act = (kind: 'later' | 'skip', risk: Risk) => {
    setExit(kind);
    if (kind === 'later') onLater(risk);
    else onSkip(risk);
  };

  // Keyboard: ← skips, → saves to To-do (the same as swiping left / right)
  const latest = useRef({ front, act });
  latest.current = { front, act };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      // Not while typing or while a pop-up is open
      const el = document.activeElement as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;
      if (document.querySelector('dialog[open]')) return;
      const { front: card, act: run } = latest.current;
      if (!card) return;
      e.preventDefault();
      run(e.key === 'ArrowRight' ? 'later' : 'skip', card);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="card-stack" aria-label={en.risks.stackLabel}>
      <div className="card-stack__deck">
        {behind
          .slice()
          .reverse()
          .map((risk, i, arr) => (
            <GhostCard key={risk.id} risk={risk} tilt={arr.length - i === 1 ? -6 : 6} />
          ))}
        {/* Round arrow buttons either side of the deck (shown on the website) */}
        {front && (
          <>
            <button
              type="button"
              className="card-stack__arrow card-stack__arrow--left"
              aria-label={en.card.arrowSkip}
              title={en.card.arrowSkip}
              onClick={() => act('skip', front)}
            >
              <ArrowLeft size={26} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="card-stack__arrow card-stack__arrow--right"
              aria-label={en.card.arrowLater}
              title={en.card.arrowLater}
              onClick={() => act('later', front)}
            >
              <ArrowRight size={26} aria-hidden="true" />
            </button>
          </>
        )}
        <AnimatePresence custom={{ exit, reducedMotion }} initial={false}>
          {front && (
            <SwipeCard
              key={front.id}
              reducedMotion={reducedMotion}
              onSwipe={(dir) => act(dir === 1 ? 'later' : 'skip', front)}
              flipped={flippedId === front.id}
              onFlip={() => setFlippedId((id) => (id === front.id ? null : front.id))}
            >
              <RiskCard risk={front} counter={counter} flipped={flippedId === front.id} />
            </SwipeCard>
          )}
        </AnimatePresence>
      </div>

      {front && (
        <div className="card-stack__buttons">
          <button type="button" className="card-stack__link" onClick={() => act('skip', front)}>
            {en.card.skip}
          </button>
          <button type="button" className="card-stack__link" onClick={() => act('later', front)}>
            {en.card.later}
          </button>
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
  flipped,
  onFlip,
}: {
  children: React.ReactNode;
  onSwipe: (dir: 1 | -1) => void;
  reducedMotion: boolean;
  flipped: boolean;
  onFlip: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-10, 10]);
  const laterOpacity = useTransform(x, [24, SWIPE_DISTANCE], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_DISTANCE, -24], [1, 0]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Right saves to To-do, left skips.
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
      // Stop the browser's own drag-and-drop of images/text from stealing the swipe
      onDragStartCapture={(e: React.DragEvent) => e.preventDefault()}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      // onTap only fires when the pointer didn't travel, so a swipe never flips.
      onTap={onFlip}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
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
    <div className={`card-stack__ghost risk-card--${risk.level.toLowerCase()}`} style={{ rotate: `${tilt}deg` }} aria-hidden="true" inert>
      <RiskImage family={risk.family} image={risk.image} decorative plain />
      <div className="card-stack__ghost-body">
        <RiskChips risk={risk} />
        <p className="t-title card-stack__ghost-title">{risk.title}</p>
      </div>
    </div>
  );
}

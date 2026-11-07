import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useInView, type TargetAndTransition } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useMode } from '../mode/ModeContext';
import './AnimatedList.css';

export interface AnimatedListItem {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  /** Optional coloured edge, e.g. the risk level colour */
  accent?: string;
}

type Animation = 'pop' | 'fade' | 'slide';

interface AnimatedListProps<T extends AnimatedListItem> {
  items: T[];
  onItemSelect?: (item: T, index: number) => void;
  animation?: Animation;
  theme?: 'dark' | 'light';
  /** Accessible name for the list */
  label?: string;
}

const HIDDEN: Record<Animation, TargetAndTransition> = {
  pop: { scale: 0.7, opacity: 0 },
  fade: { opacity: 0 },
  slide: { x: -24, opacity: 0 },
};
const SHOWN = { scale: 1, opacity: 1, x: 0 };

/**
 * A list whose rows animate in as they scroll into view. Rows are real
 * buttons (Tab / Enter work), and arrow keys move between them.
 */
export function AnimatedList<T extends AnimatedListItem>({
  items,
  onItemSelect,
  animation = 'pop',
  theme = 'dark',
  label,
}: AnimatedListProps<T>) {
  const [selected, setSelected] = useState(-1);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const next = e.key === 'ArrowDown' ? index + 1 : e.key === 'ArrowUp' ? index - 1 : null;
    if (next === null || next < 0 || next >= items.length) return;
    e.preventDefault();
    setSelected(next);
    refs.current[next]?.focus();
  };

  return (
    <ul className={`animated-list animated-list--${theme}`} aria-label={label}>
      {items.map((item, index) => (
        <Row key={`${item.title}-${index}`} animation={animation} delay={Math.min(index, 6) * 0.05}>
          <button
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            className={`animated-list__item${selected === index ? ' is-selected' : ''}`}
            style={item.accent ? { ['--accent-edge' as string]: item.accent } : undefined}
            onMouseEnter={() => setSelected(index)}
            onFocus={() => setSelected(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => onItemSelect?.(item, index)}
          >
            <span className="animated-list__text">
              <span className="animated-list__title">{item.title}</span>
              {item.description && <span className="animated-list__desc">{item.description}</span>}
            </span>
            {item.meta && <span className="animated-list__meta">{item.meta}</span>}
            <ChevronRight className="animated-list__chevron" size={18} aria-hidden="true" />
          </button>
        </Row>
      ))}
    </ul>
  );
}

function Row({ children, animation, delay }: { children: ReactNode; animation: Animation; delay: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const { reducedMotion } = useMode();

  if (reducedMotion) return <li ref={ref}>{children}</li>;

  return (
    <motion.li
      ref={ref}
      initial={HIDDEN[animation]}
      animate={inView ? SHOWN : HIDDEN[animation]}
      transition={{ duration: 0.22, delay: inView ? delay : 0, ease: 'easeOut' }}
    >
      {children}
    </motion.li>
  );
}

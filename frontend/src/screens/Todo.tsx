import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { getTodo, markTodoSeen, removeFromTodo, undoRemoveFromTodo } from '../data/api';
import { useToast } from '../components/Toast';
import { useQuery } from '../data/useQuery';
import type { Risk, RiskLevel } from '../data/types';
import { en } from '../i18n/en';
import './Todo.css';

const GROUPS: { level: RiskLevel; title: string }[] = [
  { level: 'High', title: en.todo.urgent },
  { level: 'Medium', title: en.todo.moderate },
  { level: 'Low', title: en.todo.low },
];

export function Todo() {
  const { data: risks } = useQuery(getTodo);
  useEffect(markTodoSeen, []);

  return (
    <div className="screen todo">
      <ScreenHeader title={en.todo.title} variant="large" />

      {risks && risks.length === 0 && <EmptyState title={en.todo.emptyTitle} body={en.todo.emptyBody} />}

      {risks &&
        GROUPS.map(({ level, title }) => {
          const items = risks.filter((r) => r.level === level);
          if (!items.length) return null;
          const id = `todo-${level}`;
          return (
            <section key={level} className="todo__group" aria-labelledby={id}>
              <h2 id={id} className="todo__heading">
                {title}
                <span className="todo__count">{en.todo.toAnswer(items.length)}</span>
              </h2>
              {/* Horizontal carousel that bleeds to the screen edges */}
              <Carousel label={title}>
                {items.map((risk) => (
                  <TodoCard key={risk.id} risk={risk} />
                ))}
              </Carousel>
            </section>
          );
        })}
    </div>
  );
}

/**
 * Horizontal scroller. Touch and trackpads scroll it natively; on desktop it
 * also scrolls with a mouse drag and the mouse wheel. A drag never opens a card.
 */
function Carousel({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Vertical wheel scrolls sideways until the row hits an end, then the page scrolls.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY > 0 && el.scrollLeft >= max - 1) || (e.deltaY < 0 && el.scrollLeft <= 0)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY });
    };

    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        el.classList.add('is-dragging');
        el.setPointerCapture(e.pointerId);
      }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      dragging = false;
      el.classList.remove('is-dragging');
    };
    // Swallow the click that ends a drag so it doesn't open the card.
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  return (
    <ul ref={ref} className="todo__carousel" aria-label={label}>
      {children}
    </ul>
  );
}

function TodoCard({ risk }: { risk: Risk }) {
  const toast = useToast();

  const remove = async () => {
    const index = await removeFromTodo(risk.id);
    toast({
      message: en.todo.removed,
      action: { label: en.risks.undo, onClick: () => undoRemoveFromTodo(risk.id, index) },
      duration: 5000,
    });
  };

  return (
    <li className="todo__item">
      {/* Outside the link: a button can't sit inside another interactive element */}
      <button
        type="button"
        className={`todo-card__trash todo-card__trash--${risk.level.toLowerCase()}`}
        aria-label={en.todo.removeLabel(risk.title)}
        onClick={remove}
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
      <Link to={`/answer/${risk.id}`} draggable={false} className={`todo-card todo-card--${risk.level.toLowerCase()}`}>
        <span className="todo-card__top">
          <span className="todo-card__chip">{en.families[risk.family]}</span>
          <span className="todo-card__id">{risk.id}</span>
        </span>
        <span className="todo-card__title">{risk.title}</span>
        <span className="todo-card__bottom">
          <span className="todo-card__area">{risk.area}</span>
          <span className="todo-card__go" aria-hidden="true">
            <ArrowRight size={20} strokeWidth={2.4} />
          </span>
        </span>
      </Link>
    </li>
  );
}

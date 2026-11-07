import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Carousel } from '../components/Carousel';
import { SuggestCard } from '../components/SuggestCard';
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
              <Carousel label={title} className="todo__carousel">
                {items.map((risk) => (
                  <TodoCard key={risk.id} risk={risk} />
                ))}
              </Carousel>
            </section>
          );
        })}

      <SuggestCard />
    </div>
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

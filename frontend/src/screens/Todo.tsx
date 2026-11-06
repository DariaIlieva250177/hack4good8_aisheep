import { ScreenHeader } from '../components/ScreenHeader';
import { RiskRow } from '../components/RiskRow';
import { EmptyState } from '../components/EmptyState';
import { getTodo } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { RiskLevel } from '../data/types';
import { en } from '../i18n/en';
import './Todo.css';

const GROUPS: { level: RiskLevel; title: string }[] = [
  { level: 'High', title: en.todo.urgent },
  { level: 'Medium', title: en.todo.moderate },
  { level: 'Low', title: en.todo.low },
];

export function Todo() {
  const { data: risks } = useQuery(getTodo);

  return (
    <div className="screen todo">
      <ScreenHeader title={en.todo.title} />

      {risks && risks.length === 0 && <EmptyState title={en.todo.emptyTitle} body={en.todo.emptyBody} />}

      {risks &&
        GROUPS.map(({ level, title }) => {
          const items = risks.filter((r) => r.level === level);
          if (!items.length) return null;
          const id = `todo-${level}`;
          return (
            <section key={level} className="todo__group" aria-labelledby={id}>
              <h2 id={id} className={`todo__pill todo__pill--${level.toLowerCase()}`}>
                {title}
                <span className="todo__count">{items.length}</span>
              </h2>
              <ul className="risk-list">
                {items.map((risk) => (
                  <RiskRow key={risk.id} risk={risk} to={`/answer/${risk.id}`} meta={<span>{risk.area}</span>} />
                ))}
              </ul>
            </section>
          );
        })}
    </div>
  );
}

import { ScreenHeader } from '../components/ScreenHeader';
import { AnimatedList } from '../components/AnimatedList';
import { EmptyState } from '../components/EmptyState';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../mode/ThemeContext';
import { getTodo, markTodoSeen } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { RiskLevel } from '../data/types';
import { en } from '../i18n/en';
import './Todo.css';

const GROUPS: { level: RiskLevel; title: string; accent: string }[] = [
  { level: 'High', title: en.todo.urgent, accent: '#b5123a' },
  { level: 'Medium', title: en.todo.moderate, accent: '#f2a33a' },
  { level: 'Low', title: en.todo.low, accent: '#e8d6a0' },
];

export function Todo() {
  const { data: risks } = useQuery(getTodo);
  useEffect(markTodoSeen, []);
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div className="screen todo">
      <ScreenHeader title={en.todo.title} />

      {risks && risks.length === 0 && <EmptyState title={en.todo.emptyTitle} body={en.todo.emptyBody} />}

      {risks &&
        GROUPS.map(({ level, title, accent }) => {
          const items = risks.filter((r) => r.level === level);
          if (!items.length) return null;
          const id = `todo-${level}`;
          return (
            <section key={level} className="todo__group" aria-labelledby={id}>
              <h2 id={id} className={`todo__pill todo__pill--${level.toLowerCase()}`}>
                {title}
                <span className="todo__count">{items.length}</span>
              </h2>
              <AnimatedList
                label={title}
                items={items.map((risk) => ({
                  id: risk.id,
                  title: risk.title,
                  description: `${risk.area} · ${en.families[risk.family]}`,
                  meta: risk.id,
                  accent,
                }))}
                onItemSelect={(item) => navigate(`/answer/${item.id}`)}
                animation="pop"
                theme={theme}
              />
            </section>
          );
        })}
    </div>
  );
}

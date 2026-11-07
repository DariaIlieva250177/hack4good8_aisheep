import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, Layers, ListTodo, Trophy, Users, type LucideIcon } from 'lucide-react';
import { newTodoCount, unreadNotificationCount } from '../data/api';
import { useStoreValue } from '../data/useQuery';
import { useMode } from '../mode/ModeContext';
import { en } from '../i18n/en';
import './GlassTabBar.css';

const TABS: { to: string; label: string; Icon: LucideIcon; badge?: 'todo' | 'alerts' }[] = [
  { to: '/risks', label: en.tabs.risks, Icon: Layers },
  { to: '/todo', label: en.tabs.todo, Icon: ListTodo, badge: 'todo' },
  { to: '/alerts', label: en.tabs.alerts, Icon: Bell, badge: 'alerts' },
  { to: '/community', label: en.tabs.community, Icon: Users },
  { to: '/ranking', label: en.tabs.ranking, Icon: Trophy },
];

/**
 * Floating glass pill with icons only. The active tab sits on a lighter glass
 * highlight that slides between tabs and gets a solid icon. Labels stay
 * available to screen readers.
 */
export function GlassTabBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const unread = useStoreValue(unreadNotificationCount);
  const newTodo = useStoreValue(newTodoCount);
  const counts = { todo: newTodo, alerts: unread };
  const { reducedMotion } = useMode();

  return (
    <nav className={`tabbar${tone === 'dark' ? ' tabbar--night' : ''}`} aria-label={en.tabs.label}>
      <ul className="tabbar__list">
        {TABS.map(({ to, label, Icon, badge }) => {
          const count = badge ? counts[badge] : 0;
          return (
          <li key={to}>
            <NavLink to={to} className="tabbar__item">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      className="tabbar__pill"
                      layoutId="tabbar-pill"
                      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="tabbar__icon">
                    <Icon
                      size={26}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      fill={isActive ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                    {count > 0 && (
                      <span className="tabbar__badge">
                        <span aria-hidden="true">{count}</span>
                        <span className="sr-only">{badge === 'todo' ? en.tabs.newTodo(count) : en.tabs.unread(count)}</span>
                      </span>
                    )}
                  </span>
                  <span className="sr-only">{label}</span>
                </>
              )}
            </NavLink>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}

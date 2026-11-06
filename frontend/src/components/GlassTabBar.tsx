import { NavLink } from 'react-router-dom';
import { Bell, Layers, ListTodo, Trophy, Users, type LucideIcon } from 'lucide-react';
import { unreadNotificationCount } from '../data/api';
import { useStoreValue } from '../data/useQuery';
import { en } from '../i18n/en';
import { GlassLayer } from './glass/GlassButton';
import './GlassTabBar.css';

const TABS: { to: string; label: string; Icon: LucideIcon; badge?: boolean }[] = [
  { to: '/risks', label: en.tabs.risks, Icon: Layers },
  { to: '/todo', label: en.tabs.todo, Icon: ListTodo },
  { to: '/alerts', label: en.tabs.alerts, Icon: Bell, badge: true },
  { to: '/community', label: en.tabs.community, Icon: Users },
  { to: '/ranking', label: en.tabs.ranking, Icon: Trophy },
];

export function GlassTabBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const unread = useStoreValue(unreadNotificationCount);

  return (
    <nav className={`tabbar glass-host ${tone === 'dark' ? 'glass-dark tabbar--dark' : 'glass'}`} aria-label={en.tabs.label}>
      <GlassLayer radius={34} tone="bar" />
      <ul className="tabbar__list">
        {TABS.map(({ to, label, Icon, badge }) => (
          <li key={to}>
            <NavLink to={to} className="tabbar__item">
              <span className="tabbar__icon">
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
                {badge && unread > 0 && (
                  <span className="tabbar__badge">
                    <span aria-hidden="true">{unread}</span>
                    <span className="sr-only">{en.tabs.unread(unread)}</span>
                  </span>
                )}
              </span>
              <span className="tabbar__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

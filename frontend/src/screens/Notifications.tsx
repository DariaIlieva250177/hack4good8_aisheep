import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, FileText, RefreshCw, Reply, type LucideIcon } from 'lucide-react';
import { ScreenHeader } from '../components/ScreenHeader';
import { getNotifications, markNotificationRead } from '../data/api';
import { useQuery } from '../data/useQuery';
import type { AppNotification, NotificationKind } from '../data/types';
import { en } from '../i18n/en';
import './Notifications.css';

/* System icons only, never photos of people. */
const ICONS: Record<NotificationKind, LucideIcon> = {
  analysis: FileText,
  round: RefreshCw,
  summary: BarChart3,
  resolved: CheckCircle2,
  reply: Reply,
};

export function Notifications() {
  const navigate = useNavigate();
  const { data: items } = useQuery(getNotifications);

  const open = async (n: AppNotification) => {
    if (n.unread) await markNotificationRead(n.id);
    navigate(n.to);
  };

  return (
    <div className="screen notifications">
      <ScreenHeader title={en.notifications.title} back />
      {items && items.length === 0 && <p className="t-muted">{en.notifications.empty}</p>}
      {items && items.length > 0 && (
        <ul className="notif-list soft-card">
          {items.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <li key={n.id}>
                <button type="button" className={`notif${n.unread ? ' notif--unread' : ''}`} onClick={() => open(n)}>
                  <span className="notif__icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="notif__text">
                    <span className="notif__kind t-small">{en.notifications.kind[n.kind]}</span>
                    <span className="notif__title">{n.text}</span>
                  </span>
                  <span className="notif__side">
                    <span className="t-small t-muted">{n.time}</span>
                    {n.unread && (
                      <>
                        <span className="notif__dot" aria-hidden="true" />
                        <span className="sr-only">{en.notifications.unread}</span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

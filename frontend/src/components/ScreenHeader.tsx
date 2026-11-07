import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from './Avatar';
import { GlassButton } from './glass/GlassButton';
import { displayNameFor, getMe } from '../data/api';
import { useQuery } from '../data/useQuery';
import { en } from '../i18n/en';
import './ScreenHeader.css';

interface ScreenHeaderProps {
  title: string;
  /** Show the title visibly (default) or only to screen readers */
  showTitle?: boolean;
  back?: boolean;
  avatar?: boolean;
  tone?: 'light' | 'dark';
}

export function ScreenHeader({ title, showTitle = true, back = false, avatar = true, tone = 'light' }: ScreenHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useQuery(getMe);

  const goBack = () => {
    // No history inside the app (deep link): go home instead of leaving it.
    if (location.key === 'default') navigate('/risks');
    else navigate(-1);
  };

  return (
    <header className={`screen-header screen-header--${tone}`}>
      <div className="screen-header__side">
        {back && (
          <GlassButton icon className="screen-header__back" onClick={goBack} aria-label={en.common.back}>
            <ArrowLeft size={22} aria-hidden="true" />
          </GlassButton>
        )}
      </div>
      <h1 className={showTitle ? 'screen-header__title' : 'sr-only'}>{title}</h1>
      <div className="screen-header__side screen-header__side--end">
        {avatar && me && (
          <GlassButton
            icon
            className="avatar-button"
            onClick={() => navigate('/profile', { state: { from: location.pathname } })}
            aria-label={en.common.openProfile}
          >
            <Avatar name={displayNameFor(me)} identity={me.identity} seed={me.id} size={40} you />
          </GlassButton>
        )}
      </div>
    </header>
  );
}

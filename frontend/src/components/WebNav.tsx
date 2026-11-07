import type { AnchorHTMLAttributes } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Globe, Layers, ListTodo, Trophy, Users } from 'lucide-react';
import PillNav from './pillnav/PillNav';
import { Logo } from './Logo';
import { Avatar } from './Avatar';
import { displayNameFor, getMe } from '../data/api';
import { useQuery } from '../data/useQuery';
import { useTheme } from '../mode/ThemeContext';
import { en } from '../i18n/en';
import './WebNav.css';

/** PillNav renders links with `href`; React Router's Link wants `to`. */
function RouterLink({ href = '/', ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <Link to={href} {...rest} />;
}

// Built at render time so the labels follow the chosen language
function navItems() {
  return [
    { label: en.webNav.home, href: '/', icon: <Globe aria-hidden="true" /> },
    { label: en.tabs.risks, href: '/risks', icon: <Layers aria-hidden="true" /> },
    { label: en.tabs.todo, href: '/todo', icon: <ListTodo aria-hidden="true" /> },
    { label: en.tabs.alerts, href: '/alerts', icon: <Bell aria-hidden="true" /> },
    { label: en.tabs.community, href: '/community', icon: <Users aria-hidden="true" /> },
    { label: en.tabs.ranking, href: '/ranking', icon: <Trophy aria-hidden="true" /> },
  ];
}
const HREFS = ['/', '/risks', '/todo', '/alerts', '/community', '/ranking'];

/** Which menu item a page belongs to (e.g. a community chat lives under Community). */
function activeFor(pathname: string): string | undefined {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/answer')) return '/todo';
  return HREFS.find((h) => h !== '/' && pathname.startsWith(h));
}

/**
 * The website's top bar: the logo on the left (home), the React Bits PillNav
 * menu in the middle (the home page with the globe plus web versions of the
 * app's pages, never the phone app itself) and your avatar on the right.
 */
export function WebNav({ onLogin }: { onLogin?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: me } = useQuery(getMe);
  const { theme } = useTheme();
  // The home page is always light; the inner pages follow the chosen theme
  const dark = theme === 'dark' && pathname !== '/';
  // Signed out (home page): only the logo and a "Log in" button
  const guest = Boolean(onLogin);

  return (
    <header className={`web-nav${guest ? ' web-nav--guest' : ''}`}>
      {/* Logo on the left: back to the home page */}
      <Link to="/" className="web-nav__logo" aria-label={en.webNav.homeLink}>
        <Logo className="web-nav__logo-img" label="" />
      </Link>

      {!guest && (
        <PillNav
          items={navItems()}
          activeHref={activeFor(pathname) ?? ''}
          linkComponent={RouterLink}
          theme={dark ? 'dark' : 'light'}
          itemStyle="pill"
          hoverEffect="fill"
          indicator="dot"
          highlightColor="#0196BA"
          ariaLabel={en.webNav.label}
        />
      )}

      {guest && (
        <button type="button" className="web-nav__login" onClick={onLogin}>
          {en.webLogin.open}
        </button>
      )}

      {/* You, on the right: opens your profile */}
      {!guest && me && (
        <button
          type="button"
          className="web-nav__me"
          aria-label={en.common.openProfile}
          aria-current={pathname === '/profile' ? 'page' : undefined}
          onClick={() => navigate('/profile', { state: { from: pathname } })}
        >
          <Avatar name={displayNameFor(me)} identity={me.identity} seed={me.id} size={40} you />
        </button>
      )}
    </header>
  );
}

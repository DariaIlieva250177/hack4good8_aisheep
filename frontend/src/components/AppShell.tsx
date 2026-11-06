import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlassTabBar } from './GlassTabBar';
import { scrollToTop } from './Device';

/** Layout for every signed-in screen: content plus the floating tab bar. */
export function AppShell() {
  const { pathname, hash } = useLocation();
  const dark = pathname.startsWith('/ranking');

  useEffect(() => {
    document.body.classList.toggle('night', dark);
    return () => document.body.classList.remove('night');
  }, [dark]);

  useEffect(() => {
    if (!hash) scrollToTop();
  }, [pathname, hash]);

  return (
    <>
      <main id="main">
        <Outlet />
      </main>
      <GlassTabBar tone={dark ? 'dark' : 'light'} />
    </>
  );
}

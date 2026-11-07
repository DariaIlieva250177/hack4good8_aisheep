import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSignedIn } from './auth';
import { WebNav } from '../components/WebNav';
import { ToastProvider } from '../components/Toast';
import { DuotoneFilters } from '../components/RiskImage';
import './web.css';

/**
 * Frame for the website's inner pages: the PillNav menu at the top and the
 * page in a centred, desktop-width column. The pages are the same screens as
 * the app; web.css lays them out for a browser (wider grids, two columns).
 */
export function WebLayout() {
  const { pathname } = useLocation();
  const signedIn = useSignedIn();

  // A new page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // The full website is for signed-in experts: otherwise back home to log in
  if (!signedIn) return <Navigate to="/?login=1" replace />;

  return (
    <div className="web">
      <WebNav />
      <ToastProvider>
        <DuotoneFilters />
        <main id="main" className="web__main">
          <Outlet />
        </main>
      </ToastProvider>
    </div>
  );
}

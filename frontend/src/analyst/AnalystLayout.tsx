import { useEffect } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Layers, LayoutDashboard, Moon, Route, Sun, UserCheck, Users } from 'lucide-react';
import PillNav from '../components/pillnav/PillNav';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { DATA } from './data';
import { nav } from './nav';
import { S, commit, openDialog, overlay, setMode, useAnalyst } from './store';
import type { Mode } from './store';
import { Dialog, Pop, Tip, Toast } from './ui';
import { DrawerDialog } from './views/Drawer';
import { ReportDialog } from './views/Report';
import { AccountDialog } from './views/Account';
import { RealDialog } from './views/Real';
// The analyst view is a desktop tool: always the full look, with the app's font
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '../components/WebNav.css';
import './analyst.css';

/** PillNav renders links with `href`; React Router's Link wants `to`. */
function RouterLink({ href = '/', ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <Link to={href} {...rest} />;
}

/** Which menu item a page belongs to (a country page lives under Picture, a risk under Open risks…). */
function activeFor(pathname: string): string {
  const name = pathname.split('/')[1] || 'picture';
  if (name === 'insight') return '/connect';
  if (name === 'country') return '/picture';
  if (name === 'risk') return '/open';
  return `/${name}`;
}

/** Applications still waiting for a decision, and suggested risks not yet handled */
const waitingApprovals = () => DATA.approvals.filter((x) => !S.ap[x.id]?.sent).length;
const waitingCards = () => DATA.cards.filter((c) => !S.cards[c.id]).length;

const Count = ({ n }: { n: number }) => (
  <span className="count" data-zero={n ? undefined : ''}>
    {n}
  </span>
);

/**
 * The analyst view's top bar, built from the same pieces as the website's:
 * the logo on the left, the PillNav menu in the middle, actions and the
 * moderator's avatar on the right.
 */
function AnalystNav() {
  useAnalyst();
  const { pathname } = useLocation();
  const approvals = waitingApprovals();
  const items = [
    { label: 'Picture', href: '/picture', icon: <Globe aria-hidden="true" /> },
    { label: 'Open risks', href: '/open', icon: <Layers aria-hidden="true" /> },
    {
      label: (
        <>
          Approvals <Count n={approvals} />
        </>
      ),
      ariaLabel: `Approvals, ${approvals} waiting`,
      href: '/approve',
      icon: <UserCheck aria-hidden="true" />,
    },
    { label: 'Connect', href: '/connect', icon: <Route aria-hidden="true" /> },
    { label: 'Panel', href: '/track', icon: <Users aria-hidden="true" /> },
    { label: 'Custom dashboard', href: '/dashboard', icon: <LayoutDashboard aria-hidden="true" /> },
  ];

  return (
    <header className="web-nav av-nav">
      <Link to="/picture" className="web-nav__logo av-nav__brand" aria-label="ACAPS community analyst view, home">
        <Logo className="web-nav__logo-img" label="" />
        <span className="av-nav__who">Analyst view</span>
      </Link>

      <PillNav
        items={items}
        activeHref={activeFor(pathname)}
        linkComponent={RouterLink}
        theme="light"
        itemStyle="pill"
        hoverEffect="fill"
        indicator="dot"
        highlightColor="#0196BA"
        ariaLabel="Main"
      />

      <div className="av-nav__actions">
        <button type="button" className="top-btn" onClick={() => openDialog('drawer')}>
          Suggested risks <Count n={waitingCards()} />
        </button>
        <Link
          to="/upload"
          className="top-btn primary"
          aria-current={pathname.startsWith('/upload') ? 'page' : undefined}
        >
          Upload a risk
        </Link>
        <button type="button" className="top-btn" title="What’s real here" onClick={() => openDialog('real')}>
          ?
        </button>
        <span className="av-nav__me" aria-label="ACAPS moderator" role="img">
          <Avatar name="Moderator" seed="acaps-moderator" size={44} you />
        </span>
      </div>
    </header>
  );
}

/** "Dashed boxes are suggestions…": shown on the pages that have them, until dismissed. */
function Hint() {
  const st = useAnalyst();
  const { pathname } = useLocation();
  const name = pathname.split('/')[1];
  if (st.hint || !['risk', 'connect', 'insight', 'country'].includes(name)) return null;
  return (
    <div className="hint" id="hint">
      <span className="spec" />
      <span className="spec solid" />
      <span>Dashed boxes are suggestions. Accept the ones you agree with. Only accepted items go into the report notes.</span>
      <button
        type="button"
        onClick={() => {
          S.hint = true;
          commit();
        }}
      >
        Got it
      </button>
    </div>
  );
}

const MODES: { id: Mode; label: string; icon: ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" /> },
];

/** Light or Dark: a small setting in the bottom corner (the top bar stays as it is). */
function ModeSwitch() {
  const st = useAnalyst();
  return (
    <div className="av-mode" role="group" aria-label="Display mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={st.mode === m.id}
          aria-label={`${m.label} mode`}
          title={`${m.label} mode`}
          onClick={() => setMode(m.id)}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}

/** Frame for every analyst page: top bar, hint, the page, and the shared overlays. */
export function AnalystLayout() {
  const st = useAnalyst();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Let actions outside components navigate
  useEffect(() => {
    nav.go = (to, opts) => navigate(to, opts);
  }, [navigate]);

  // A new page: close popovers, dialogs and the toast, start at the top
  useEffect(() => {
    overlay.pop = null;
    overlay.toast = null;
    overlay.dialog = null;
    commit();
    document.getElementById('view')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="av" data-mode={st.mode}>
      <AnalystNav />
      <Hint />
      <main id="view">
        <Outlet />
      </main>
      <Dialog name="drawer" className="drawer" label="Waiting for you and decisions">
        <DrawerDialog />
      </Dialog>
      <Dialog name="report" className="center" label="Report notes">
        <ReportDialog />
      </Dialog>
      <Dialog name="acct" className="center" label="Expert account">
        <AccountDialog />
      </Dialog>
      <Dialog name="real" className="center" label="What's real here">
        <RealDialog />
      </Dialog>
      <ModeSwitch />
      <Pop />
      <Tip />
      <Toast />
      {/* Sea contour lines, reused by the maps (<use href="#contours">) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="contours" viewBox="0 0 1000 560" overflow="visible">
            <g>
              {DATA.maps.contours.map((d, i) => (
                // Presentation attributes: CSS selectors don't reach the copies <use> makes
                <path
                  key={i}
                  d={d}
                  className="sea-lines"
                  fill="none"
                  stroke="#bfd4dd"
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          </symbol>
        </defs>
      </svg>
    </div>
  );
}

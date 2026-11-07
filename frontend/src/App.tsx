import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ModeProvider } from './mode/ModeContext';
import { ThemeProvider } from './mode/ThemeContext';
import { useLanguage } from './i18n/language';
import { ToastProvider } from './components/Toast';
import { DuotoneFilters } from './components/RiskImage';
import { AppShell } from './components/AppShell';
import { Device } from './components/Device';
import { WebLayout } from './web/WebLayout';
import { Login } from './screens/Login';
import { Risks } from './screens/Risks';
import { Profile } from './screens/Profile';
import { Todo } from './screens/Todo';
import { AnswerDetail } from './screens/AnswerDetail';
import { Community } from './screens/Community';
import { CommunityTopic } from './screens/CommunityTopic';
import { Ranking } from './screens/Ranking';
import { Notifications } from './screens/Notifications';
import { Landing } from './screens/Landing';

/** Where the phone app lives. Its own links (/risks, /todo…) resolve under it. */
export const APP_BASE = '/app';

/*
 * Two sites in one bundle, each with its own router:
 * - the website at "/": the home page plus web versions of every page,
 *   laid out for a desktop browser, with the PillNav menu;
 * - the phone app at "/app": unchanged, in the phone frame on desktop.
 * Going from one to the other is a normal page load, so their menus never mix.
 */
export default function App() {
  const isApp = window.location.pathname === APP_BASE || window.location.pathname.startsWith(`${APP_BASE}/`);
  // Changing language re-renders everything in the new language (the key remounts the tree)
  const language = useLanguage();
  return <ModeProvider key={language}>{isApp ? <PhoneApp /> : <Website />}</ModeProvider>;
}

function Website() {
  return (
    <ThemeProvider storageKey="webTheme" defaultSetting="light">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<WebLayout />}>
            <Route path="/risks" element={<Risks web />} />
            <Route path="/todo" element={<Todo />} />
            <Route path="/answer/:riskId" element={<AnswerDetail />} />
            <Route path="/alerts" element={<Notifications />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/:riskId" element={<CommunityTopic />} />
            <Route path="/community/:riskId/explore" element={<CommunityTopic explore />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function PhoneApp() {
  return (
    <ThemeProvider storageKey="appTheme" defaultSetting="light">
      <BrowserRouter basename={APP_BASE}>
        <Routes>
          <Route element={<DeviceLayout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route element={<AppShell />}>
              <Route path="/risks" element={<Risks />} />
              <Route path="/todo" element={<Todo />} />
              <Route path="/alerts" element={<Notifications />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/:riskId" element={<CommunityTopic />} />
              <Route path="/community/:riskId/explore" element={<CommunityTopic explore />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/answer/:riskId" element={<AnswerDetail />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

/** The app's screens: phone frame on desktop, full screen on a phone. */
function DeviceLayout() {
  return (
    <Device>
      <ToastProvider>
        <DuotoneFilters />
        <Outlet />
      </ToastProvider>
    </Device>
  );
}

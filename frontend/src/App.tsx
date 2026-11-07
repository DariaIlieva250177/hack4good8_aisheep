import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ModeProvider } from './mode/ModeContext';
import { ThemeProvider } from './mode/ThemeContext';
import { ToastProvider } from './components/Toast';
import { DuotoneFilters } from './components/RiskImage';
import { AppShell } from './components/AppShell';
import { Device } from './components/Device';
import { Login } from './screens/Login';
import { Risks } from './screens/Risks';
import { Profile } from './screens/Profile';
import { Todo } from './screens/Todo';
import { AnswerDetail } from './screens/AnswerDetail';
import { Community } from './screens/Community';
import { CommunityTopic } from './screens/CommunityTopic';
import { Ranking } from './screens/Ranking';
import { Notifications } from './screens/Notifications';

export default function App() {
  return (
    <ModeProvider>
      <ThemeProvider>
        <Device>
          <ToastProvider>
            <DuotoneFilters />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route element={<AppShell />}>
                  <Route path="/risks" element={<Risks />} />
                  <Route path="/todo" element={<Todo />} />
                  <Route path="/alerts" element={<Notifications />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/community/:riskId" element={<CommunityTopic />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/answer/:riskId" element={<AnswerDetail />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </Device>
      </ThemeProvider>
    </ModeProvider>
  );
}

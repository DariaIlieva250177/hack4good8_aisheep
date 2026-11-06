import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ModeProvider } from './mode/ModeContext';
import { ToastProvider } from './components/Toast';
import { DuotoneFilters } from './components/RiskImage';
import { AppShell } from './components/AppShell';
import { Placeholder } from './screens/Placeholder';
import { Login } from './screens/Login';
import { Risks } from './screens/Risks';
import { Profile } from './screens/Profile';
import { Todo } from './screens/Todo';
import { AnswerDetail } from './screens/AnswerDetail';
import { Community } from './screens/Community';

export default function App() {
  return (
    <ModeProvider>
      <ToastProvider>
        <DuotoneFilters />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<AppShell />}>
              <Route path="/risks" element={<Risks />} />
              <Route path="/todo" element={<Todo />} />
              <Route path="/alerts" element={<Placeholder title="Notifications" />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/:riskId" element={<Placeholder title="Community topic" />} />
              <Route path="/ranking" element={<Placeholder title="Ranking" />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/answer/:riskId" element={<AnswerDetail />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ModeProvider>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ModeProvider } from './mode/ModeContext';
import { ToastProvider } from './components/Toast';
import { DuotoneFilters } from './components/RiskImage';
import { AppShell } from './components/AppShell';
import { Placeholder } from './screens/Placeholder';

export default function App() {
  return (
    <ModeProvider>
      <ToastProvider>
        <DuotoneFilters />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Placeholder title="Log in" />} />
            <Route element={<AppShell />}>
              <Route path="/risks" element={<Placeholder title="Risks" />} />
              <Route path="/todo" element={<Placeholder title="To-do" />} />
              <Route path="/alerts" element={<Placeholder title="Notifications" />} />
              <Route path="/community" element={<Placeholder title="Community" />} />
              <Route path="/community/:riskId" element={<Placeholder title="Community topic" />} />
              <Route path="/ranking" element={<Placeholder title="Ranking" />} />
              <Route path="/profile" element={<Placeholder title="Profile" />} />
              <Route path="/answer/:riskId" element={<Placeholder title="Answer detail" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ModeProvider>
  );
}

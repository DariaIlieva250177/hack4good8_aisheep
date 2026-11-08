import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnalystLayout } from './AnalystLayout';
import { Picture } from './views/Picture';
import { Open } from './views/Open';
import { Risk } from './views/risk/Risk';
import { Connect } from './views/Connect';
import { Insight } from './views/Insight';
import { Country } from './views/Country';
import { Upload } from './views/Upload';
import { Approve } from './views/Approve';
import { Track } from './views/Track';
import { Dashboard } from './views/dashboard/Dashboard';

/** Where the analyst view lives. */
export const ANALYST_BASE = '/analyst';

/**
 * The ACAPS analyst view: how ACAPS's moderators work with the expert
 * community (the map of open risks, each risk's workspace, approvals,
 * links between risks, the panel, uploading a risk).
 */
export default function AnalystApp() {
  return (
    <BrowserRouter basename={ANALYST_BASE}>
      <Routes>
        <Route element={<AnalystLayout />}>
          <Route index element={<Navigate to="/picture" replace />} />
          <Route path="picture" element={<Picture />} />
          <Route path="open" element={<Open />} />
          <Route path="risk" element={<Open />} />
          <Route path="risk/:id" element={<Risk />} />
          <Route path="risk/:id/:tab" element={<Risk />} />
          <Route path="connect" element={<Connect />} />
          <Route path="insight" element={<Insight />} />
          <Route path="country/:name" element={<Country />} />
          <Route path="upload" element={<Upload />} />
          <Route path="upload/:from" element={<Upload />} />
          <Route path="approve" element={<Approve />} />
          <Route path="track" element={<Track />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/picture" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

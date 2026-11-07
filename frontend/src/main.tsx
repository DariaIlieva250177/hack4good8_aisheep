import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Fade out the loading splash (index.html) once the first frame has painted.
requestAnimationFrame(() => (window as Window & { acapsSplash?: { hide: () => void } }).acapsSplash?.hide());

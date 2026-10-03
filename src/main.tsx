import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dismiss the inline boot loader (see index.html) once React has actually
// painted the app. Two rAFs: the first fires after React's commit, the
// second after the browser has had a chance to paint that commit, so the
// fade-out never overlaps a still-blank frame.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const loader = document.getElementById('initial-loader');
    if (!loader) return;
    loader.classList.add('is-hidden');
    loader.addEventListener(
      'transitionend',
      () => loader.remove(),
      { once: true }
    );
    // Fallback in case the transitionend event doesn't fire for any reason
    // (e.g. prefers-reduced-motion edge cases) — never leave it stuck.
    setTimeout(() => loader.remove(), 600);
  });
});

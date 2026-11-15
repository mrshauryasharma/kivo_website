import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register high-performance offline Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[KIVO Service Worker] Active and caching shell for offline resilience:', reg.scope);
      })
      .catch((err) => {
        console.warn('[KIVO Service Worker] Registration notice:', err);
      });
  });
}

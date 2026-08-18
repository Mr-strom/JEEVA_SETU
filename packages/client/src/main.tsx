import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/client.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Offline Service Worker for Frontline Health Workers
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[JeevaSetu] Frontline ServiceWorker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[JeevaSetu] Frontline ServiceWorker registration failed:', err);
      });
  });
}

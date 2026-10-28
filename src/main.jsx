import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './lib/store.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider><App /></StoreProvider>,
);

// Offline support: cache the app shell so the schedule and course data open without signal.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !location.hostname.endsWith('claudeusercontent.com')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

window.addEventListener('error', (event) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'web',
      message: 'Frontend error',
      metadata: {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    }),
  );
});

window.addEventListener('unhandledrejection', (event) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'web',
      message: 'Unhandled promise rejection',
      metadata: {
        reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      },
    }),
  );
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/notification-worker.js');
  });
}

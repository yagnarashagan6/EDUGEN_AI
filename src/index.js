import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global error handlers to make runtime errors readable during development
window.addEventListener('error', (event) => {
  try {
    console.error('Global error:', event.error || event.message || event);
  } catch (e) {
    console.error('Global error (failed to stringify):', e);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    console.error('Unhandled rejection:', event.reason);
  } catch (e) {
    console.error('Unhandled rejection (failed to stringify):', e);
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
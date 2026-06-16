import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App';
import { assetPath } from './utils/assets';

const root = document.getElementById('root');

if (!root) {
  throw new Error('App root element #root was not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(assetPath('service-worker.js')).catch(() => undefined);
  });
}

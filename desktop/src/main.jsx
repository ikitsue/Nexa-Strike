import React from 'react';
import ReactDOM from 'react-dom/client';
import './version';
import App from './App';
import { LanguageProvider } from './i18n';
import './index.css';
import '../../shared/light-theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);

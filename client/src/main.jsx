import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles/app.css';
import './templates/styles/modern.css';
import './templates/styles/classic.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

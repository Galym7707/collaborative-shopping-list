// C:\Users\galym\Desktop\ShopSmart\frontend\src\main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n';
import { AuthProvider } from './context/AuthContext';

// apply saved theme
const saved = localStorage.getItem('theme');
if (saved === 'dark') document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

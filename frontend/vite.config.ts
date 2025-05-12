// File: frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://collaborative-shopping-list-production.up.railway.app',
        changeOrigin: true,
        secure: false,
      },
      '/ai': {
        target: 'https://extensions.aitopia.ai',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
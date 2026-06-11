import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/app/' : '/',
  root: 'client',
  plugins: [tailwindcss(), react()],
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    cssTarget: 'chrome111'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/images': 'http://localhost:3000'
    }
  }
}));

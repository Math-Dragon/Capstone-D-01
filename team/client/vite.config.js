import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
      ? process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS.split(',').map((h) => h.trim())
      : [],
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/metrics': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    css: true,
    coverage: {
      thresholds: {
        lines: 50,
      },
    },
  },
});

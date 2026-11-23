import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bind to 0.0.0.0 and allow the preview host so the app works
// both locally and inside hosted preview environments.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
});

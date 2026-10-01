import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development, send every /api request to the backend.
    // So the frontend can just call fetch('/api/...').
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});

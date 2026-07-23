import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Serve index.html for all routes so our path-based routing works
    historyApiFallback: true,
  },
});
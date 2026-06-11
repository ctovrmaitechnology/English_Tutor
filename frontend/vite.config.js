import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: mode === 'production'
      ? (env.VITE_CLOUDFRONT_URL || 'https://d123456abcdef8.cloudfront.net/')
      : '/',
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
              if (id.includes('lucide')) return 'vendor-lucide';
              if (id.includes('@tanstack/react-query')) return 'vendor-query';
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});

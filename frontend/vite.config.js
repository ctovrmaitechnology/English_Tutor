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
              const normalizedId = id.replace(/\\/g, '/');
              if (normalizedId.includes('/three') && !normalizedId.includes('@react-three')) return 'vendor-three';
              if (normalizedId.includes('@react-three')) return 'vendor-drei';
              if (normalizedId.includes('react/') || normalizedId.includes('react-dom/') || normalizedId.includes('scheduler')) return 'vendor-react';
              if (normalizedId.includes('lucide')) return 'vendor-lucide';
              if (normalizedId.includes('@tanstack')) return 'vendor-query';
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});

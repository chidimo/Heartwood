import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
    alias: {
      '@heartwood/shared': path.resolve(import.meta.dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: { port: 5175, host: 'localhost' },
  preview: { port: 5175, host: 'localhost' },
  plugins: [react(), tailwindcss()],
  build: { outDir: '../../dist/apps/web', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});

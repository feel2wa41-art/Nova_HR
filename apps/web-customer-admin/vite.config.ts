import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nova-hr/config': path.resolve(__dirname, '../../packages/config/src'),
      '@nova-hr/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@nova-hr/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@nova-hr/auth': path.resolve(__dirname, '../../packages/auth/src'),
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
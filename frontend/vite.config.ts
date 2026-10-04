import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  },
  plugins: [react()],
  build: {
    outDir: 'build'
  },
  server: {
    port: 3000
  }
});

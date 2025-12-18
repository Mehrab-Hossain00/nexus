import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Define process.env to point to our window shim to prevent "process is not defined" errors in production
    'process.env': 'window.process.env'
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: []
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  }
});
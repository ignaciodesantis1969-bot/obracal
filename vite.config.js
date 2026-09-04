import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) {
              return 'vendor-three';
            }
            if (id.includes('xlsx') || id.includes('jspdf')) {
              return 'vendor-docs';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('recharts') || id.includes('leaflet')) {
              return 'vendor-charts-maps';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
import { defineConfig } from 'vite';

export default defineConfig({
  // rutas relativas: dist/ funciona en cualquier subcarpeta del hosting
  base: './',
  build: {
    // three.js se carga de forma diferida al llegar a los podios
    chunkSizeWarningLimit: 700,
  },
});

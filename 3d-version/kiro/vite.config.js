import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the build can be served from any subdirectory.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
  },
});

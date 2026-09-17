import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths: the build works on GitHub Pages under any repository name.
  base: './',
  server: { port: 5180, strictPort: true, host: true },
  // three.js alone is ~540 KB; no need to split the bundle yet.
  build: { chunkSizeWarningLimit: 700 },
});

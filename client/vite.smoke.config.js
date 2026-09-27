/**
 * Build variant used only by the test suite.
 *
 * jsdom does not execute <script type="module">, so the tests need a single
 * classic script. This emits one IIFE bundle and rewrites the script tag to
 * match. Not used for production — see vite.config.js for that.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const classicScript = () => ({
  name: 'classic-script',
  transformIndexHtml: (html) => html.replace(/ type="module"/g, '').replace(/ crossorigin/g, ''),
});

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss(), classicScript()],
  build: {
    outDir: 'dist-smoke',
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js' },
    },
  },
});

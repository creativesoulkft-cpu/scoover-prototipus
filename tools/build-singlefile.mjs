/**
 * Egyfájlos build: a teljes appot (JS + CSS, a lazy modell-chunkokat is beleértve)
 * egyetlen HTML-be ágyazza. Megosztásra, artifact-hosztolásra, e-mailben
 * küldhető demóra való – a normál `npm run build` marad az éles (chunkolt) út.
 *
 * Futtatás: npm run build:single  →  dist-single/scoover-konfigurator.html
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = 'dist-single/.tmp';
await build({
  configFile: false,
  plugins: [react()],
  base: './',
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

const assets = join(outDir, 'assets');
const files = readdirSync(assets);
const js = readFileSync(join(assets, files.find((f) => f.endsWith('.js'))), 'utf8');
const css = readFileSync(join(assets, files.find((f) => f.endsWith('.css'))), 'utf8');

// Fej nélküli töredék: hosztolt artifact-környezet saját <html>/<head>-be csomagolja,
// böngészőben közvetlenül megnyitva is működik.
const html = `<title>Scoover fólia-konfigurátor</title>
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script>/g, '<\\/script>')}</script>
`;
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/scoover-konfigurator.html', html);
console.log(`dist-single/scoover-konfigurator.html (${(html.length / 1024).toFixed(0)} kB)`);

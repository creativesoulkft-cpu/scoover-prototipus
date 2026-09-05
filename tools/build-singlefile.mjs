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

// public/patterns/ képek data-URL-ként → __INLINE_ASSETS__ (src/utils/assets.js)
const inlineAssets = {};
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
for (const dir of ['patterns', 'models']) {
  for (const file of readdirSync(join('public', dir))) {
    const ext = file.split('.').pop().toLowerCase();
    if (!MIME[ext]) continue;
    inlineAssets[`${dir}/${file}`] = `data:${MIME[ext]};base64,${readFileSync(join('public', dir, file)).toString('base64')}`;
  }
}

await build({
  configFile: false,
  plugins: [react()],
  base: './',
  define: { __INLINE_ASSETS__: JSON.stringify(inlineAssets) },
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Anton&family=Rajdhani:wght@700&family=Bebas+Neue&family=Oswald:wght@700&family=Teko:wght@600&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script>/g, '<\\/script>')}</script>
`;
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/scoover-konfigurator.html', html);
console.log(`dist-single/scoover-konfigurator.html (${(html.length / 1024).toFixed(0)} kB)`);

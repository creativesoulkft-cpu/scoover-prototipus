import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Egyszerű Vite konfiguráció. A rollermodellek dinamikus importja (lásd
// src/data/models/index.js) miatt a build automatikusan külön chunkba teszi
// minden modell adatát – csak a kiválasztott töltődik le.
export default defineConfig({
  plugins: [react()],
  base: './',
});

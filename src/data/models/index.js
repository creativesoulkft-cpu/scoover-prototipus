/**
 * Rollermodell-regiszter.
 *
 * Itt CSAK a könnyű metaadatok szerepelnek (név, márka), a tényleges geometria
 * (darabok SVG path-jai) lusta (lazy) importtal töltődik be, kizárólag akkor,
 * amikor a felhasználó kiválasztja a modellt. Így 20+ modell esetén sem nő az
 * induló letöltés – a Vite minden modellből külön chunkot készít.
 *
 * ÚJ MODELL HOZZÁADÁSA:
 *   1. Hozz létre egy új fájlt ebbe a mappába (pl. `ninebot-max-g2.js`),
 *      ugyanazzal a szerkezettel, mint `kukirin-g2.js` (id, name, viewBox,
 *      decor[], pieces[] – minden darab: id, name, group, explode, d).
 *   2. Vegyél fel egy bejegyzést az alábbi tömbbe. Ennyi, kódot nem kell írni.
 *
 * A `load` függvény egy Promise-t ad vissza, ami a modell-objektumot tartalmazó
 * ES-modulra oldódik fel (`mod.default`).
 */
export const MODEL_REGISTRY = [
  {
    id: 'kukirin-g2',
    name: 'Kukirin G2',
    brand: 'Kukirin',
    load: () => import('./kukirin-g2.js'),
  },
  {
    id: 'kukirin-g2-master',
    name: 'Kukirin G2 Master',
    brand: 'Kukirin',
    load: () => import('./kukirin-g2-master.js'),
  },
];

/** Az első bejegyzés az alapértelmezett modell. */
export const DEFAULT_MODEL_ID = MODEL_REGISTRY[0].id;

export function getModelMeta(id) {
  return MODEL_REGISTRY.find((m) => m.id === id) ?? null;
}

/**
 * Rollermodell-regiszter.
 *
 * Itt CSAK a könnyű metaadatok szerepelnek (név, márka, évjáratok), a tényleges
 * geometria (darabok SVG path-jai) lusta (lazy) importtal töltődik be,
 * kizárólag akkor, amikor a felhasználó kiválasztja a modellt. Így 20+ modell
 * esetén sem nő az induló letöltés – a Vite minden modellből külön chunkot készít.
 *
 * ÚJ MODELL HOZZÁADÁSA:
 *   1. Hozz létre egy új fájlt ebbe a mappába (pl. `ninebot-max-g2.js`),
 *      ugyanazzal a szerkezettel, mint `kukirin-g2.js` (id, name, viewBox,
 *      decor[], pieces[] – minden darab: id, name, group, explode, d, és a
 *      zónába soroláshoz `priceGroup`, lásd src/data/zones.js).
 *   2. Vegyél fel egy bejegyzést az alábbi tömbbe (id, name, brand, years, load).
 *   3. Adj neki árat: src/pricing.js → MODEL_PRICES (ugyanezzel az id-val).
 *   Ennyi, kódot nem kell írni.
 *
 * ÚJ ÉVJÁRAT: az adott modell `years` listájába egy új szám. Az évjárat
 * jelenleg csak a rendelésbe kerül (a vágófájl kiválasztásához a gyártásban),
 * árat és geometriát nem befolyásol. Ha egy évjárat más geometriát igényel,
 * az külön modell-bejegyzés legyen (pl. 'kukirin-g2-2026').
 *
 * A `load` függvény egy Promise-t ad vissza, ami a modell-objektumot tartalmazó
 * ES-modulra oldódik fel (`mod.default`).
 */
export const MODEL_REGISTRY = [
  {
    id: 'kukirin-g2',
    name: 'Kukirin G2',
    brand: 'Kukirin',
    years: [2022, 2023, 2024, 2025],
    load: () => import('./kukirin-g2.js'),
  },
  {
    id: 'kukirin-g2-master',
    name: 'Kukirin G2 Master',
    brand: 'Kukirin',
    years: [2023, 2024, 2025],
    load: () => import('./kukirin-g2-master.js'),
  },
];

/** Az első bejegyzés az alapértelmezett modell. */
export const DEFAULT_MODEL_ID = MODEL_REGISTRY[0].id;

export function getModelMeta(id) {
  return MODEL_REGISTRY.find((m) => m.id === id) ?? null;
}

/** A modell legfrissebb évjárata – ez az alapértelmezett választás. */
export function defaultYearFor(id) {
  const years = getModelMeta(id)?.years ?? [];
  return years.length ? years[years.length - 1] : null;
}

/**
 * Rollermodell-regiszter.
 *
 * A modellek geometriája (darabok SVG path-jai) a FŐ csomagban van, nem külön
 * letöltött darabban (chunk). Korábban lusta importtal töltődtek, de a
 * statikus tárhelyen minden új kiadás lecseréli a régi
 * fájlneveket: aki egy régebben megnyitott lapon váltott modellt, annak a
 * régi darab 404-et adott, és a modellváltás csendben elakadt ("a G2 Master
 * fül nem működik"). Modellenként ~2 KB (gzip), így ez 20+ modellnél is
 * elhanyagolható. Ha egyszer több száz KB lesz, a lusta betöltés csak
 * újratöltés-kezeléssel (vite:preloadError → mentett állapot + reload) térhet vissza.
 *
 * ÚJ MODELL HOZZÁADÁSA:
 *   1. Hozz létre egy új fájlt ebbe a mappába (pl. `ninebot-max-g2.js`),
 *      ugyanazzal a szerkezettel, mint `kukirin-g2.js` (id, name, viewBox,
 *      decor[], pieces[] – minden darab: id, name, group, explode, d, és a
 *      zónába soroláshoz `priceGroup`, lásd src/data/zones.js).
 *   2. Importáld lent, és vegyél fel egy bejegyzést a tömbbe (id, name, brand, years, load).
 *   3. Adj neki árat: src/pricing.js → MODEL_PRICES (ugyanezzel az id-val).
 *   4. Nyomdai geometria (CSAK a szerveren, a kliens sosem kapja meg): a vágóív
 *      PDF-ből `python3 tools/cutfile/cutfile.py extract <pdf> <id>` + `build <id>`
 *      (lásd docs/print-pipeline.md); a kiírt mm/egység értékek a `printScale`-be.
 *
 * ÚJ ÉVJÁRAT: az adott modell `years` listájába egy új szám. Az évjárat
 * jelenleg csak a rendelésbe kerül (a vágófájl kiválasztásához a gyártásban),
 * árat és geometriát nem befolyásol. Ha egy évjárat más geometriát igényel,
 * az külön modell-bejegyzés legyen (pl. 'kukirin-g2-2026').
 *
 * A `load` függvény (a szerver és a useScooterModel közös felülete) egy
 * Promise-t ad vissza, ami `{ default: modell }`-re oldódik fel.
 */
import kukirinG2 from './kukirin-g2.js';
import kukirinG2Master from './kukirin-g2-master.js';

const ready = (model) => () => Promise.resolve({ default: model });

export const MODEL_REGISTRY = [
  {
    id: 'kukirin-g2',
    name: 'Kukirin G2',
    brand: 'Kukirin',
    years: [2022, 2023, 2024, 2025],
    load: ready(kukirinG2),
    /** egy nézet-egység milliméterben – a saját kép dpi-becsléséhez (utils/printQuality.js);
     *  a valódi vágóív illesztéséből (tools/cutfile/cutfile.py build kiírja) */
    printScale: { schematic: 1.144, photo: 0.955 },
  },
  {
    id: 'kukirin-g2-master',
    name: 'Kukirin G2 Master',
    brand: 'Kukirin',
    years: [2023, 2024, 2025],
    load: ready(kukirinG2Master),
    printScale: { schematic: 1.055, photo: 1.029 },
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

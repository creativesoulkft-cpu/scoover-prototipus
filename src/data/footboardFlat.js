/**
 * A taposófelület SÍKBA TERÍTETT (felülnézeti) kontúrja a taposó-szerkesztőhöz.
 *
 * MIÉRT KELL: a modell-adatfájlokban lévő `deck-top` darab az oldalnézeti
 * vázlat/fotó vetülete – onnan nézve a dekk teteje egy perspektivikusan
 * megdöntött, vékony sáv. Tervezni azon nem lehet: torzít, és nem mutatja a
 * valós arányokat. A szerkesztőben ezért a felülnézeti, valós arányú alakot
 * rajzoljuk.
 *
 * IDEIGLENES KÖZELÍTÉS – CSERÉLENDŐ: az itteni lekerekített téglalap a valós
 * dekk-méretarányból (644 × 156 mm ≈ 4,13:1) készült. Amint megvan a
 * taposófelület TÉNYLEGES vágókontúrja (SVG), csak ezt az egy fájlt kell
 * kicserélni: adj a modell-adatfájlnak egy `footboardFlat: { widthMm,
 * heightMm, d }` mezőt, és a szerkesztő automatikusan azt használja
 * (lásd `getFootboardFlat`).
 */

/** Alapértelmezett dekkméret milliméterben (Kukirin G2 / G2 Master nagyságrend). */
export const DEFAULT_FOOTBOARD_MM = { width: 644, height: 156 };

/**
 * Lekerekített téglalap path a megadott méretben.
 * A sarokrádiusz a rövidebb oldal ~18%-a – ennyi a jellemző a vágott
 * taposófóliáknál (éles sarok felszedné a fóliát a lábbal).
 */
function roundedRect(w, h, r = Math.min(w, h) * 0.18) {
  return [
    `M ${r} 0`,
    `H ${w - r}`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `V ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}

/**
 * A szerkesztőnek átadott, síkba terített taposó-geometria.
 *
 * A koordináta-rendszer 1 egység = 1 mm, így a minta léptéke fizikailag
 * értelmezhető marad (ugyanaz a szemlélet, mint a valódi vágófájloknál).
 *
 * @param {{footboardFlat?: {widthMm:number, heightMm:number, d?:string}}} [model]
 * @returns {{viewBox:{width:number,height:number}, piece:{id:string,name:string,d:string,labelAngle:number}, widthMm:number, heightMm:number, approximated:boolean}}
 */
export function getFootboardFlat(model) {
  const custom = model?.footboardFlat;
  const widthMm = custom?.widthMm ?? DEFAULT_FOOTBOARD_MM.width;
  const heightMm = custom?.heightMm ?? DEFAULT_FOOTBOARD_MM.height;
  const d = custom?.d ?? roundedRect(widthMm, heightMm);
  return {
    viewBox: { width: widthMm, height: heightMm },
    widthMm,
    heightMm,
    /** true = még a generált közelítés, nem a valódi vágókontúr */
    approximated: !custom?.d,
    piece: {
      id: 'deck-top',
      name: 'Dekk teteje (állófelület)',
      d,
      // felülnézetben a felirat vízszintes, nincs perspektivikus dőlés
      labelAngle: 0,
      footboard: true,
    },
  };
}

/**
 * Konfiguráció → megosztható PNG kép.
 *
 * Natív SVG-szerializálás + Canvas-renderelés (nincs hozzá külső könyvtár):
 * a látható roller-vázlat/fotó <svg>-jét lemásoljuk, minden benne lévő
 * <image> hivatkozást base64 data: URI-vá alakítunk, a kapott SVG-t egy
 * <img>-be töltjük, majd Canvas-ra rajzoljuk – éles, nagy felbontású PNG-t
 * adva (EXPORT_SCALE-szeres méretben).
 *
 * FONTOS, KÖNNYEN ELNÉZHETŐ BÖNGÉSZŐ-KORLÁTOZÁS: amikor egy SVG-t "kép
 * erőforrásként" töltünk be (`new Image().src = <svg blob URL>`, ugyanúgy,
 * mint egy sima <img src="valami.svg">-nél), a böngésző BIZTONSÁGI OKBÓL
 * NEM tölti be a benne hivatkozott KÜLSŐ erőforrásokat (pl. egy <pattern>
 * belsejében lévő <image href="https://...">) – csak a már beágyazott
 * data: URI-kat. Ez nem időzítési hiba, hanem szándékos, minden böngészőben
 * (Chrome/Firefox/Safari) egyező védelem, hogy egy "kép" ne tudjon
 * tetszőleges hálózati erőforrást lekérni/kiszivárogtatni. Emiatt a mintás
 * (image-tile) darabok és a fotós nézet terméke fotója üresen/átlátszóan
 * jelent volna meg export után – ezért ELŐBB mindent data: URI-vá alakítunk
 * (`inlineImages`), utána szerializáljuk az SVG-t.
 *
 * A vízjelet és a modell/szint/ár feliratsávot NEM az SVG-be rajzoljuk bele,
 * hanem közvetlenül Canvas 2D `fillText`-tel/`drawImage`-dzsel, a kész
 * raszterkép fölé/alá – ez megbízhatóbb, mint egyedi webfontokat egy
 * önállóan szerializált SVG-n belül rasterizáltatni (ami böngészőnként
 * eltérően viselkedhet).
 */
import { assetUrl } from './assets.js';

/** A vízjel logója (public/brand/scoover-logo.png) – egyszer töltjük be, minden exporthoz újrahasznosítva. */
let logoImagePromise = null;
function loadLogoImage() {
  if (!logoImagePromise) {
    logoImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('A Scoover logó nem tölthető be.'));
      img.src = assetUrl('brand/scoover-logo.png');
    });
  }
  return logoImagePromise;
}

const EXPORT_SCALE = 2.2;
const FOOTER_HEIGHT = 128;
const BRAND = {
  bg: '#171a1f',
  border: '#2b3038',
  text: '#e8eaee',
  muted: '#8b93a1',
  accent: '#ff6a1a',
};

/**
 * React `useId()` kettőspontot tartalmazó id-kat ad (pl. "fill:rj:-large").
 * Élő DOM-ban ez rendben van, de amikor a klónozott SVG-t önálló XML-
 * dokumentumként szerializáljuk és `data:image/svg+xml`-ként töltjük be, a
 * szigorú XML-elemző a kettőspontot névtér-előtagnak veszi, és a `url(#...)`
 * hivatkozások nem oldódnak fel (a minta "eltűnik" – csak ez esett ki, a
 * mérete/vágóvonalak jók maradnak). Ezért exportálás előtt minden id-t (és a
 * rá mutató url(#...)/href="#..." hivatkozást) kettőspont nélküli, biztonságos
 * névre cserélünk.
 */
function sanitizeIdsForExport(svgEl) {
  const idAttrEls = svgEl.querySelectorAll('[id*=":"]');
  const idMap = new Map();
  let n = 0;
  for (const el of idAttrEls) {
    const oldId = el.getAttribute('id');
    const safeId = `x${n++}_${oldId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    idMap.set(oldId, safeId);
    el.setAttribute('id', safeId);
  }
  if (idMap.size === 0) return;

  const urlRefAttrs = ['fill', 'stroke', 'clip-path', 'filter', 'mask', 'marker-start', 'marker-mid', 'marker-end'];
  const all = svgEl.querySelectorAll('*');
  for (const el of all) {
    for (const attr of urlRefAttrs) {
      const val = el.getAttribute(attr);
      if (!val || !val.includes('url(#')) continue;
      const updated = val.replace(/url\(#([^)]+)\)/g, (m, refId) =>
        idMap.has(refId) ? `url(#${idMap.get(refId)})` : m);
      if (updated !== val) el.setAttribute(attr, updated);
    }
    const href = el.getAttribute('href');
    if (href?.startsWith('#') && idMap.has(href.slice(1))) {
      el.setAttribute('href', `#${idMap.get(href.slice(1))}`);
    }
  }
}

function fetchAsDataUrl(url) {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Kép betöltése sikertelen (HTTP ${res.status}): ${url}`);
      return res.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Kép beolvasása sikertelen: ${url}`));
      reader.readAsDataURL(blob);
    }));
}

/**
 * A klónozott SVG-ben minden <image> href/xlink:href-jét base64 data: URI-vá
 * alakítja (lásd a fájl fejlécében a böngésző-korlátozás magyarázatát).
 * Ugyanazt az URL-t csak egyszer tölti le, még ha több <image> is hivatkozik
 * rá (pl. a fotós nézet kétszer használja ugyanazt a termékfotót).
 */
async function inlineImages(svgEl) {
  const images = [...svgEl.querySelectorAll('image')];
  const cache = new Map();
  await Promise.all(images.map(async (img) => {
    for (const attr of ['href', 'xlink:href']) {
      const val = img.getAttribute(attr);
      if (!val || val.startsWith('data:')) continue;
      const absolute = new URL(val, document.baseURI).href;
      if (!cache.has(absolute)) {
        cache.set(absolute, fetchAsDataUrl(absolute).catch((e) => {
          console.error(e); // eslint-disable-line no-console
          return null;
        }));
      }
      const dataUrl = await cache.get(absolute);
      if (dataUrl) img.setAttribute(attr, dataUrl);
    }
  }));
}

async function serializeSvgToImage(svgEl) {
  const clone = svgEl.cloneNode(true);
  sanitizeIdsForExport(clone);
  await inlineImages(clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Explicit width/height a viewBox alapján – enélkül egy önállóan
  // betöltött SVG intrinsic mérete böngészőnként eltérően (akár egy
  // apró, 300×150-es alapértelmezésre) eshet vissza.
  const vb = svgEl.viewBox.baseVal;
  if (vb) {
    clone.setAttribute('width', String(vb.width));
    clone.setAttribute('height', String(vb.height));
  }

  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('A vázlat nem alakítható képpé.')); };
    img.src = url;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 1. vízjelréteg: a teljes jelenetre feszülő, 45°-ban ismétlődő felirat.
 *
 * Ez az igazi másolásvédelem: a sarokjelölés egy vágással eltüntethető, ez
 * viszont átszövi a képet, így egy kivágott részleten is ott marad a márka.
 * Fehér betű sötét kontúrral, hogy a fotós (világos) és a vázlat (sötét)
 * nézeten is látszódjon, de ~11% átlátszatlansággal, hogy a design maradjon
 * a főszereplő.
 *
 * A felirat két, VÁLTAKOZÓ sorra van bontva ("SCOOVER" / "SCOOVER.HU")
 * ahelyett, hogy egyetlen hosszú "SCOOVER · SCOOVER.HU" sztringet
 * ismételnénk. Ennek geometriai oka van: a megadott 6-8%-os betűméretnél a
 * 20 karakteres sztring 45°-ban elforgatva SZÉLESEBB, mint a kép negyede,
 * tehát egy negyed-kivágásba sosem férne bele egy teljes példány – pont az
 * a védelem veszne el, amiért az egész réteg készült. Két rövid sztringgel
 * viszont a kép bármely negyedében ott van mindkettő, hiánytalanul: a
 * márkanév és a domain is.
 *
 * A sorok fél lépésköznyit el vannak csúsztatva egymáshoz képest
 * (tégla-kötés), így nem alakulnak ki üres, függőleges "folyosók".
 */
function drawDiagonalWatermark(ctx, w, h) {
  const lines = ['SCOOVER', 'SCOOVER.HU'];
  // a megadott 6-8%-os sáv alja: így fér el biztosan egy teljes példány
  // mindkét sztringből a kép bármelyik negyedében
  const fontSize = Math.round(w * 0.06);
  ctx.save();
  // csak a jelenetre – az alsó infósávba ne lógjon bele
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  ctx.globalAlpha = 0.11;
  ctx.font = `800 ${fontSize}px Rajdhani, Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = Math.max(1, fontSize * 0.055);
  ctx.lineJoin = 'round';

  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 4);

  // a lépésköz a HOSSZABB sorhoz igazodik, hogy egyik sor se érjen össze
  const stepX = Math.max(...lines.map((t) => ctx.measureText(t).width)) * 1.2;
  const stepY = fontSize * 1.8;
  // a 45°-os elforgatás miatt a lefedendő terület az átló mentén nagyobb,
  // mint maga a kép – mindkét irányban túlfuttatjuk
  const reach = Math.hypot(w, h) / 2 + stepX;
  let row = 0;
  for (let y = -reach; y <= reach; y += stepY, row++) {
    const text = lines[row % lines.length];
    const offset = (row % 2) * (stepX / 2);
    for (let x = -reach + offset; x <= reach; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

/**
 * @param {SVGSVGElement} svgEl - a jelenleg megjelenített ScooterCanvas/PhotoCanvas <svg> gyökere
 * @param {{modelName:string, tierLabel:string, patternName?:string, priceText:string}} info
 * @returns {Promise<Blob>} a kész PNG kép Blob-ként
 */
export async function renderConfigToPng(svgEl, info) {
  if (typeof document.fonts?.ready?.then === 'function') {
    await document.fonts.ready;
  }
  const [sceneImg, logoImg] = await Promise.all([
    serializeSvgToImage(svgEl),
    loadLogoImage().catch((e) => { console.error(e); return null; }), // eslint-disable-line no-console
  ]);

  const vb = svgEl.viewBox.baseVal;
  const sceneW = Math.round((vb?.width || sceneImg.naturalWidth) * EXPORT_SCALE);
  const sceneH = Math.round((vb?.height || sceneImg.naturalHeight) * EXPORT_SCALE);
  const footerH = Math.round(FOOTER_HEIGHT * (EXPORT_SCALE / 2));

  const canvas = document.createElement('canvas');
  canvas.width = sceneW;
  canvas.height = sceneH + footerH;
  const ctx = canvas.getContext('2d');

  // --- jelenet ---
  ctx.fillStyle = '#0f1114';
  ctx.fillRect(0, 0, sceneW, sceneH);
  ctx.drawImage(sceneImg, 0, 0, sceneW, sceneH);

  const u = EXPORT_SCALE / 2;

  // --- 1. vízjelréteg: átlós, ismétlődő felirat az egész jeleneten ---
  drawDiagonalWatermark(ctx, sceneW, sceneH);

  // --- 2. vízjelréteg: a valódi Scoover logó + CTA-szöveg, félig átlátszó
  // "pill" háttérrel a jelenet jobb alsó sarkában. Ez a réteg teljesen
  // átlátszatlan és jól olvasható: ez hordozza a kattintható információt.
  // A `c` (= u × CORNER_SCALE) miatt a sarokjelölés 1,5-szer nagyobb, mint
  // korábban – mobilon nézve az eredeti mérete túl apró volt. ---
  const CORNER_SCALE = 1.5;
  const c = u * CORNER_SCALE;
  const pad = Math.round(18 * u);
  const wmLine2 = 'Tervezd meg a tiédet: scoover.hu';
  const logoH = Math.round(28 * c);
  const logoW = logoImg ? logoH * (logoImg.naturalWidth / logoImg.naturalHeight) : 0;
  ctx.font = `600 ${Math.round(12 * c)}px Rajdhani, Arial, sans-serif`;
  const w2 = ctx.measureText(wmLine2).width;
  const innerW = Math.max(logoW, w2);
  const pillW = innerW + Math.round(28 * c);
  const pillH = logoImg ? Math.round(62 * c) : Math.round(52 * c);
  const pillX = sceneW - pad - pillW;
  const pillY = sceneH - pad - pillH;

  // finom árnyék + keret, hogy világos hátterű (pl. fotós nézet) jeleneten
  // se olvadjon bele a fehéres pill háttér
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = Math.round(10 * c);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  roundRect(ctx, pillX, pillY, pillW, pillH, Math.round(10 * c));
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = Math.max(1, c * 0.6);
  roundRect(ctx, pillX, pillY, pillW, pillH, Math.round(10 * c));
  ctx.stroke();

  const contentRight = pillX + pillW - Math.round(14 * c);
  const contentLeft = pillX + Math.round(14 * c);
  if (logoImg) {
    ctx.drawImage(logoImg, contentRight - logoW, pillY + Math.round(10 * c), logoW, logoH);
  } else {
    // tartalék, ha a logó valamiért nem tölt be – legalább a márkanév olvasható maradjon
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#16110b';
    ctx.font = `700 ${Math.round(15 * c)}px Rajdhani, Arial, sans-serif`;
    ctx.fillText('SCOOVER', contentRight, pillY + Math.round(24 * c));
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3a3040';
  ctx.font = `600 ${Math.round(12 * c)}px Rajdhani, Arial, sans-serif`;
  ctx.fillText(wmLine2, contentLeft, pillY + pillH - Math.round(14 * c));

  // --- alsó infósáv: modell, szint(+minta), ár ---
  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, sceneH, sceneW, footerH);
  ctx.strokeStyle = BRAND.border;
  ctx.lineWidth = Math.max(1, u);
  ctx.beginPath();
  ctx.moveTo(0, sceneH); ctx.lineTo(sceneW, sceneH); ctx.stroke();

  const leftX = Math.round(24 * u);
  const midY = sceneH + footerH / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = BRAND.text;
  ctx.font = `800 ${Math.round(22 * u)}px Rajdhani, Arial, sans-serif`;
  ctx.fillText(`${info.modelName} · ${info.tierLabel}`, leftX, midY - Math.round(6 * u));
  if (info.patternName) {
    ctx.fillStyle = BRAND.muted;
    ctx.font = `600 ${Math.round(14 * u)}px Rajdhani, Arial, sans-serif`;
    ctx.fillText(info.patternName, leftX, midY + Math.round(18 * u));
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = BRAND.accent;
  ctx.font = `800 ${Math.round(30 * u)}px Rajdhani, Arial, sans-serif`;
  ctx.fillText(info.priceText, sceneW - leftX, midY + Math.round(10 * u));

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('A kép előállítása sikertelen.'))), 'image/png', 0.95);
  });
}

/** Letölti a Blob-ot a felhasználó eszközére. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function blobToFile(blob, filename) {
  return new File([blob], filename, { type: blob.type });
}

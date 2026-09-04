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
 * hanem közvetlenül Canvas 2D `fillText`-tel, a kész raszterkép fölé/alá –
 * ez megbízhatóbb, mint egyedi webfontokat egy önállóan szerializált SVG-n
 * belül rasterizáltatni (ami böngészőnként eltérően viselkedhet).
 */

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
 * @param {SVGSVGElement} svgEl - a jelenleg megjelenített ScooterCanvas/PhotoCanvas <svg> gyökere
 * @param {{modelName:string, tierLabel:string, patternName?:string, priceText:string}} info
 * @returns {Promise<Blob>} a kész PNG kép Blob-ként
 */
export async function renderConfigToPng(svgEl, info) {
  if (typeof document.fonts?.ready?.then === 'function') {
    await document.fonts.ready;
  }
  const sceneImg = await serializeSvgToImage(svgEl);

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

  // --- vízjel: finom, félig átlátszó "pill" a jelenet jobb alsó sarkában,
  // hogy világos képrészlet fölött is jól olvasható maradjon ---
  const u = EXPORT_SCALE / 2;
  const pad = Math.round(18 * u);
  const wmLine1 = 'SCOOVER';
  const wmLine2 = 'Tervezd meg a tiédet: scoover.hu';
  ctx.font = `700 ${Math.round(15 * u)}px Rajdhani, Arial, sans-serif`;
  const w1 = ctx.measureText(wmLine1).width;
  ctx.font = `600 ${Math.round(12 * u)}px Rajdhani, Arial, sans-serif`;
  const w2 = ctx.measureText(wmLine2).width;
  const pillW = Math.max(w1, w2) + Math.round(28 * u);
  const pillH = Math.round(52 * u);
  const pillX = sceneW - pad - pillW;
  const pillY = sceneH - pad - pillH;

  ctx.fillStyle = 'rgba(10,11,13,0.55)';
  roundRect(ctx, pillX, pillY, pillW, pillH, Math.round(10 * u));
  ctx.fill();

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  const textRight = sceneW - pad - Math.round(14 * u);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(15 * u)}px Rajdhani, Arial, sans-serif`;
  ctx.fillText(wmLine1, textRight, pillY + Math.round(21 * u));
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 ${Math.round(12 * u)}px Rajdhani, Arial, sans-serif`;
  ctx.fillText(wmLine2, textRight, pillY + Math.round(40 * u));

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

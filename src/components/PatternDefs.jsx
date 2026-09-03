/**
 * Egy minta SVG <defs> tartalmát rendereli (pattern / gradient), és megadja,
 * mit kell a darabok `fill` attribútumába írni.
 *
 * KULCS A FOLYTONOSSÁGHOZ: minden minta `userSpaceOnUse` egységben, a teljes
 * vázlat koordináta-rendszerében van definiálva. Így bármelyik darab ugyanabból
 * a "végtelen" textúrából a saját helyének megfelelő részt mutatja → a minta
 * nem törik meg a darabhatárokon, mintha egy nagy fóliaívből vágták volna ki.
 *
 * A `scale` prop a darabméret-osztály szerinti csempe-léptéket adja (a
 * felhasználói transzformációra rászorozva); egy méretosztály = egy def.
 */
import { useEffect, useMemo, useState } from 'react';
import { assetUrl } from '../utils/assets.js';

/** Már betöltött textúra-URL-ek (modulszintű cache, hogy a váltás azonnali legyen). */
const loadedImages = new Set();

/**
 * Kép előtöltése a <pattern> számára. Chromium-ban a <pattern> belsejében
 * aszinkron betöltődő <image> nem mindig váltja ki a mintát használó elemek
 * újrarajzolását (a darab "üresen" marad). Ezért a képet előbb betöltjük,
 * és csak utána tesszük a pattern-be – ez DOM-változás, ami újrarajzol.
 */
function useImageReady(href) {
  const [ready, setReady] = useState(() => !href || href.startsWith('data:') || loadedImages.has(href));
  useEffect(() => {
    if (!href || ready) return undefined;
    let alive = true;
    const img = new Image();
    img.onload = img.onerror = () => { loadedImages.add(href); if (alive) setReady(true); };
    img.src = href;
    return () => { alive = false; };
  }, [href, ready]);
  return ready;
}

/** A minta azonosítójából a fill-érték. Egyszínűnél nincs szükség defs-re. */
export function fillFor(pattern, defId) {
  if (!pattern) return '#555';
  if (pattern.type === 'solid') return pattern.color;
  return `url(#${defId})`;
}

/** patternTransform / gradientTransform string a felhasználói beállításokból. */
function transformString(t, cx, cy, extraScale = 1) {
  const { scale = 1, rotate = 0, dx = 0, dy = 0, pre = '' } = t ?? {};
  // `pre`: darabonkénti extra transzformáció (pl. perspektív ferdítés a fotós nézetben)
  // forgatás a vázlat közepe körül, hogy a csúszka "helyben" forgasson
  return `${pre} translate(${dx} ${dy}) rotate(${rotate} ${cx} ${cy}) scale(${scale * extraScale})`.trim();
}

export default function PatternDefs({ pattern, defId, transform, viewBox, scale = 1 }) {
  const { width: vw, height: vh } = viewBox;
  const tf = transformString(transform, vw / 2, vh / 2, scale);
  const tileHref = pattern?.type === 'image-tile' ? assetUrl(pattern.src) : null;
  const tileReady = useImageReady(tileHref);

  // A markup-ban a __ID__ helyőrzőt az egyedi defId-re cseréljük.
  const tileHtml = useMemo(() => {
    if (pattern?.type !== 'tile') return null;
    return { __html: pattern.tile.markup.replaceAll('__ID__', defId) };
  }, [pattern, defId]);

  if (!pattern || pattern.type === 'solid') return null;

  if (pattern.type === 'gradient') {
    const a = ((pattern.angle ?? 0) * Math.PI) / 180;
    const r = Math.max(vw, vh) / 2;
    return (
      <linearGradient
        id={defId}
        gradientUnits="userSpaceOnUse"
        x1={vw / 2 - Math.cos(a) * r}
        y1={vh / 2 - Math.sin(a) * r}
        x2={vw / 2 + Math.cos(a) * r}
        y2={vh / 2 + Math.sin(a) * r}
        gradientTransform={tf}
      >
        {pattern.stops.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
    );
  }

  if (pattern.type === 'tile') {
    return (
      <pattern
        id={defId}
        patternUnits="userSpaceOnUse"
        width={pattern.tile.width}
        height={pattern.tile.height}
        patternTransform={tf}
        dangerouslySetInnerHTML={tileHtml}
      />
    );
  }

  if (pattern.type === 'image-tile') {
    // Raszteres, varratmentes csempe: NEM nyújtjuk a darabra, hanem ismételjük.
    // 'mirror' csempézésnél 2×2-es tükrözött blokk → akkor is folytonos, ha a
    // kép szélei nem illeszkednek tökéletesen.
    const t = pattern.tile;
    const href = tileHref;
    const mirror = pattern.tiling === 'mirror';
    const size = mirror ? t * 2 : t;
    if (!tileReady) {
      // betöltés alatt: semleges sötét kitöltés, hogy ne "villanjon" a fotó/vázlat
      return (
        <pattern id={defId} patternUnits="userSpaceOnUse" width={size} height={size}>
          <rect width={size} height={size} fill="#1c1d20" />
        </pattern>
      );
    }
    return (
      <pattern id={defId} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform={tf}>
        <image href={href} width={t} height={t} preserveAspectRatio="none" />
        {mirror && (
          <>
            <image href={href} width={t} height={t} preserveAspectRatio="none" transform={`translate(${2 * t} 0) scale(-1 1)`} />
            <image href={href} width={t} height={t} preserveAspectRatio="none" transform={`translate(0 ${2 * t}) scale(1 -1)`} />
            <image href={href} width={t} height={t} preserveAspectRatio="none" transform={`translate(${2 * t} ${2 * t}) scale(-1 -1)`} />
          </>
        )}
      </pattern>
    );
  }

  if (pattern.type === 'image') {
    // A feltöltött kép egy vázlat-méretű csempét tölt ki ("cover" illesztés);
    // a felhasználó a skála/eltolás csúszkákkal pozicionálja.
    return (
      <pattern id={defId} patternUnits="userSpaceOnUse" width={vw} height={vh} patternTransform={tf}>
        <image href={pattern.href} width={vw} height={vh} preserveAspectRatio="xMidYMid slice" />
      </pattern>
    );
  }

  return null;
}

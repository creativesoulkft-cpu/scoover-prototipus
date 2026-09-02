/**
 * Egy minta SVG <defs> tartalmát rendereli (pattern / gradient), és megadja,
 * mit kell a darabok `fill` attribútumába írni.
 *
 * KULCS A FOLYTONOSSÁGHOZ: minden minta `userSpaceOnUse` egységben, a teljes
 * vázlat koordináta-rendszerében van definiálva. Így bármelyik darab ugyanabból
 * a "végtelen" textúrából a saját helyének megfelelő részt mutatja → a minta
 * nem törik meg a darabhatárokon, mintha egy nagy fóliaívből vágták volna ki.
 */
import { useMemo } from 'react';

/** A minta azonosítójából a fill-érték. Egyszínűnél nincs szükség defs-re. */
export function fillFor(pattern, defId) {
  if (!pattern) return '#555';
  if (pattern.type === 'solid') return pattern.color;
  return `url(#${defId})`;
}

/** patternTransform / gradientTransform string a felhasználói beállításokból. */
function transformString(t, cx, cy) {
  const { scale = 1, rotate = 0, dx = 0, dy = 0 } = t ?? {};
  // forgatás a vázlat közepe körül, hogy a csúszka "helyben" forgasson
  return `translate(${dx} ${dy}) rotate(${rotate} ${cx} ${cy}) scale(${scale})`;
}

export default function PatternDefs({ pattern, defId, transform, viewBox }) {
  const { width: vw, height: vh } = viewBox;
  const tf = transformString(transform, vw / 2, vh / 2);

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

  if (pattern.type === 'image') {
    // A feltöltött kép egy vázlat-méretű csempét tölt ki ("cover" illesztés);
    // a felhasználó a skála/eltolás csúszkákkal pozicionálja.
    return (
      <pattern
        id={defId}
        patternUnits="userSpaceOnUse"
        width={vw}
        height={vh}
        patternTransform={tf}
      >
        <image
          href={pattern.href}
          width={vw}
          height={vh}
          preserveAspectRatio="xMidYMid slice"
        />
      </pattern>
    );
  }

  return null;
}

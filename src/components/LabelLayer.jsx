/**
 * Feliratréteg – a "SCOOVER" (vagy bármilyen) felirat VEKTOROS <text> elemként,
 * a textúra FÖLÖTT, saját rétegben.
 *
 * Miért külön réteg: a textúra raszteres kép, a felirat viszont minden méretben
 * és nyomtatási felbontásban éles kell maradjon, és modellenként cserélhető
 * ("G2" vs "G2 MASTER"). Ezért soha nem égetjük bele a mintaképbe.
 *
 * Működés:
 *  - a céldarab path-jának befoglaló dobozát (getBBox) méri, és ehhez arányosan
 *    számolja a betűméretet a kategória betűtípusának átlagos betűszélességéből;
 *  - a darab alakjára vágja (clipPath), így a felirat sosem lóg ki a fóliából;
 *  - a szín automatikusan fehér/fekete a háttérminta világossága alapján;
 *  - a darab `labelAngle` mezője szerint forgat (pl. kormányoszlop).
 */
import { useLayoutEffect, useRef, useState, useId } from 'react';

export default function LabelLayer({ piece, text, font, color, exploded }) {
  const measureRef = useRef(null);
  const [box, setBox] = useState(null);
  const clipId = `clip${useId()}`;

  // A path befoglaló doboza – a darab geometriájától függ, nem a mintától.
  useLayoutEffect(() => {
    if (measureRef.current) setBox(measureRef.current.getBBox());
  }, [piece?.d]);

  if (!piece || !text) return null;

  const angle = piece.labelAngle ?? 0;
  const [ex, ey] = piece.explode ?? [0, 0];

  // A darab "hossza" és "magassága" a felirat irányában: forgatott daraboknál a
  // bbox helyett a darab tengelye mentén becsülünk (átló ≈ hossz).
  let length = 0, thickness = 0;
  if (box) {
    if (angle) {
      length = Math.hypot(box.width, box.height) * 0.9;
      thickness = Math.min(box.width, box.height) * 0.55;
    } else {
      length = box.width;
      thickness = box.height;
    }
  }
  const chars = Math.max(text.length, 1);
  // betűméret: a darab hosszának ~72%-át töltse ki, de a vastagság 70%-ánál ne legyen nagyobb
  const fontSize = box
    ? Math.max(6, Math.min(thickness * 0.7, (length * 0.72) / (chars * font.glyph)))
    : 0;
  const cx = box ? box.x + box.width / 2 : 0;
  const cy = box ? box.y + box.height / 2 : 0;

  return (
    <g
      className="label-layer"
      style={{
        transform: exploded ? `translate(${ex}px, ${ey}px)` : 'translate(0,0)',
        transition: 'transform 380ms cubic-bezier(.2,.8,.2,1)',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <clipPath id={clipId}><path d={piece.d} /></clipPath>
      </defs>
      {/* láthatatlan mérő-path: ebből jön a getBBox */}
      <path ref={measureRef} d={piece.d} fill="none" stroke="none" />
      {box && (
        <text
          clipPath={`url(#${clipId})`}
          x={cx}
          y={cy}
          // a döntés (skew) a szöveg középpontja körül, különben elcsúszna
          transform={`rotate(${angle} ${cx} ${cy}) translate(${cx} ${cy}) skewX(${font.skew ?? 0}) translate(${-cx} ${-cy})`}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={`'${font.family}', Impact, 'Arial Black', sans-serif`}
          fontWeight={font.weight}
          fontSize={fontSize}
          letterSpacing={font.letterSpacing}
          fill={color}
          stroke={color === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'}
          strokeWidth={fontSize * 0.04}
          paintOrder="stroke"
          style={{ textTransform: 'uppercase' }}
        >
          {text}
        </text>
      )}
    </g>
  );
}

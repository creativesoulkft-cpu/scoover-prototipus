/**
 * Feliratréteg – egy felirat VEKTOROS <text> elemként, a textúra FÖLÖTT,
 * saját rétegben.
 *
 * Miért külön réteg: a textúra raszteres kép, a felirat viszont minden méretben
 * és nyomtatási felbontásban éles kell maradjon, és modellenként cserélhető
 * ("G2" vs "G2 MASTER"). Ezért soha nem égetjük bele a mintaképbe.
 *
 * Működés:
 *  - a céldarab path-jának befoglaló dobozát (getBBox) méri, és ehhez arányosan
 *    számolja az ALAP betűméretet a kategória betűtípusának átlagos
 *    betűszélességéből; erre jön a felhasználói `scale`;
 *  - a darab alakjára vágja (clipPath), így a felirat sosem lóg ki a fóliából;
 *  - a szín automatikusan fehér/fekete a háttérminta világossága alapján
 *    (vagy a felhasználó által rögzített);
 *  - a darab `labelAngle` mezője + a felhasználói `rotate` szerint forgat;
 *  - a szöveg egérrel húzható (onDrag → dx/dy a vázlat egységeiben);
 *  - opcionális `onFit`: méri, hogy a (forgatott) felirat belefér-e a darab
 *    befoglaló dobozába, és mekkora `scale`-lel férne bele középre igazítva –
 *    a taposó-szerkesztő ebből jelzi, ha a felirat széle levágódna.
 *
 * Egy LabelLayer = egy felirat; több felirat = több LabelLayer (labels tömb).
 */
import { useLayoutEffect, useRef, useState, useId } from 'react';

export default function LabelLayer({ piece, label, font, color, exploded, onDrag, onFit }) {
  const measureRef = useRef(null);
  const textRef = useRef(null);
  const [box, setBox] = useState(null);
  const [fontsTick, setFontsTick] = useState(0);
  const clipId = `clip${useId()}`;
  const drag = useRef(null);

  // A path befoglaló doboza – a darab geometriájától függ, nem a mintától.
  useLayoutEffect(() => {
    if (measureRef.current) setBox(measureRef.current.getBBox());
  }, [piece?.d]);

  // a webfont betöltése után a szöveg szélessége változik – újramérjük
  useLayoutEffect(() => {
    if (!onFit || !document.fonts?.ready) return undefined;
    let alive = true;
    document.fonts.ready.then(() => { if (alive) setFontsTick((t) => t + 1); });
    return () => { alive = false; };
  }, [onFit]);

  // Belefér-e a (forgatott) felirat a darab dobozába? A <text> getBBox-a a saját
  // transform NÉLKÜLI doboz; a forgatást (és a dőlt betű ferdítését) kézzel számoljuk rá.
  useLayoutEffect(() => {
    if (!onFit) return;
    const el = textRef.current;
    if (!el || !box || !label?.enabled || !String(label?.text ?? '').trim()) { onFit(null); return; }
    const t = el.getBBox();
    const a = (((piece.labelAngle ?? 0) + (label.rotate ?? 0)) * Math.PI) / 180;
    const skewPad = Math.abs(Math.tan(((font?.skew ?? 0) * Math.PI) / 180)) * t.height / 2;
    const hw = t.width / 2 + skewPad, hh = t.height / 2;
    const ex = Math.abs(Math.cos(a)) * hw + Math.abs(Math.sin(a)) * hh;
    const ey = Math.abs(Math.sin(a)) * hw + Math.abs(Math.cos(a)) * hh;
    const tcx = t.x + t.width / 2, tcy = t.y + t.height / 2;
    const tol = Math.min(box.width, box.height) * 0.01;
    const fits = tcx - ex >= box.x - tol && tcx + ex <= box.x + box.width + tol
      && tcy - ey >= box.y - tol && tcy + ey <= box.y + box.height + tol;
    // középre igazítva, a lekerekített sarkok miatt kis ráhagyással
    const k = Math.min((box.width / 2) / ex, (box.height / 2) / ey) * 0.92;
    onFit({ fits, fitScale: Math.round((label.scale ?? 1) * k * 100) / 100 });
  });

  const text = label?.text ?? '';
  if (!piece || !text) return null;

  const angle = (piece.labelAngle ?? 0) + (label.rotate ?? 0);
  const [ex, ey] = piece.explode ?? [0, 0];

  // A darab "hossza" és "vastagsága" a felirat irányában.
  let length = 0, thickness = 0;
  if (box) {
    if (piece.labelAngle) {
      length = Math.hypot(box.width, box.height) * 0.9;
      thickness = Math.min(box.width, box.height) * 0.55;
    } else {
      length = box.width;
      thickness = box.height;
    }
  }
  const chars = Math.max(text.length, 1);
  const baseSize = box
    ? Math.max(6, Math.min(thickness * 0.7, (length * 0.72) / (chars * font.glyph)))
    : 0;
  const fontSize = baseSize * (label.scale ?? 1);
  const cx = (box ? box.x + box.width / 2 : 0) + (label.dx ?? 0);
  const cy = (box ? box.y + box.height / 2 : 0) + (label.dy ?? 0);

  // --- húzás: a képernyő-koordinátát az SVG saját egységeire váltjuk ---
  const toSvg = (el, clientX, clientY) => {
    const svg = el.ownerSVGElement;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [pt.x, pt.y];
  };
  const onPointerDown = (e) => {
    if (!onDrag) return;
    e.preventDefault();
    e.stopPropagation(); // a felirat húzása nem a minta mozgatása (usePatternGesture)
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toSvg(e.currentTarget, e.clientX, e.clientY);
    drag.current = { x, y, dx: label.dx ?? 0, dy: label.dy ?? 0 };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const [x, y] = toSvg(e.currentTarget, e.clientX, e.clientY);
    onDrag({ dx: Math.round(drag.current.dx + x - drag.current.x), dy: Math.round(drag.current.dy + y - drag.current.y) });
  };
  const onPointerUp = () => { drag.current = null; };

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
        <g clipPath={`url(#${clipId})`}>
          <text
            ref={textRef}
            data-fonts={fontsTick}
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
            style={{ textTransform: 'uppercase', pointerEvents: onDrag ? 'all' : 'none', cursor: onDrag ? 'move' : 'default', userSelect: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {text}
          </text>
        </g>
      )}
    </g>
  );
}

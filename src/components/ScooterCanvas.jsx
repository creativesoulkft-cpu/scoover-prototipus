/**
 * Roller-vázlat megjelenítő.
 *
 * Kap egy modellt (darabok SVG path-jai) és egy mintát, és minden darabot a
 * közös mintával tölt ki. A darabok külön <g> elemben ülnek, így "szétnyitott"
 * nézetben egyenként eltolhatók – és mivel a minta userSpaceOnUse, a kivágott
 * mintarészlet a darabbal együtt mozog, pont úgy, ahogy a valódi fólia.
 *
 * Csempézett mintáknál a darab méretosztálya (large/medium/small) szerint
 * három léptékű def készül (patternScale), hogy a mintázat a kis darabokon
 * (villaborítás) se tűnjön aránytalanul nagynak. Az azonos osztályú darabok
 * között a folytonosság megmarad.
 */
import { useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';
import LabelLayer from './LabelLayer.jsx';

const DECOR_COLORS = {
  tire: '#2a2d31',
  rim: '#4a4f56',
  hub: '#8a9099',
  grip: '#3a3d42',
  lamp: '#ffe9a8',
  ground: '#2a2d31',
  spring: '#53585f',
};

const SIZE_CLASSES = ['large', 'medium', 'small'];
/** A taposófelület (standingSurface) kiemelő színe – akkor is látszik, ha a vágóvonalak ki vannak kapcsolva. */
const STANDING_SURFACE_ACCENT = '#f6c445';

function Decor({ items }) {
  return items.map((d, i) => {
    if (d.type === 'circle') {
      return <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={DECOR_COLORS[d.fill] ?? d.fill} />;
    }
    if (d.type === 'line') {
      return (
        <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
          stroke={DECOR_COLORS[d.stroke] ?? d.stroke} strokeWidth={d.width ?? 4} strokeLinecap="round" />
      );
    }
    if (d.type === 'path') {
      return (
        <path key={i} d={d.d} fill={d.fill ? DECOR_COLORS[d.fill] ?? d.fill : 'none'}
          stroke={d.stroke ? DECOR_COLORS[d.stroke] ?? d.stroke : undefined}
          strokeWidth={d.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
    }
    return null;
  });
}

export default function ScooterCanvas({
  model,
  pattern,
  transform,
  patternScale,        // { large, medium, small } – kategória/minta szerinti csempe-lépték
  standingSurfacePattern,      // a taposófelület saját, a fő mintától független mintája (GRIP vonal)
  standingSurfaceEnabled = false,
  standingSurfacePatternScale,
  sizeAwareTiling = true,
  exploded = false,
  showCutLines = true,
  disabledPieces,
  hoveredId,
  onHover,
  onTogglePiece,
  labels = [],         // [{ id, enabled, text, pieceId, scale, dx, dy, rotate, font, color }]
  onLabelDrag,         // (id, { dx, dy }) => void
}) {
  const uid = useId();
  const hatchId = `hatch${uid}`;
  const { width, height } = model.viewBox;

  // Csak akkor kell méretosztályonként külön def, ha a minta csempézett és a
  // kapcsoló be van kapcsolva; egyébként egyetlen közös def (teljes folytonosság).
  const tiled = pattern?.type === 'image-tile' || pattern?.type === 'tile';
  const classes = tiled && sizeAwareTiling ? SIZE_CLASSES : ['large'];
  const defIdFor = (size) => `fill${uid}-${classes.includes(size) ? size : 'large'}`;

  // A taposófelület csak akkor kap saját mintát, ha be van kapcsolva a prémium
  // csúszásgátló extra; a def-halmaz és a lépték teljesen független a fő mintáétól.
  const gripActive = standingSurfaceEnabled && Boolean(standingSurfacePattern);
  const gripTiled = standingSurfacePattern?.type === 'image-tile' || standingSurfacePattern?.type === 'tile';
  const gripClasses = gripTiled && sizeAwareTiling ? SIZE_CLASSES : ['large'];
  const gripDefIdFor = (size) => `grip${uid}-${gripClasses.includes(size) ? size : 'large'}`;
  const fillForPiece = (piece) =>
    gripActive && piece.standingSurface
      ? fillFor(standingSurfacePattern, gripDefIdFor(piece.size))
      : fillFor(pattern, defIdFor(piece.size));


  return (
    <svg
      className="scooter-canvas"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${model.name} vázlat`}
      onMouseLeave={() => onHover?.(null)}
    >
      <defs>
        {classes.map((size) => (
          <PatternDefs
            key={size}
            pattern={pattern}
            defId={defIdFor(size)}
            transform={transform}
            viewBox={model.viewBox}
            scale={sizeAwareTiling ? (patternScale?.[size] ?? 1) : 1}
          />
        ))}
        {gripActive && gripClasses.map((size) => (
          <PatternDefs
            key={`grip-${size}`}
            pattern={standingSurfacePattern}
            defId={gripDefIdFor(size)}
            viewBox={model.viewBox}
            scale={sizeAwareTiling ? (standingSurfacePatternScale?.[size] ?? 1) : 1}
          />
        ))}
        {/* sraffozás a fólia nélkül hagyott darabokhoz */}
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#2b2e33" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#4a4e55" strokeWidth="2" />
        </pattern>
      </defs>

      <g className="decor"><Decor items={model.decor.filter((d) => !d.over)} /></g>

      <g className="pieces">
        {model.pieces.map((piece) => {
          const disabled = disabledPieces?.has(piece.id);
          const hovered = hoveredId === piece.id;
          const [ex, ey] = piece.explode ?? [0, 0];
          return (
            <g
              key={piece.id}
              className="piece"
              style={{
                transform: exploded ? `translate(${ex}px, ${ey}px)` : 'translate(0,0)',
                transition: 'transform 380ms cubic-bezier(.2,.8,.2,1)',
              }}
            >
              <path
                d={piece.d}
                fill={disabled ? `url(#${hatchId})` : fillForPiece(piece)}
                stroke={hovered ? '#ffffff' : piece.standingSurface ? STANDING_SURFACE_ACCENT : showCutLines ? 'rgba(255,255,255,0.35)' : 'none'}
                strokeWidth={hovered ? 2.5 : piece.standingSurface ? 2 : 1}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onHover?.(piece.id)}
                onClick={() => onTogglePiece?.(piece.id)}
              >
                <title>{piece.name}{piece.standingSurface ? ' – Prémium csúszásgátló felület' : ''}{disabled ? ' (fólia nélkül)' : ''}</title>
              </path>
            </g>
          );
        })}
      </g>

      {/* a fóliázott felület fölé kerülő apró mechanikai részletek (pl. rugó) */}
      <g className="decor-over"><Decor items={model.decor.filter((d) => d.over)} /></g>

      {/* Feliratréteg: a textúra fölött, vektorosan, saját rétegben – feliratonként egy */}
      {labels.filter((l) => l.enabled && !disabledPieces?.has(l.pieceId)).map((l) => {
        const piece = model.pieces.find((p) => p.id === l.pieceId);
        return piece ? (
          <LabelLayer key={l.id} piece={piece} label={l} font={l.font} color={l.color} exploded={exploded}
            onDrag={onLabelDrag ? (d) => onLabelDrag(l.id, d) : undefined} />
        ) : null;
      })}
    </svg>
  );
}

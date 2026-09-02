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
};

const SIZE_CLASSES = ['large', 'medium', 'small'];

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
      return <path key={i} d={d.d} fill={DECOR_COLORS[d.fill] ?? d.fill ?? 'none'} />;
    }
    return null;
  });
}

export default function ScooterCanvas({
  model,
  pattern,
  transform,
  patternScale,        // { large, medium, small } – kategória/minta szerinti csempe-lépték
  sizeAwareTiling = true,
  exploded = false,
  showCutLines = true,
  disabledPieces,
  hoveredId,
  onHover,
  onTogglePiece,
  label,               // { enabled, text, pieceId, font, color } | null
}) {
  const uid = useId();
  const hatchId = `hatch${uid}`;
  const { width, height } = model.viewBox;

  // Csak akkor kell méretosztályonként külön def, ha a minta csempézett és a
  // kapcsoló be van kapcsolva; egyébként egyetlen közös def (teljes folytonosság).
  const tiled = pattern?.type === 'image-tile' || pattern?.type === 'tile';
  const classes = tiled && sizeAwareTiling ? SIZE_CLASSES : ['large'];
  const defIdFor = (size) => `fill${uid}-${classes.includes(size) ? size : 'large'}`;

  const labelPiece = label?.enabled ? model.pieces.find((p) => p.id === label.pieceId) : null;

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
        {/* sraffozás a fólia nélkül hagyott darabokhoz */}
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#2b2e33" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#4a4e55" strokeWidth="2" />
        </pattern>
      </defs>

      <g className="decor"><Decor items={model.decor} /></g>

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
                fill={disabled ? `url(#${hatchId})` : fillFor(pattern, defIdFor(piece.size))}
                stroke={hovered ? '#ffffff' : showCutLines ? 'rgba(255,255,255,0.35)' : 'none'}
                strokeWidth={hovered ? 2.5 : 1}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onHover?.(piece.id)}
                onClick={() => onTogglePiece?.(piece.id)}
              >
                <title>{piece.name}{disabled ? ' (fólia nélkül)' : ''}</title>
              </path>
            </g>
          );
        })}
      </g>

      {/* Feliratréteg: a textúra fölött, vektorosan, saját rétegben */}
      {labelPiece && !disabledPieces?.has(labelPiece.id) && (
        <LabelLayer
          piece={labelPiece}
          text={label.text}
          font={label.font}
          color={label.color}
          exploded={exploded}
        />
      )}
    </svg>
  );
}

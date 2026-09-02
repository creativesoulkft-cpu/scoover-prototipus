/**
 * Roller-vázlat megjelenítő.
 *
 * Kap egy modellt (darabok SVG path-jai) és egy mintát, és minden darabot a
 * közös mintával tölt ki. A darabok külön <g> elemben ülnek, így "szétnyitott"
 * nézetben egyenként eltolhatók – és mivel a minta userSpaceOnUse, a kivágott
 * mintarészlet a darabbal együtt mozog, pont úgy, ahogy a valódi fólia.
 */
import { useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';

const DECOR_COLORS = {
  tire: '#2a2d31',
  rim: '#4a4f56',
  hub: '#8a9099',
  grip: '#3a3d42',
  lamp: '#ffe9a8',
  ground: '#2a2d31',
};

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
  exploded = false,
  showCutLines = true,
  disabledPieces,
  hoveredId,
  onHover,
  onTogglePiece,
}) {
  const uid = useId();
  const defId = `fill${uid}`;
  const hatchId = `hatch${uid}`;
  const { width, height } = model.viewBox;
  const fill = fillFor(pattern, defId);

  return (
    <svg
      className="scooter-canvas"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${model.name} vázlat`}
      onMouseLeave={() => onHover?.(null)}
    >
      <defs>
        <PatternDefs pattern={pattern} defId={defId} transform={transform} viewBox={model.viewBox} />
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
                fill={disabled ? `url(#${hatchId})` : fill}
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
    </svg>
  );
}

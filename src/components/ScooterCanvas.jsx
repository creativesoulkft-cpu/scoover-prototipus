/**
 * Roller-vázlat megjelenítő.
 *
 * Kap egy modellt (darabok SVG path-jai) és RÉTEGEKET (src/design/layers.js):
 * minden réteg egy minta + transzformáció, és a `layerOfPiece` mondja meg,
 * melyik darab melyik réteget viseli. Egy réteg darabjai ugyanabból a
 * userSpaceOnUse mintából kapják a kitöltést, ezért a minta a darabhatárokon
 * folytonos – mintha egy nagy fóliaívből vágták volna ki. Két különböző réteg
 * (design-keverés: zónánként más minta) között a folytonosság szándékosan
 * megszakad, hiszen fizikailag is külön fóliadarabok.
 *
 * Csempézett mintáknál a darab méretosztálya (large/medium/small) szerint
 * három léptékű def készül (patternScale), hogy a mintázat a kis darabokon
 * (villaborítás) se tűnjön aránytalanul nagynak.
 *
 * `targetPieceIds`: a Stílus kártyán épp szerkesztett zóna darabjai – ezeket
 * finoman kiemeljük, hogy a vevő lássa, hova megy a választása.
 * `gesture`: a képen való közvetlen mozgatás (húzás/csippentés/forgatás)
 * eseménykezelői és állapota – src/hooks/usePatternGesture.js.
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

/* Fólia NÉLKÜL hagyott darab: a roller csupasz, fekete műanyaga/fémje –
   nem sraffozás, nem "hiányzó" jelölés, hanem az, ami a valóságban látszik,
   ha ott nincs fólia. Így a vevő azonnal látja, mit rendel és mit nem. */
const BARE_FILL = '#111418';

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
      return (
        <path key={i} d={d.d} fill={d.fill ? DECOR_COLORS[d.fill] ?? d.fill : 'none'}
          stroke={d.stroke ? DECOR_COLORS[d.stroke] ?? d.stroke : undefined}
          strokeWidth={d.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
    }
    return null;
  });
}

const isTiled = (pattern) => pattern?.type === 'image-tile' || pattern?.type === 'tile';

export default function ScooterCanvas({
  model,
  layers,              // [{ key, pattern, transform, patternScale }]
  layerOfPiece,        // { [pieceId]: layerKey }
  sizeAwareTiling = true,
  exploded = false,
  showCutLines = true,
  disabledPieces,
  hoveredId,
  onHover,
  onTogglePiece,
  labels = [],         // [{ id, enabled, text, pieceId, scale, dx, dy, rotate, font, color }]
  onLabelDrag,         // (id, { dx, dy }) => void
  targetPieceIds = null, // Set<pieceId> | null – a szerkesztett zóna kiemelése
  gesture = null,      // { handlers, active } – közvetlen mozgatás a képen
}) {
  const uid = useId();
  const { width, height } = model.viewBox;

  const defIdFor = (layerIdx, size, layer) => {
    const s = isTiled(layer?.pattern) && sizeAwareTiling && SIZE_CLASSES.includes(size) ? size : 'large';
    return `fill${uid}-${layerIdx}-${s}`;
  };
  const layerIndex = Object.fromEntries(layers.map((l, i) => [l.key, i]));

  return (
    <svg
      className={`scooter-canvas${gesture?.active ? ' gesturing' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${model.name} vázlat`}
      onMouseLeave={() => onHover?.(null)}
      style={gesture ? { touchAction: 'none' } : undefined}
      {...(gesture?.handlers ?? {})}
    >
      <defs>
        {layers.map((layer, li) => {
          const classes = isTiled(layer.pattern) && sizeAwareTiling ? SIZE_CLASSES : ['large'];
          return classes.map((size) => (
            <PatternDefs
              key={`${layer.key}-${size}`}
              pattern={layer.pattern}
              defId={`fill${uid}-${li}-${size}`}
              transform={layer.transform}
              viewBox={model.viewBox}
              scale={sizeAwareTiling ? (layer.patternScale?.[size] ?? 1) : 1}
            />
          ));
        })}
      </defs>

      <g className="decor"><Decor items={model.decor.filter((d) => !d.over)} /></g>

      <g className="pieces">
        {model.pieces.map((piece) => {
          const disabled = disabledPieces?.has(piece.id);
          const hovered = hoveredId === piece.id;
          const targeted = targetPieceIds?.has(piece.id);
          const layer = layers[layerIndex[layerOfPiece[piece.id]] ?? 0];
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
                data-piece={piece.id}
                fill={disabled || !layer ? BARE_FILL : fillFor(layer.pattern, defIdFor(layerIndex[layer.key], piece.size, layer))}
                stroke={hovered ? '#ffffff' : targeted ? '#19e6c1' : showCutLines ? 'rgba(255,255,255,0.35)' : 'none'}
                strokeWidth={hovered ? 2.5 : targeted ? 2 : 1}
                strokeDasharray={targeted && !hovered ? '6 4' : undefined}
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

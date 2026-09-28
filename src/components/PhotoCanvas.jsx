/**
 * Fotós nézet – a minta rávetítése az eredeti termékfotóra.
 *
 * Rétegek (alulról felfelé):
 *   1. a termékfotó változatlanul;
 *   2. a fóliázható felületek maszkjai (a fotón körberajzolt SVG path-ok),
 *      a darab RÉTEGÉNEK mintájával kitöltve (src/design/layers.js) – ugyanaz a
 *      userSpaceOnUse-elv, mint a vázlaton: egy rétegen belül folytonos;
 *   3. "árnyalás": a fotó szürkeárnyalatos, gammával kiemelt másolata a maszkokra
 *      vágva, overlay/soft-light keveréssel → a fény-árnyék, csillanás, domborulat
 *      átüt a mintán, így az "rásimul" a felületre;
 *   4. feliratréteg (LabelLayer), ugyanúgy, mint a vázlaton.
 *
 * A darabok `patternTransform` mezője (opcionális) a felület dőlése szerinti
 * ferdítést ad az adott darab mintájához (perspektíva-közelítés).
 */
import { useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';
import LabelLayer from './LabelLayer.jsx';
import { assetUrl } from '../utils/assets.js';

const SIZE_CLASSES = ['large', 'medium', 'small'];
const isTiled = (pattern) => pattern?.type === 'image-tile' || pattern?.type === 'tile';

export default function PhotoCanvas({
  view,               // model.photoView: { image, viewBox, pieces[], shading }
  modelName,
  layers,
  layerOfPiece,
  sizeAwareTiling = true,
  showCutLines = false,
  disabledPieces,
  hoveredId,
  onHover,
  onTogglePiece,
  labels = [],
  onLabelDrag,
  targetPieceIds = null,
  gesture = null,
}) {
  const uid = useId();
  const { width, height } = view.viewBox;
  const image = assetUrl(view.image);
  const shading = { blend: 'overlay', gamma: 0.55, opacity: 0.95, saturate: 0, ...(view.shading ?? {}) };

  const layerIndex = Object.fromEntries(layers.map((l, i) => [l.key, i]));
  const sizeOf = (layer, piece) =>
    (isTiled(layer.pattern) && sizeAwareTiling && SIZE_CLASSES.includes(piece.size) ? piece.size : 'large');
  // Darabok egyedi ferdítéssel külön def-et kapnak; a többi rétegenként + méretosztályonként közöset.
  const defIdFor = (layer, piece) =>
    (piece.patternTransform ? `fill${uid}-${layerIndex[layer.key]}-${piece.id}` : `fill${uid}-${layerIndex[layer.key]}-${sizeOf(layer, piece)}`);

  const activePieces = view.pieces.filter((p) => !disabledPieces?.has(p.id));
  const clipId = `clip${uid}`;
  const filterId = `shade${uid}`;

  return (
    <svg
      className={`scooter-canvas photo${gesture?.active ? ' gesturing' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${modelName} fotó`}
      onMouseLeave={() => onHover?.(null)}
      style={gesture ? { touchAction: 'none' } : undefined}
      {...(gesture?.handlers ?? {})}
    >
      <defs>
        {layers.map((layer, li) => {
          const classes = isTiled(layer.pattern) && sizeAwareTiling ? SIZE_CLASSES : ['large'];
          const skewed = view.pieces.filter((p) => p.patternTransform && layerOfPiece[p.id] === layer.key);
          return [
            ...classes.map((size) => (
              <PatternDefs key={`${layer.key}-${size}`} pattern={layer.pattern} defId={`fill${uid}-${li}-${size}`}
                transform={layer.transform} viewBox={view.viewBox}
                scale={sizeAwareTiling ? (layer.patternScale?.[size] ?? 1) : 1} />
            )),
            ...skewed.map((piece) => (
              <PatternDefs key={`${layer.key}-${piece.id}`} pattern={layer.pattern} defId={`fill${uid}-${li}-${piece.id}`}
                transform={{ ...layer.transform, pre: piece.patternTransform }} viewBox={view.viewBox}
                scale={sizeAwareTiling ? (layer.patternScale?.[sizeOf(layer, piece)] ?? 1) : 1} />
            )),
          ];
        })}
        {/* az összes aktív darab uniója – erre vágjuk az árnyalás-réteget */}
        <clipPath id={clipId}>
          {activePieces.map((p) => <path key={p.id} d={p.d} fillRule="evenodd" />)}
        </clipPath>
        {/* szürkeárnyalat + gamma: a sötét fényezés középszürkévé emelve, hogy az
            overlay ne sötétítse be a mintát, csak a fény-árnyékot vigye át */}
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values={shading.saturate} />
          <feComponentTransfer>
            <feFuncR type="gamma" exponent={shading.gamma} />
            <feFuncG type="gamma" exponent={shading.gamma} />
            <feFuncB type="gamma" exponent={shading.gamma} />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* 1. termékfotó */}
      <image href={image} width={width} height={height} preserveAspectRatio="none" />

      {/* 2. minta a maszkokban */}
      <g className="pieces">
        {activePieces.map((piece) => {
          const layer = layers[layerIndex[layerOfPiece[piece.id]] ?? 0];
          return layer ? (
            <path key={piece.id} d={piece.d} fill={fillFor(layer.pattern, defIdFor(layer, piece))}
              fillRule="evenodd" stroke="none" />
          ) : null;
        })}
      </g>

      {/* 3. árnyalás a fotóból */}
      <g style={{ mixBlendMode: shading.blend, opacity: shading.opacity }}>
        <image href={image} width={width} height={height} preserveAspectRatio="none"
          clipPath={`url(#${clipId})`} filter={`url(#${filterId})`} />
      </g>

      {/* interakció + vágóvonal/kiemelés: átlátszó path-ok legfelül. A fólia
          nélkül hagyott darabon NINCS sötétítés: a fotó eredeti, csupasz
          (fekete) felülete látszik – pont az, amit a vevő a valóságban kapna. */}
      <g className="hit">
        {view.pieces.map((piece) => {
          const disabled = disabledPieces?.has(piece.id);
          const hovered = hoveredId === piece.id;
          const targeted = targetPieceIds?.has(piece.id);
          return (
            <path key={piece.id} d={piece.d} fillRule="evenodd"
              data-piece={piece.id}
              fill="transparent"
              stroke={hovered ? '#ffffff' : targeted ? '#19e6c1' : showCutLines ? 'rgba(255,255,255,0.5)' : 'none'}
              strokeWidth={hovered ? 2.5 : targeted ? 2 : 1}
              strokeDasharray={targeted && !hovered ? '6 4' : undefined}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover?.(piece.id)}
              onClick={() => onTogglePiece?.(piece.id)}>
              <title>{piece.name}{disabled ? ' (fólia nélkül)' : ''}</title>
            </path>
          );
        })}
      </g>

      {/* 4. feliratok – legfelül, hogy húzhatók legyenek */}
      {labels.filter((l) => l.enabled && !disabledPieces?.has(l.pieceId)).map((l) => {
        const piece = view.pieces.find((p) => p.id === l.pieceId);
        return piece ? (
          <LabelLayer key={l.id} piece={piece} label={l} font={l.font} color={l.color} exploded={false}
            onDrag={onLabelDrag ? (d) => onLabelDrag(l.id, d) : undefined} />
        ) : null;
      })}
    </svg>
  );
}

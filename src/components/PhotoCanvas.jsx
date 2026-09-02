/**
 * Fotós nézet – a minta rávetítése az eredeti termékfotóra.
 *
 * Rétegek (alulról felfelé):
 *   1. a termékfotó változatlanul;
 *   2. a fóliázható felületek maszkjai (a fotón körberajzolt SVG path-ok),
 *      a közös mintával kitöltve – ugyanaz a userSpaceOnUse-elv, mint a vázlaton;
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

export default function PhotoCanvas({
  view,               // model.photoView: { image, viewBox, pieces[], shading }
  modelName,
  pattern,
  transform,
  patternScale,
  sizeAwareTiling = true,
  showCutLines = false,
  disabledPieces,
  hoveredId,
  onHover,
  onTogglePiece,
  label,
}) {
  const uid = useId();
  const { width, height } = view.viewBox;
  const image = assetUrl(view.image);
  const shading = { blend: 'overlay', gamma: 0.55, opacity: 0.95, saturate: 0, ...(view.shading ?? {}) };

  const tiled = pattern?.type === 'image-tile' || pattern?.type === 'tile';
  const classes = tiled && sizeAwareTiling ? SIZE_CLASSES : ['large'];
  const sizeOf = (piece) => (classes.includes(piece.size) ? piece.size : 'large');

  // Darabok egyedi ferdítéssel külön def-et kapnak; a többi méretosztályonként közöset.
  const defIdFor = (piece) =>
    piece.patternTransform ? `fill${uid}-${piece.id}` : `fill${uid}-${sizeOf(piece)}`;
  const withTransform = (piece) => ({
    ...transform,
    // a darab saját ferdítése a felhasználói transzformáció ELÉ kerül
    pre: piece.patternTransform,
  });

  const activePieces = view.pieces.filter((p) => !disabledPieces?.has(p.id));
  const labelPiece = label?.enabled ? view.pieces.find((p) => p.id === label.pieceId) : null;
  const clipId = `clip${uid}`;
  const filterId = `shade${uid}`;

  return (
    <svg
      className="scooter-canvas photo"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${modelName} fotó`}
      onMouseLeave={() => onHover?.(null)}
    >
      <defs>
        {classes.map((size) => (
          <PatternDefs key={size} pattern={pattern} defId={`fill${uid}-${size}`}
            transform={transform} viewBox={view.viewBox}
            scale={sizeAwareTiling ? (patternScale?.[size] ?? 1) : 1} />
        ))}
        {view.pieces.filter((p) => p.patternTransform).map((piece) => (
          <PatternDefs key={piece.id} pattern={pattern} defId={defIdFor(piece)}
            transform={withTransform(piece)} viewBox={view.viewBox}
            scale={sizeAwareTiling ? (patternScale?.[sizeOf(piece)] ?? 1) : 1} />
        ))}
        {/* az összes aktív darab uniója – erre vágjuk az árnyalás-réteget */}
        <clipPath id={clipId}>
          {activePieces.map((p) => <path key={p.id} d={p.d} />)}
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
        {activePieces.map((piece) => (
          <path key={piece.id} d={piece.d} fill={fillFor(pattern, defIdFor(piece))}
            stroke="none" />
        ))}
      </g>

      {/* 3. árnyalás a fotóból */}
      <g style={{ mixBlendMode: shading.blend, opacity: shading.opacity }}>
        <image href={image} width={width} height={height} preserveAspectRatio="none"
          clipPath={`url(#${clipId})`} filter={`url(#${filterId})`} />
      </g>

      {/* 4. felirat */}
      {labelPiece && !disabledPieces?.has(labelPiece.id) && (
        <LabelLayer piece={labelPiece} text={label.text} font={label.font} color={label.color} exploded={false} />
      )}

      {/* interakció + vágóvonal/kiemelés: átlátszó path-ok legfelül */}
      <g className="hit">
        {view.pieces.map((piece) => {
          const disabled = disabledPieces?.has(piece.id);
          const hovered = hoveredId === piece.id;
          return (
            <path key={piece.id} d={piece.d}
              fill={disabled ? 'rgba(0,0,0,0.35)' : 'transparent'}
              stroke={hovered ? '#ffffff' : showCutLines ? 'rgba(255,255,255,0.5)' : 'none'}
              strokeWidth={hovered ? 2.5 : 1} vectorEffect="non-scaling-stroke"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover?.(piece.id)}
              onClick={() => onTogglePiece?.(piece.id)}>
              <title>{piece.name}{disabled ? ' (fólia nélkül)' : ''}</title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}

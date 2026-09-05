/**
 * Taposófelület tervezése – a fő roller-előnézet HELYÉN, kizárólag a
 * taposófelület (deck-top) darabjának nagyított, önálló nézete. Saját
 * minta/kép/felirat, teljesen független a roller többi részének mintájától.
 *
 * A darab valódi (modell-koordinátás) `d`-jét méri le (getBBox), és ehhez
 * illesztett, szűkre vágott, saját "helyi" koordináta-rendszert épít (nem a
 * teljes modell viewBox-át használja) – így a minta nagyítása/eltolása
 * mindig a taposófelülethez, nem az egész rollerhez viszonyítva értelmes.
 */
import { useLayoutEffect, useRef, useState, useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';
import LabelLayer from './LabelLayer.jsx';
import { formatHuf } from '../utils/format.js';

export default function FootboardEditor({
  piece, pattern, transform, label, onLabelDrag, price, includeFootboard, onIncludeFootboardChange, onBack,
}) {
  const uid = useId();
  const defId = `fbfill${uid}`;
  const measureRef = useRef(null);
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    if (measureRef.current) setBox(measureRef.current.getBBox());
  }, [piece?.d]);

  if (!piece) {
    return (
      <div className="footboard-editor">
        <div className="footboard-editor-head">
          <strong>Taposófelület tervezése</strong>
          <button type="button" className="btn" onClick={onBack}>← Vissza a teljes rollerhez</button>
        </div>
        <p className="muted">Ehhez a modellhez nincs elérhető taposófelület-darab.</p>
      </div>
    );
  }

  const pad = box ? Math.max(box.width, box.height) * 0.12 : 0;
  const localViewBox = { width: (box?.width ?? 1) + 2 * pad, height: (box?.height ?? 1) + 2 * pad };
  const offsetX = box ? -box.x + pad : 0;
  const offsetY = box ? -box.y + pad : 0;

  return (
    <div className="footboard-editor">
      <div className="footboard-editor-head">
        <div>
          <strong>Taposófelület tervezése</strong>
          <p className="muted small">Külön, kültéri csúszásgátló anyagból – saját minta, kép és felirat, a roller többi részétől függetlenül.</p>
        </div>
        <button type="button" className="btn" onClick={onBack}>← Vissza a teljes rollerhez</button>
      </div>

      <svg
        className="scooter-canvas footboard-canvas"
        viewBox={`0 0 ${localViewBox.width} ${localViewBox.height}`}
        role="img"
        aria-label="Taposófelület nagyított nézete"
      >
        <defs>
          <PatternDefs pattern={pattern} defId={defId} transform={transform} viewBox={localViewBox} scale={1} />
        </defs>
        <g transform={`translate(${offsetX} ${offsetY})`}>
          <path
            ref={measureRef}
            d={piece.d}
            fill={fillFor(pattern, defId)}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {box && label?.enabled && (
            <LabelLayer piece={piece} label={label} font={label.font} color={label.color} exploded={false} onDrag={onLabelDrag} />
          )}
        </g>
      </svg>

      <div className="footboard-editor-foot">
        <label className="check">
          <input type="checkbox" checked={includeFootboard} onChange={(e) => onIncludeFootboardChange(e.target.checked)} />
          Taposófelület extra hozzáadása a rendeléshez
        </label>
        <strong className="footboard-price">+{formatHuf(price)}</strong>
      </div>
    </div>
  );
}

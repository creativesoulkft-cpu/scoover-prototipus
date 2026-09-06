/**
 * Taposófelület tervezése – a fő roller-előnézet HELYÉN, kizárólag a
 * taposófelület önálló, FELÜLNÉZETI szerkesztője. Saját minta/kép/felirat,
 * teljesen független a roller többi részének mintájától.
 *
 * FELÜLNÉZET, NEM a vázlat/fotó vetülete: az oldalnézeti modellben a dekk
 * teteje egy perspektivikusan megdöntött, vékony sáv – azon tervezni nem
 * lehet (torzít, apró, és nem mutatja a valós arányokat). Itt a síkba
 * terített, valós arányú alak (644 × 156 mm ≈ 4:1) jelenik meg, a
 * rendelkezésre álló területet kitöltve – lásd src/data/footboardFlat.js
 * (ott cserélhető a valódi vágókontúrra).
 *
 * A koordináta-rendszer 1 egység = 1 mm, így a minta léptéke fizikailag
 * értelmezhető.
 */
import { useId } from 'react';
import PatternDefs, { fillFor } from './PatternDefs.jsx';
import LabelLayer from './LabelLayer.jsx';
import { getFootboardFlat } from '../data/footboardFlat.js';
import { formatHuf } from '../utils/format.js';

export default function FootboardEditor({
  model, piece, pattern, transform, label, onLabelDrag, price, onBack,
}) {
  const uid = useId();
  const defId = `fbfill${uid}`;
  const flat = getFootboardFlat(model);

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

  // Minimális levegő a kontúr körül (csak hogy a vágóvonal ne érjen a vászon
  // széléhez) – a dekk így a rendelkezésre álló terület nagy részét kitölti.
  const pad = flat.heightMm * 0.06;
  const viewBox = { width: flat.widthMm + 2 * pad, height: flat.heightMm + 2 * pad };

  return (
    <div className="footboard-editor">
      <div className="footboard-editor-head">
        <div>
          <strong>Taposófelület tervezése</strong>
          <p className="muted small">Külön, kültéri csúszásgátló anyagból – saját minta, kép és felirat, a roller többi részétől függetlenül.</p>
        </div>
      </div>

      <p className="footboard-viewnote small">
        Felülnézet — így fogod látni, amikor ráállsz.
        <span className="muted"> · valós arány, {flat.widthMm} × {flat.heightMm} mm</span>
      </p>

      <svg
        className="scooter-canvas footboard-canvas"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Taposófelület felülnézeti, valós arányú szerkesztő nézete"
      >
        <defs>
          <PatternDefs pattern={pattern} defId={defId} transform={transform} viewBox={viewBox} scale={1} />
        </defs>
        <g transform={`translate(${pad} ${pad})`}>
          <path
            d={flat.piece.d}
            fill={fillFor(pattern, defId)}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {label?.enabled && (
            <LabelLayer piece={flat.piece} label={label} font={label.font} color={label.color}
              exploded={false} onDrag={onLabelDrag} />
          )}
        </g>
      </svg>

      <div className="footboard-editor-foot">
        <span className="muted small">Ez a felület a rendelésed része: <strong className="footboard-price">+{formatHuf(price)}</strong></span>
        <button type="button" className="btn" onClick={onBack}>← Vissza a teljes rollerhez</button>
      </div>
    </div>
  );
}

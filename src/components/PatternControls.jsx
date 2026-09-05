/**
 * Minta-illesztés: méret, forgatás, eltolás – ugyanaz a transzformáció megy
 * minden darabra, ezért a folytonosság megmarad. Plusz nézeti kapcsolók.
 */
import Slider from './Slider.jsx';

const DEFAULT_TRANSFORM = { scale: 1, rotate: 0, dx: 0, dy: 0 };
export { DEFAULT_TRANSFORM };

export default function PatternControls({
  transform, onTransformChange, exploded, onExplodedChange, showCutLines, onShowCutLinesChange, isImage,
  sizeAwareTiling, onSizeAwareTilingChange, isTiled,
}) {
  const set = (key) => (v) => onTransformChange({ ...transform, [key]: v });
  return (
    <div className="controls">
      <Slider label="Méret" value={transform.scale} min={0.25} max={3} step={0.05}
        onChange={set('scale')} format={(v) => `${v.toFixed(2)}×`} />
      <Slider label="Forgatás" value={transform.rotate} min={0} max={360} step={1}
        onChange={set('rotate')} format={(v) => `${v}°`} />
      <Slider label="Eltolás X" value={transform.dx} min={-500} max={500} step={1} onChange={set('dx')} />
      <Slider label="Eltolás Y" value={transform.dy} min={-300} max={300} step={1} onChange={set('dy')} />
      {isImage && <p className="muted small">Tipp: a saját kép a teljes rollert fedi le; a mérettel és eltolással pozicionálhatod.</p>}
      <div className="control-row">
        <button type="button" className="link" onClick={() => onTransformChange(DEFAULT_TRANSFORM)}>Alaphelyzet</button>
      </div>
      {isTiled && (
        <label className="check" title="A kis darabokon (villaborítás) kisebb léptékben ismétlődik a minta, mint a dekken">
          <input type="checkbox" checked={sizeAwareTiling} onChange={(e) => onSizeAwareTilingChange(e.target.checked)} />
          Darabméret-arányos csempézés
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={exploded} onChange={(e) => onExplodedChange(e.target.checked)} />
        Darabok szétnyitása (vágott darabok nézete)
      </label>
      <label className="check">
        <input type="checkbox" checked={showCutLines} onChange={(e) => onShowCutLinesChange(e.target.checked)} />
        Vágóvonalak mutatása
      </label>
    </div>
  );
}

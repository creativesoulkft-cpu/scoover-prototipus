/**
 * Finomhangolás – a minta igazítása, KÖZVETLENÜL a galéria alatt, mindig
 * látható chipsorral. Ez váltja a korábbi, összecsukott "Minta illesztése és
 * nézet" lenyílót, amit a vevők nem találtak meg.
 *
 *   [✋ Igazítás a képen]  [Méret]  [Forgatás]  [Eltolás]  [Nézet]   Alaphelyzet
 *
 * Egy chip koppintásra kinyitja a saját csúszkáját közvetlenül a sor alatt.
 * Az "Igazítás a képen" kapcsoló a közvetlen mozgatást (húzás, csippentés,
 * forgatás) engedélyezi a vásznon – mintaválasztás után a szülő automatikusan
 * bekapcsolja és kinyitja a Méret csúszkát, hogy a lehetőség magától
 * "felugorjon" (lásd App.jsx).
 */
import Slider from './Slider.jsx';
import { DEFAULT_TRANSFORM } from '../design/schema.js';

const PANELS = [
  { id: 'scale', label: 'Méret' },
  { id: 'rotate', label: 'Forgatás' },
  { id: 'offset', label: 'Eltolás' },
  { id: 'view', label: 'Nézet' },
];

export default function FineTuneBar({
  transform, onTransformChange,
  gestureMode, onGestureModeChange,
  openPanel, onOpenPanelChange,
  isTiled, sizeAwareTiling, onSizeAwareTilingChange,
  exploded, onExplodedChange, showCutLines, onShowCutLinesChange,
  canExplode = true,
  targetName,
}) {
  const set = (key) => (v) => onTransformChange({ [key]: v });
  const toggle = (id) => onOpenPanelChange(openPanel === id ? null : id);
  const isDefault = ['scale', 'rotate', 'dx', 'dy'].every((k) => transform[k] === DEFAULT_TRANSFORM[k]);

  return (
    <div className="finetune">
      <div className="finetune-head">
        <strong className="finetune-title">Igazítás{targetName ? <span className="muted"> · {targetName}</span> : null}</strong>
        <button type="button" className="link finetune-reset" disabled={isDefault}
          onClick={() => onTransformChange({ ...DEFAULT_TRANSFORM })}>Alaphelyzet</button>
      </div>
      <div className="chip-row finetune-chips">
        <button type="button" className={`chip chip-gesture${gestureMode ? ' active' : ''}`}
          aria-pressed={gestureMode} onClick={() => onGestureModeChange(!gestureMode)}
          title="Húzd a mintát a képen, csippentsd a mérethez, két ujjal forgasd">
          ✋ Igazítás a képen
        </button>
        {PANELS.map((p) => (
          <button key={p.id} type="button" className={`chip${openPanel === p.id ? ' active' : ''}`}
            aria-expanded={openPanel === p.id} onClick={() => toggle(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {openPanel === 'scale' && (
        <div className="finetune-panel">
          <Slider label="Méret" value={transform.scale} min={0.25} max={3} step={0.05}
            onChange={set('scale')} format={(v) => `${v.toFixed(2)}×`} />
        </div>
      )}
      {openPanel === 'rotate' && (
        <div className="finetune-panel">
          <Slider label="Forgatás" value={transform.rotate} min={0} max={360} step={1}
            onChange={set('rotate')} format={(v) => `${v}°`} />
        </div>
      )}
      {openPanel === 'offset' && (
        <div className="finetune-panel">
          <Slider label="Eltolás X" value={transform.dx} min={-500} max={500} step={1} onChange={set('dx')} />
          <Slider label="Eltolás Y" value={transform.dy} min={-300} max={300} step={1} onChange={set('dy')} />
        </div>
      )}
      {openPanel === 'view' && (
        <div className="finetune-panel controls">
          {isTiled && (
            <label className="check" title="A kis darabokon (villaborítás) kisebb léptékben ismétlődik a minta, mint a dekken">
              <input type="checkbox" checked={sizeAwareTiling} onChange={(e) => onSizeAwareTilingChange(e.target.checked)} />
              Darabméret-arányos csempézés
            </label>
          )}
          {canExplode && (
            <label className="check">
              <input type="checkbox" checked={exploded} onChange={(e) => onExplodedChange(e.target.checked)} />
              Darabok szétnyitása (vágott darabok nézete)
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={showCutLines} onChange={(e) => onShowCutLinesChange(e.target.checked)} />
            Vágóvonalak mutatása
          </label>
        </div>
      )}
    </div>
  );
}

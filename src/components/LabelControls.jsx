/**
 * Felirat-beállítások: tetszőleges számú felirat, mindegyik külön
 * szöveggel, céldarabbal, mérettel, eltolással, forgatással és színnel.
 * A betűtípust a minta kategóriája adja (categories.js → labelFont).
 */
const COLOR_MODES = [
  { id: 'auto', name: 'Auto' },
  { id: 'white', name: 'Fehér' },
  { id: 'black', name: 'Fekete' },
];

function Slider({ label, value, min, max, step, onChange, format }) {
  return (
    <label className="slider">
      <span>{label}<em>{format ? format(value) : value}</em></span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function LabelCard({ label, index, pieces, autoColor, onChange, onRemove }) {
  const set = (patch) => onChange(label.id, patch);
  return (
    <div className={`label-card${label.enabled ? '' : ' off'}`}>
      <div className="label-card-head">
        <label className="check">
          <input type="checkbox" checked={label.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <strong>{index + 1}. felirat</strong>
        </label>
        <button type="button" className="link danger" onClick={() => onRemove(label.id)} title="Felirat törlése">Törlés</button>
      </div>
      <label className="field">
        <span>Szöveg</span>
        <input type="text" value={label.text} maxLength={24} placeholder="SCOOVER"
          onChange={(e) => set({ text: e.target.value })} />
      </label>
      <label className="field">
        <span>Darab</span>
        <select value={label.pieceId ?? ''} onChange={(e) => set({ pieceId: e.target.value, dx: 0, dy: 0 })}>
          {pieces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Slider label="Méret" value={label.scale} min={0.3} max={2} step={0.05} onChange={(v) => set({ scale: v })}
        format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Eltolás X" value={label.dx} min={-300} max={300} step={1} onChange={(v) => set({ dx: v })} />
      <Slider label="Eltolás Y" value={label.dy} min={-150} max={150} step={1} onChange={(v) => set({ dy: v })} />
      <Slider label="Forgatás" value={label.rotate} min={-90} max={90} step={1} onChange={(v) => set({ rotate: v })}
        format={(v) => `${v}°`} />
      <div className="chip-row">
        {COLOR_MODES.map((m) => (
          <button key={m.id} type="button" className={`chip${label.colorMode === m.id ? ' active' : ''}`}
            onClick={() => set({ colorMode: m.id })}>
            {m.id === 'auto' && <span className="swatch" style={{ background: autoColor }} />}
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LabelControls({ labels, onChange, onAdd, onRemove, pieces, font, autoColor }) {
  return (
    <div className="controls">
      <p className="muted small">
        Betűtípus: <strong style={{ fontFamily: font.family, fontWeight: font.weight }}>{font.family}</strong>
        {' '}(a minta kategóriája adja) · a feliratot a vásznon egérrel is húzhatod
      </p>
      {labels.map((l, i) => (
        <LabelCard key={l.id} label={l} index={i} pieces={pieces} autoColor={autoColor} onChange={onChange} onRemove={onRemove} />
      ))}
      <div className="control-row">
        <button type="button" className="btn" onClick={onAdd}>+ Új felirat</button>
      </div>
    </div>
  );
}

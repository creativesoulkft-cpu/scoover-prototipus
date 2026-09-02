/**
 * Felirat-beállítások: ki/be, szöveg, céldarab. A betűtípust a minta
 * kategóriája adja (categories.js → labelFont), a színt a háttér világossága.
 */
export default function LabelControls({ label, onChange, pieces, font, color }) {
  const set = (patch) => onChange({ ...label, ...patch });
  return (
    <div className="controls">
      <label className="check">
        <input type="checkbox" checked={label.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        Felirat megjelenítése
      </label>
      <label className="field">
        <span>Szöveg</span>
        <input type="text" value={label.text} maxLength={24} placeholder="SCOOVER"
          onChange={(e) => set({ text: e.target.value })} />
      </label>
      <label className="field">
        <span>Darab</span>
        <select value={label.pieceId ?? ''} onChange={(e) => set({ pieceId: e.target.value })}>
          {pieces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <p className="muted small">
        Betűtípus: <strong style={{ fontFamily: font.family, fontWeight: font.weight }}>{font.family}</strong>
        {' '}· szín: <span className="swatch inline" style={{ background: color }} /> {color === '#ffffff' ? 'fehér' : 'fekete'} (automatikus a háttér alapján)
      </p>
    </div>
  );
}

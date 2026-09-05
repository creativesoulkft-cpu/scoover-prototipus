/**
 * Betűtípus- és színválasztó egy felirathoz. Közös a fő roller feliratkártyáin
 * (LabelControls) és a taposó-szerkesztő önálló feliratán (FootboardEditor) –
 * ugyanaz a viselkedés kell mindkét helyen.
 */
import { FONT_OPTIONS } from '../data/fonts.js';

const COLOR_MODES = [
  { id: 'auto', name: 'Auto' },
  { id: 'white', name: 'Fehér' },
  { id: 'black', name: 'Fekete' },
];

export default function FontColorPicker({ label, categoryFont, autoColor, onChange }) {
  return (
    <>
      <label className="field">
        <span>Betűtípus</span>
        <select value={label.fontId ?? 'auto'} onChange={(e) => onChange({ fontId: e.target.value })}>
          <option value="auto">Kategória szerint ({categoryFont.family})</option>
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.family }}>{f.name}</option>
          ))}
        </select>
      </label>
      <div className="chip-row">
        {COLOR_MODES.map((m) => (
          <button key={m.id} type="button" className={`chip${label.colorMode === m.id ? ' active' : ''}`}
            onClick={() => onChange({ colorMode: m.id })}>
            {m.id === 'auto' && <span className="swatch" style={{ background: autoColor }} />}
            {m.name}
          </button>
        ))}
        <label className={`chip color-chip${label.colorMode === 'custom' ? ' active' : ''}`} title="Egyedi szín">
          <input
            type="color"
            value={label.customColor ?? '#ff6a1a'}
            onChange={(e) => onChange({ colorMode: 'custom', customColor: e.target.value })}
          />
          Egyedi szín
        </label>
      </div>
    </>
  );
}

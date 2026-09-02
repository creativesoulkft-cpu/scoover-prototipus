/**
 * Rollermodell-választó. Csak a regiszter metaadatait használja – a geometria
 * a választás után töltődik be (useScooterModel).
 */
import { MODEL_REGISTRY } from '../data/models/index.js';

export default function ModelSelector({ value, onChange }) {
  return (
    <label className="field">
      <span>Rollermodell</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {MODEL_REGISTRY.map((m) => (
          <option key={m.id} value={m.id}>{m.brand} {m.name.replace(`${m.brand} `, '')}</option>
        ))}
      </select>
    </label>
  );
}

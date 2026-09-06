/**
 * "A rollered" – modell + évjárat választás, és segítség annak, aki nem tudja,
 * melyik évjárata van. Csak a regiszter metaadatait használja – a geometria a
 * választás után töltődik be (useScooterModel).
 */
import { useState } from 'react';
import { MODEL_REGISTRY, getModelMeta } from '../data/models/index.js';

export default function ModelSection({ modelId, onModelChange, year, onYearChange }) {
  const [yearHelp, setYearHelp] = useState(false);
  const meta = getModelMeta(modelId);
  const years = meta?.years ?? [];

  return (
    <div className="controls">
      <label className="field">
        <span>Modell</span>
        <select value={modelId} onChange={(e) => onModelChange(e.target.value)}>
          {MODEL_REGISTRY.map((m) => (
            <option key={m.id} value={m.id}>{m.brand} {m.name.replace(`${m.brand} `, '')}</option>
          ))}
        </select>
      </label>

      {years.length > 0 && (
        <label className="field">
          <span>Évjárat</span>
          <select value={year ?? ''} onChange={(e) => onYearChange(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      )}

      <button type="button" className="link year-help-toggle" aria-expanded={yearHelp}
        onClick={() => setYearHelp((v) => !v)}>
        {yearHelp ? 'Bezárás' : 'Nem tudod, melyik évjárat?'}
      </button>
      {yearHelp && (
        <div className="year-help">
          <p>
            Az évjárat a roller alvázán vagy a kormányoszlop alján lévő matricán, a
            sorozatszám mellett szerepel; a vásárlási számlán vagy a garanciajegyen
            is megtalálod. Ha bizonytalan vagy, válaszd a legfrissebbet – a fóliát
            a gyártás előtt a megadott adatokkal egyeztetjük.
          </p>
          {/* Hely a későbbi fotónak: hol keresd a matricát. */}
          <div className="year-help-photo" aria-label="Fotó hamarosan: hol találod a sorozatszám-matricát">
            <span className="muted small">Fotó hamarosan: hol találod a sorozatszám-matricát</span>
          </div>
        </div>
      )}
    </div>
  );
}

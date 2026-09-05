/**
 * Mintaválasztó galéria.
 *
 * Három fül a termékszintek szerint (SOLID / PRINT / EGYEDI) – mindegyik alatt
 * egy rövid, Szilárd-adta magyarázó szöveg, hogy a 3 opció közti választás
 * elsőre világos legyen. A PRINT fülön a minták stíluskategóriánként (Cyber,
 * Motocross, …) szekciókba rendezve jelennek meg, sűrűség és színvariáns
 * szerint szűrhetően. A még nem elérhető kategóriák (available: false)
 * "hamarosan" jelzéssel, választhatatlanul látszanak. Az EGYEDI fül a saját
 * kép feltöltését adja (korábban külön "Saját kép" szekció volt – ide került,
 * mert ugyanannak a döntésnek – "mi kerüljön a rollerre" – a harmadik ága).
 * Minden a categories.js / a mintaregiszter adataiból épül fel.
 */
import { useMemo, useState } from 'react';
import {
  PATTERNS, PRODUCT_LINES, PATTERN_CATEGORIES, COLORWAYS, DENSITIES, UPLOAD_PATTERN_ID,
} from '../data/patterns/index.js';
import PatternThumb from './PatternThumb.jsx';
import UploadPanel from './UploadPanel.jsx';

function PatternCard({ pattern, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`pattern-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(pattern.id)}
      aria-pressed={selected}
      title={pattern.name}
    >
      <PatternThumb pattern={pattern} />
      <span className="pattern-name">{pattern.name}</span>
      {pattern.density && (
        <span className={`density-pill ${pattern.density}`}>{DENSITIES[pattern.density].name}</span>
      )}
    </button>
  );
}

function Chip({ active, onClick, children, swatch }) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} onClick={onClick}>
      {swatch && <span className="swatch" style={{ background: swatch }} />}
      {children}
    </button>
  );
}

export default function PatternGallery({ selectedId, onSelect, uploadedPattern, onUpload, onClear, uploadStatus }) {
  const [line, setLine] = useState(selectedId === UPLOAD_PATTERN_ID ? 'custom' : 'print');
  const [density, setDensity] = useState('all');
  const [colorway, setColorway] = useState('all');
  /** Fejlesztői demó minták (categories.js → dev: true). Élesben sosem
   *  látszanak; fejlesztői buildben egy kapcsolóval előhozhatók. */
  const [showDev, setShowDev] = useState(false);
  const devAvailable = import.meta.env.DEV;

  const activeLine = PRODUCT_LINES.find((l) => l.id === line);
  const categories = PATTERN_CATEGORIES.filter((c) => c.line === line && (!c.dev || (devAvailable && showDev)));
  const inLine = PATTERNS.filter((p) => p.line === line);

  // csak a jelenlegi fülön előforduló színvariánsok kerülnek a szűrőbe
  const colorways = useMemo(
    () => [...new Set(inLine.map((p) => p.colorway).filter(Boolean))],
    [inLine],
  );

  const matches = (p) =>
    (density === 'all' || !p.density || p.density === density) &&
    (colorway === 'all' || !p.colorway || p.colorway === colorway);

  return (
    <div className="pattern-gallery">
      <div className="tabs" role="tablist">
        {PRODUCT_LINES.map((l) => (
          <button key={l.id} type="button" role="tab" aria-selected={line === l.id}
            className={`tab${line === l.id ? ' active' : ''}`} onClick={() => setLine(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
      {activeLine && <p className="tier-blurb muted small">{activeLine.description}</p>}

      {line === 'custom' ? (
        <section className="pattern-group">
          <UploadPanel onUpload={onUpload} onClear={onClear} uploadedPattern={uploadedPattern} />
          {uploadStatus?.uploading && <p className="muted small">Kép feltöltése a szerverre…</p>}
          {uploadStatus?.error && <p className="error small">{uploadStatus.error}</p>}
          {uploadedPattern && (
            <div className="pattern-grid">
              <PatternCard pattern={{ ...uploadedPattern, id: UPLOAD_PATTERN_ID }}
                selected={selectedId === UPLOAD_PATTERN_ID} onSelect={onSelect} />
            </div>
          )}
        </section>
      ) : (
        <>
          {line === 'print' && (
            <div className="filters">
              <div className="chip-row">
                <Chip active={density === 'all'} onClick={() => setDensity('all')}>Mind</Chip>
                {Object.entries(DENSITIES).map(([id, d]) => (
                  <Chip key={id} active={density === id} onClick={() => setDensity(id)}>{d.name}</Chip>
                ))}
              </div>
              <div className="chip-row">
                <Chip active={colorway === 'all'} onClick={() => setColorway('all')}>Minden szín</Chip>
                {colorways.map((id) => (
                  <Chip key={id} active={colorway === id} onClick={() => setColorway(id)} swatch={COLORWAYS[id]?.hex}>
                    {COLORWAYS[id]?.name ?? id}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {categories.map((cat) => {
            const items = inLine.filter((p) => p.category === cat.id);
            if (!cat.available) {
              return (
                <section key={cat.id} className="pattern-group soon">
                  <h4>{cat.name} <span className="soon-pill">hamarosan</span></h4>
                  <p className="muted small">{cat.description}</p>
                </section>
              );
            }
            const visible = items.filter(matches);
            if (!items.length) return null;
            return (
              <section key={cat.id} className="pattern-group">
                <h4>{cat.name} <span className="count">{visible.length}</span></h4>
                {cat.keywords?.length > 0 && <p className="muted small keywords">{cat.keywords.join(' · ')}</p>}
                {visible.length ? (
                  <div className="pattern-grid">
                    {visible.map((p) => (
                      <PatternCard key={p.id} pattern={p} selected={p.id === selectedId} onSelect={onSelect} />
                    ))}
                  </div>
                ) : (
                  <p className="muted small">Ebben a kategóriában nincs a szűrőnek megfelelő minta.</p>
                )}
              </section>
            );
          })}

          {devAvailable && line === 'print' && (
            <label className="check dev-toggle" title="Csak fejlesztői buildben látszik – éles buildből teljesen kimarad">
              <input type="checkbox" checked={showDev} onChange={(e) => setShowDev(e.target.checked)} />
              Fejlesztői demó minták mutatása
            </label>
          )}
        </>
      )}
    </div>
  );
}

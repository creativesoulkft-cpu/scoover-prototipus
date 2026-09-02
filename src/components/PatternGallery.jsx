/**
 * Mintaválasztó galéria – kategóriánként csoportosítva, kattintásra választ.
 * A feltöltött kép (ha van) külön kártyaként jelenik meg a lista elején.
 */
import { PATTERNS, PATTERN_CATEGORIES, UPLOAD_PATTERN_ID } from '../data/patterns/index.js';
import PatternThumb from './PatternThumb.jsx';

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
    </button>
  );
}

export default function PatternGallery({ selectedId, onSelect, uploadedPattern }) {
  return (
    <div className="pattern-gallery">
      {uploadedPattern && (
        <section className="pattern-group">
          <h4>Saját kép</h4>
          <div className="pattern-grid">
            <PatternCard
              pattern={{ ...uploadedPattern, id: UPLOAD_PATTERN_ID }}
              selected={selectedId === UPLOAD_PATTERN_ID}
              onSelect={onSelect}
            />
          </div>
        </section>
      )}
      {PATTERN_CATEGORIES.map((cat) => {
        const items = PATTERNS.filter((p) => p.category === cat.id);
        if (!items.length) return null;
        return (
          <section key={cat.id} className="pattern-group">
            <h4>{cat.name}</h4>
            <div className="pattern-grid">
              {items.map((p) => (
                <PatternCard key={p.id} pattern={p} selected={p.id === selectedId} onSelect={onSelect} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

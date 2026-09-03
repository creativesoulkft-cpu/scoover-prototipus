/**
 * Saját kép feltöltése – fájlválasztó + drag&drop. A képet kliens oldalon
 * kicsinyíti, majd `image` típusú mintaobjektumként adja vissza, amit a
 * PatternDefs ugyanúgy renderel, mint a beépített mintákat.
 */
import { useRef, useState } from 'react';
import { prepareUploadedImage } from '../utils/image.js';

export default function UploadPanel({ onUpload, onClear, uploadedPattern }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const img = await prepareUploadedImage(file);
      onUpload({ type: 'image', name: file.name, category: 'upload', ...img }, file);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="upload-panel">
      <div
        className={`dropzone${dragOver ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {busy ? (
          <span>Feldolgozás…</span>
        ) : (
          <>
            <strong>Saját kép feltöltése</strong>
            <span className="muted">Húzd ide, vagy kattints (JPG / PNG / WebP, max. 12 MB)</span>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {uploadedPattern && (
        <div className="upload-info">
          <span className="muted">
            {uploadedPattern.name} · {uploadedPattern.originalWidth}×{uploadedPattern.originalHeight} px
          </span>
          <button type="button" className="link" onClick={onClear}>Eltávolítás</button>
        </div>
      )}
    </div>
  );
}

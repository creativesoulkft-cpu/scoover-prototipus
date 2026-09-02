/**
 * Scoover roller-fólia konfigurátor – alkalmazás-váz.
 *
 * Állapot: kiválasztott modell, kiválasztott minta (beépített vagy feltöltött),
 * minta-transzformáció, nézeti kapcsolók, kikapcsolt darabok.
 * Az adat (modellek, minták) a src/data mappában él; a komponensek csak
 * megjelenítenek.
 */
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_MODEL_ID } from './data/models/index.js';
import { DEFAULT_PATTERN_ID, UPLOAD_PATTERN_ID, getPattern } from './data/patterns/index.js';
import { useScooterModel } from './hooks/useScooterModel.js';
import ScooterCanvas from './components/ScooterCanvas.jsx';
import PatternGallery from './components/PatternGallery.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import ModelSelector from './components/ModelSelector.jsx';
import PatternControls, { DEFAULT_TRANSFORM } from './components/PatternControls.jsx';
import PieceList from './components/PieceList.jsx';

export default function App() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [patternId, setPatternId] = useState(DEFAULT_PATTERN_ID);
  const [uploadedPattern, setUploadedPattern] = useState(null);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [exploded, setExploded] = useState(false);
  const [showCutLines, setShowCutLines] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  /** Modellenként külön tároljuk a kikapcsolt darabokat: { [modelId]: Set<pieceId> } */
  const [disabledByModel, setDisabledByModel] = useState({});

  const { model, loading, error } = useScooterModel(modelId);

  // Az aktív minta: a feltöltött kép, vagy a regiszterből a kiválasztott.
  const pattern = useMemo(
    () => (patternId === UPLOAD_PATTERN_ID ? uploadedPattern : getPattern(patternId)),
    [patternId, uploadedPattern],
  );

  const disabledPieces = disabledByModel[modelId] ?? new Set();

  const togglePiece = useCallback((pieceId) => {
    setDisabledByModel((prev) => {
      const next = new Set(prev[modelId] ?? []);
      next.has(pieceId) ? next.delete(pieceId) : next.add(pieceId);
      return { ...prev, [modelId]: next };
    });
  }, [modelId]);

  function handleUpload(img) {
    setUploadedPattern(img);
    setPatternId(UPLOAD_PATTERN_ID);
    setTransform(DEFAULT_TRANSFORM);
  }
  function handleClearUpload() {
    setUploadedPattern(null);
    if (patternId === UPLOAD_PATTERN_ID) setPatternId(DEFAULT_PATTERN_ID);
  }

  const hoveredPiece = model?.pieces.find((p) => p.id === hoveredId);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">S</span>
          <div>
            <h1>Scoover fólia-konfigurátor</h1>
            <p className="muted">Prototípus · minta-a-darabokra vizuális mag</p>
          </div>
        </div>
        <ModelSelector value={modelId} onChange={setModelId} />
      </header>

      <main className="layout">
        <section className="stage">
          {error && <p className="error">Hiba a modell betöltésekor: {error.message}</p>}
          {!model && loading && <p className="muted">Modell betöltése…</p>}
          {model && (
            <>
              <ScooterCanvas
                model={model}
                pattern={pattern}
                transform={transform}
                exploded={exploded}
                showCutLines={showCutLines}
                disabledPieces={disabledPieces}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onTogglePiece={togglePiece}
              />
              <div className="stage-footer">
                <div>
                  <strong>{model.name}</strong>
                  <span className="muted"> · {model.pieces.length} darab · {model.description}</span>
                </div>
                <div className="hover-label">
                  {hoveredPiece ? hoveredPiece.name : 'Vidd az egeret egy darab fölé'}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="sidebar">
          <details open>
            <summary>Minta</summary>
            <PatternGallery selectedId={patternId} onSelect={setPatternId} uploadedPattern={uploadedPattern} />
          </details>

          <details open>
            <summary>Saját kép</summary>
            <UploadPanel onUpload={handleUpload} onClear={handleClearUpload} uploadedPattern={uploadedPattern} />
          </details>

          <details open>
            <summary>Minta-illesztés és nézet</summary>
            <PatternControls
              transform={transform}
              onTransformChange={setTransform}
              exploded={exploded}
              onExplodedChange={setExploded}
              showCutLines={showCutLines}
              onShowCutLinesChange={setShowCutLines}
              isImage={pattern?.type === 'image'}
            />
          </details>

          {model && (
            <details>
              <summary>Darabok ({model.pieces.length})</summary>
              <PieceList
                pieces={model.pieces}
                hoveredId={hoveredId}
                disabledPieces={disabledPieces}
                onHover={setHoveredId}
                onToggle={togglePiece}
              />
            </details>
          )}
        </aside>
      </main>
    </div>
  );
}

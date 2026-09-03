/**
 * Scoover roller-fólia konfigurátor – alkalmazás-váz.
 *
 * Állapot: kiválasztott modell, kiválasztott minta (beépített vagy feltöltött),
 * minta-transzformáció, nézeti kapcsolók, kikapcsolt darabok, felirat.
 * Az adat (modellek, minták, kategóriák) a src/data mappában él; a komponensek
 * csak megjelenítenek.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_MODEL_ID } from './data/models/index.js';
import {
  DEFAULT_PATTERN_ID, UPLOAD_PATTERN_ID, DEFAULT_STANDING_SURFACE_PATTERN_ID, getPattern, getCategory,
} from './data/patterns/index.js';
import { useScooterModel } from './hooks/useScooterModel.js';
import { labelColorFor } from './utils/color.js';
import ScooterCanvas from './components/ScooterCanvas.jsx';
import PhotoCanvas from './components/PhotoCanvas.jsx';
import PatternGallery from './components/PatternGallery.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import ModelSelector from './components/ModelSelector.jsx';
import PatternControls, { DEFAULT_TRANSFORM } from './components/PatternControls.jsx';
import LabelControls from './components/LabelControls.jsx';
import PieceList from './components/PieceList.jsx';

/** Egy felirat alapértelmezett beállításai; a pieceId modellváltáskor töltődik ki. */
const newLabel = (text = 'SCOOVER') => ({
  id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  enabled: true, text, pieceId: null, scale: 1, dx: 0, dy: 0, rotate: 0, colorMode: 'auto',
});

export default function App() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [patternId, setPatternId] = useState(DEFAULT_PATTERN_ID);
  const [uploadedPattern, setUploadedPattern] = useState(null);
  // Taposófelület (deck-top, standingSurface: true): önálló felár-tétel, saját
  // mintaszállal – kikapcsolva a darab a fő mintát viszi, mint a többi.
  const [standingSurfaceEnabled, setStandingSurfaceEnabled] = useState(false);
  const [standingSurfacePatternId, setStandingSurfacePatternId] = useState(DEFAULT_STANDING_SURFACE_PATTERN_ID);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [sizeAwareTiling, setSizeAwareTiling] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [showCutLines, setShowCutLines] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [labels, setLabels] = useState(() => [newLabel()]);
  /** 'schematic' | 'photo' – a fotós nézet csak akkor elérhető, ha a modellnek van photoView-ja */
  const [view, setView] = useState('schematic');
  /** Modellenként külön tároljuk a kikapcsolt darabokat: { [modelId]: Set<pieceId> } */
  const [disabledByModel, setDisabledByModel] = useState({});

  const { model, loading, error } = useScooterModel(modelId);

  // Az aktív minta: a feltöltött kép, vagy a regiszterből a kiválasztott.
  const pattern = useMemo(
    () => (patternId === UPLOAD_PATTERN_ID ? uploadedPattern : getPattern(patternId)),
    [patternId, uploadedPattern],
  );
  const category = getCategory(pattern?.category ?? 'solid');
  const patternScale = pattern?.patternScale ?? category.patternScale ?? { large: 1, medium: 1, small: 1 };

  // A taposófelület saját mintája – teljesen független a fő mintától (más anyag).
  const standingSurfacePattern = getPattern(standingSurfacePatternId);
  const standingSurfaceCategory = getCategory(standingSurfacePattern?.category ?? 'antislip');
  const standingSurfacePatternScale =
    standingSurfacePattern?.patternScale ?? standingSurfaceCategory.patternScale ?? { large: 1, medium: 1, small: 1 };

  // Modellváltáskor a felirat a modell alapértelmezett darabjára kerül
  // (defaultLabel), ha az aktuális céldarab nem létezik az új modellen.
  useEffect(() => {
    if (!model) return;
    const def = model.pieces.find((p) => p.defaultLabel) ?? model.pieces[0];
    setLabels((ls) => ls.map((l) =>
      l.pieceId && model.pieces.some((p) => p.id === l.pieceId) ? l : { ...l, pieceId: def.id, dx: 0, dy: 0 },
    ));
  }, [model]);

  const updateLabel = useCallback((id, patch) =>
    setLabels((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))), []);
  const removeLabel = useCallback((id) => setLabels((ls) => ls.filter((l) => l.id !== id)), []);
  const addLabel = useCallback(() => {
    const def = model?.pieces.find((p) => p.defaultLabel) ?? model?.pieces[0];
    setLabels((ls) => [...ls, { ...newLabel(ls.length ? 'G2' : 'SCOOVER'), pieceId: def?.id ?? null }]);
  }, [model]);

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

  const hasPhoto = Boolean(model?.photoView);
  const activeView = view === 'photo' && hasPhoto ? 'photo' : 'schematic';
  // az aktív nézet darablistája (a fotós nézet darabjai ugyanazokat az id-kat használják)
  const activePieces = activeView === 'photo' ? model.photoView.pieces : model?.pieces ?? [];
  const hoveredPiece = activePieces.find((p) => p.id === hoveredId);
  const autoColor = labelColorFor(pattern);
  // feliratok a renderelőnek: betűtípus a kategóriából, szín az üzemmód szerint
  const renderLabels = labels.map((l) => ({
    ...l,
    font: category.labelFont,
    color: l.colorMode === 'white' ? '#ffffff' : l.colorMode === 'black' ? '#111111' : autoColor,
  }));
  const isTiled = pattern?.type === 'image-tile' || pattern?.type === 'tile';

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
              {hasPhoto && (
                <div className="view-switch" role="tablist">
                  <button type="button" role="tab" aria-selected={activeView === 'schematic'}
                    className={activeView === 'schematic' ? 'active' : ''} onClick={() => setView('schematic')}>Vázlat</button>
                  <button type="button" role="tab" aria-selected={activeView === 'photo'}
                    className={activeView === 'photo' ? 'active' : ''} onClick={() => setView('photo')}>Fotó</button>
                </div>
              )}
              {activeView === 'photo' ? (
                <PhotoCanvas
                  view={model.photoView}
                  modelName={model.name}
                  pattern={pattern}
                  transform={transform}
                  patternScale={patternScale}
                  standingSurfacePattern={standingSurfacePattern}
                  standingSurfaceEnabled={standingSurfaceEnabled}
                  standingSurfacePatternScale={standingSurfacePatternScale}
                  sizeAwareTiling={sizeAwareTiling}
                  showCutLines={showCutLines}
                  disabledPieces={disabledPieces}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                  onTogglePiece={togglePiece}
                  labels={renderLabels}
                  onLabelDrag={updateLabel}
                />
              ) : (
              <ScooterCanvas
                model={model}
                pattern={pattern}
                transform={transform}
                patternScale={patternScale}
                standingSurfacePattern={standingSurfacePattern}
                standingSurfaceEnabled={standingSurfaceEnabled}
                standingSurfacePatternScale={standingSurfacePatternScale}
                sizeAwareTiling={sizeAwareTiling}
                exploded={exploded}
                showCutLines={showCutLines}
                disabledPieces={disabledPieces}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onTogglePiece={togglePiece}
                labels={renderLabels}
                onLabelDrag={updateLabel}
              />
              )}
              <div className="stage-footer">
                <div>
                  <strong>{model.name}</strong>
                  <span className="muted"> · {model.pieces.length} darab · {pattern?.name ?? 'nincs minta'}</span>
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

          <details open className="standing-surface-panel">
            <summary>Taposófelület <span className="premium-pill">Prémium csúszásgátló</span></summary>
            <p className="muted small">
              A dekk teteje itt külön dönthető: ez nem a fólia folytatása, hanem egy
              strukturált, csúszásgátló anyag – önálló felár-tétel, bármelyik szinten.
            </p>
            <label className="standing-toggle">
              <input
                type="checkbox"
                checked={standingSurfaceEnabled}
                onChange={(e) => setStandingSurfaceEnabled(e.target.checked)}
              />
              Prémium csúszásgátló felület hozzáadása
            </label>
            {standingSurfaceEnabled && (
              <PatternGallery
                selectedId={standingSurfacePatternId}
                onSelect={setStandingSurfacePatternId}
                fixedLine="grip"
              />
            )}
          </details>

          <details open>
            <summary>Feliratok ({labels.length})</summary>
            {model && (
              <LabelControls
                labels={labels}
                onChange={updateLabel}
                onAdd={addLabel}
                onRemove={removeLabel}
                pieces={activePieces}
                font={category.labelFont}
                autoColor={autoColor}
              />
            )}
          </details>

          <details>
            <summary>Saját kép</summary>
            <UploadPanel onUpload={handleUpload} onClear={handleClearUpload} uploadedPattern={uploadedPattern} />
          </details>

          <details>
            <summary>Minta-illesztés és nézet</summary>
            <PatternControls
              transform={transform}
              onTransformChange={setTransform}
              exploded={exploded}
              onExplodedChange={setExploded}
              showCutLines={showCutLines}
              onShowCutLinesChange={setShowCutLines}
              isImage={pattern?.type === 'image'}
              isTiled={isTiled}
              sizeAwareTiling={sizeAwareTiling}
              onSizeAwareTilingChange={setSizeAwareTiling}
            />
          </details>

          {model && (
            <details>
              <summary>Darabok ({activePieces.length})</summary>
              <PieceList
                pieces={activePieces}
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

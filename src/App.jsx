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
import { DEFAULT_PATTERN_ID, UPLOAD_PATTERN_ID, getPattern, getCategory } from './data/patterns/index.js';
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

const DEFAULT_LABEL = { enabled: true, text: 'SCOOVER', pieceId: null };

export default function App() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [patternId, setPatternId] = useState(DEFAULT_PATTERN_ID);
  const [uploadedPattern, setUploadedPattern] = useState(null);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [sizeAwareTiling, setSizeAwareTiling] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [showCutLines, setShowCutLines] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [label, setLabel] = useState(DEFAULT_LABEL);
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

  // Modellváltáskor a felirat a modell alapértelmezett darabjára kerül
  // (defaultLabel), ha az aktuális céldarab nem létezik az új modellen.
  useEffect(() => {
    if (!model) return;
    setLabel((l) => {
      if (l.pieceId && model.pieces.some((p) => p.id === l.pieceId)) return l;
      const def = model.pieces.find((p) => p.defaultLabel) ?? model.pieces[0];
      return { ...l, pieceId: def.id };
    });
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
  const labelColor = labelColorFor(pattern);
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
                  sizeAwareTiling={sizeAwareTiling}
                  showCutLines={showCutLines}
                  disabledPieces={disabledPieces}
                  hoveredId={hoveredId}
                  onHover={setHoveredId}
                  onTogglePiece={togglePiece}
                  label={{ ...label, font: category.labelFont, color: labelColor }}
                />
              ) : (
              <ScooterCanvas
                model={model}
                pattern={pattern}
                transform={transform}
                patternScale={patternScale}
                sizeAwareTiling={sizeAwareTiling}
                exploded={exploded}
                showCutLines={showCutLines}
                disabledPieces={disabledPieces}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onTogglePiece={togglePiece}
                label={{ ...label, font: category.labelFont, color: labelColor }}
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

          <details open>
            <summary>Felirat</summary>
            {model && (
              <LabelControls
                label={label}
                onChange={setLabel}
                pieces={activePieces}
                font={category.labelFont}
                color={labelColor}
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

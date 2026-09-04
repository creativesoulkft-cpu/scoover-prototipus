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
import CartPanel from './components/CartPanel.jsx';
import PriceBar from './components/PriceBar.jsx';
import { useIsTouch } from './hooks/useIsTouch.js';
import { uploadCustomImage } from './api/cartBridge.js';

/** Egy felirat alapértelmezett beállításai; a pieceId modellváltáskor töltődik ki. */
const newLabel = (text = 'SCOOVER') => ({
  id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  enabled: true, text, pieceId: null, scale: 1, dx: 0, dy: 0, rotate: 0, colorMode: 'auto',
});

export default function App() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [patternId, setPatternId] = useState(DEFAULT_PATTERN_ID);
  const [uploadedPattern, setUploadedPattern] = useState(null);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [sizeAwareTiling, setSizeAwareTiling] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [showCutLines, setShowCutLines] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [labels, setLabels] = useState(() => [newLabel()]);
  /** 'none' | 'normal' | 'complex' – felrakás mint szolgáltatás (lásd pricing.js) */
  const [installation, setInstallation] = useState('none');
  /** A CUSTOM mintához a szerverre (híd) feltöltött kép állapota – a helyi
   * dataURL-es előnézettől (uploadedPattern) függetlenül, mert a kosárnak
   * egy valódi, szerver oldali URL kell (uploadedImageUrl). */
  const [remoteImage, setRemoteImage] = useState(null);
  /** 'schematic' | 'photo' – a fotós nézet csak akkor elérhető, ha a modellnek van photoView-ja */
  const [view, setView] = useState('schematic');
  /** Modellenként külön tároljuk a kikapcsolt darabokat: { [modelId]: Set<pieceId> } */
  const [disabledByModel, setDisabledByModel] = useState({});

  const { model, loading, error } = useScooterModel(modelId);
  const isTouch = useIsTouch();

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

  // A taposófelület külön (kültéri csúszásgátló) anyagból készül és külön
  // árazott extra, ezért alapértelmezetten KI van kapcsolva. Modellenként
  // egyszer, a modell betöltésekor állítjuk be – utána a felhasználó dönt.
  useEffect(() => {
    if (!model) return;
    setDisabledByModel((prev) => {
      if (prev[model.id]) return prev;
      const off = model.pieces.filter((p) => p.footboard).map((p) => p.id);
      return off.length ? { ...prev, [model.id]: new Set(off) } : prev;
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

  // A taposófelület-darab ki/bekapcsolása EGYBEN a +6 900 Ft-os extra
  // kapcsolója is – egyetlen állapot, két helyről (darablista, ársáv) vezérelve.
  const footboardPieceId = model?.pieces.find((p) => p.footboard)?.id ?? null;
  const includeFootboard = Boolean(footboardPieceId) && !disabledPieces.has(footboardPieceId);
  const setFootboard = useCallback((on) => {
    if (!footboardPieceId) return;
    setDisabledByModel((prev) => {
      const next = new Set(prev[modelId] ?? []);
      if (on) next.delete(footboardPieceId); else next.add(footboardPieceId);
      return { ...prev, [modelId]: next };
    });
  }, [footboardPieceId, modelId]);

  function handleUpload(img, file) {
    setUploadedPattern(img);
    setPatternId(UPLOAD_PATTERN_ID);
    setTransform(DEFAULT_TRANSFORM);
    setRemoteImage({ url: null, width: null, height: null, uploading: true, error: null });
    uploadCustomImage(file)
      .then(({ url, width, height }) => setRemoteImage({ url, width, height, uploading: false, error: null }))
      .catch((e) => setRemoteImage({ url: null, width: null, height: null, uploading: false, error: e.message }));
  }
  function handleClearUpload() {
    setUploadedPattern(null);
    setRemoteImage(null);
    if (patternId === UPLOAD_PATTERN_ID) setPatternId(DEFAULT_PATTERN_ID);
  }
  // A tier a kiválasztott mintából/feltöltésből adódik: feltöltött kép = custom,
  // egyébként a minta termékvonala (solid | print).
  const tier = patternId === UPLOAD_PATTERN_ID ? 'custom' : (pattern?.line ?? 'solid');

  const hasPhoto = Boolean(model?.photoView);
  const activeView = view === 'photo' && hasPhoto ? 'photo' : 'schematic';
  // az aktív nézet darablistája (a fotós nézet darabjai ugyanazokat az id-kat használják)
  const activePieces = activeView === 'photo' ? model.photoView.pieces : model?.pieces ?? [];
  // Egy forrás a darabszámhoz: a fejléc és a Darabok szekció ugyanezt mutatja.
  const enabledCount = activePieces.filter((p) => !disabledPieces.has(p.id)).length;
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
                  <span className="muted"> · {enabledCount} / {activePieces.length} darab · {pattern?.name ?? 'nincs minta'}</span>
                </div>
                <div className="hover-label">
                  {hoveredPiece
                    ? hoveredPiece.name
                    : isTouch ? 'Koppints egy darabra a ki-/bekapcsoláshoz' : 'Vidd az egeret egy darab fölé'}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="sidebar">
          {model && (
            <PriceBar
              modelId={modelId}
              modelName={model.name}
              tier={tier}
              includeFootboard={includeFootboard}
              onFootboardChange={setFootboard}
              hasFootboardPiece={Boolean(footboardPieceId)}
              installation={installation}
              onInstallationChange={setInstallation}
            />
          )}

          <details open>
            <summary>Minta</summary>
            <PatternGallery selectedId={patternId} onSelect={setPatternId} uploadedPattern={uploadedPattern} />
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
                enabledCount={enabledCount}
                onHover={setHoveredId}
                onToggle={togglePiece}
              />
            </details>
          )}

          {model && (
            <div className="cart-box">
              <h4>Kosárba teszem</h4>
              <CartPanel
                modelId={modelId}
                modelName={model.name}
                tier={tier}
                pattern={pattern}
                transform={transform}
                labels={labels}
                includeFootboard={includeFootboard}
                installation={installation}
                remoteImage={remoteImage}
              />
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

/**
 * Scoover roller-fólia konfigurátor – alkalmazás-váz.
 *
 * Állapot: kiválasztott modell, kiválasztott minta (beépített vagy feltöltött),
 * minta-transzformáció, nézeti kapcsolók, kikapcsolt darabok, felirat.
 * Az adat (modellek, minták, kategóriák) a src/data mappában él; a komponensek
 * csak megjelenítenek.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MODEL_ID } from './data/models/index.js';
import { DEFAULT_PATTERN_ID, UPLOAD_PATTERN_ID, getPattern, getCategory } from './data/patterns/index.js';
import { useScooterModel } from './hooks/useScooterModel.js';
import { labelColorFor } from './utils/color.js';
import { assetUrl } from './utils/assets.js';
import ScooterCanvas from './components/ScooterCanvas.jsx';
import PhotoCanvas from './components/PhotoCanvas.jsx';
import PatternGallery from './components/PatternGallery.jsx';
import ModelSelector from './components/ModelSelector.jsx';
import PatternControls, { DEFAULT_TRANSFORM } from './components/PatternControls.jsx';
import LabelControls from './components/LabelControls.jsx';
import PieceList from './components/PieceList.jsx';
import CartPanel from './components/CartPanel.jsx';
import PriceBar from './components/PriceBar.jsx';
import ShareExportPanel from './components/ShareExportPanel.jsx';
import QuickNav from './components/QuickNav.jsx';
import FootboardEditor from './components/FootboardEditor.jsx';
import FullscreenPreview from './components/FullscreenPreview.jsx';
import SplitHandle, { nearestSnap } from './components/SplitHandle.jsx';
import { useMediaQuery, NARROW_QUERY } from './hooks/useMediaQuery.js';
import FontColorPicker from './components/FontColorPicker.jsx';
import Slider from './components/Slider.jsx';
import { useIsTouch } from './hooks/useIsTouch.js';
import { uploadCustomImage } from './api/cartBridge.js';
import { logDevPriceTable } from './utils/devPriceTable.js';
import { calculatePrice, getTier, hasPrice, FOOTBOARD_EXTRA_HUF } from './pricing.js';
import { formatHuf } from './utils/format.js';
import { resolveLabelFont, resolveLabelColor } from './utils/labelStyle.js';

if (import.meta.env.DEV) logDevPriceTable();

/** Egy felirat alapértelmezett beállításai; a pieceId modellváltáskor töltődik ki. */
const newLabel = (text = 'SCOOVER') => ({
  id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  enabled: true, text, pieceId: null, scale: 1, dx: 0, dy: 0, rotate: 0,
  fontId: 'auto', colorMode: 'auto', customColor: '#ff6a1a',
});

/** Osztott nézet: a kép magassága %-ban csúszka-húzás közben (a legnagyobb előnézet). */
const SLIDER_PREVIEW_PCT = 70;
/** Ennyi idő után áll vissza a felosztás, miután a felhasználó elengedte a csúszkát. */
const SLIDER_RESTORE_MS = 1000;

/** A taposófelület saját, egyetlen felirata – nincs pieceId-je, mindig a taposóra kerül. */
const newFootboardLabel = () => ({
  enabled: false, text: 'SCOOVER', scale: 1, dx: 0, dy: 0, rotate: 0,
  fontId: 'auto', colorMode: 'auto', customColor: '#ff6a1a',
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
  /** 'schematic' | 'photo' – alapértelmezetten a fotó (ha a modellnek van photoView-ja;
   *  ha nincs, az activeView lentebb úgyis vázlatra esik vissza). */
  const [view, setView] = useState('photo');
  /** Modellenként külön tároljuk a kikapcsolt darabokat: { [modelId]: Set<pieceId> } */
  const [disabledByModel, setDisabledByModel] = useState({});
  /** 'kit' | 'pieces' – teljes szettet vagy darabonként válogat a vevő (Darabok szekció
   *  tetején lévő választó). Alapértelmezés a teljes kit: az a legjobb ár/érték. */
  const [pieceMode, setPieceMode] = useState('kit');
  /** Teljes képernyős, csippentéssel nagyítható előnézet (FullscreenPreview.jsx). */
  const [fullscreen, setFullscreen] = useState(false);
  /** Az érintős "koppints egy darabra" súgó csak egyszer, az elején kell – utána ⓘ ikon. */
  const [hintDismissed, setHintDismissed] = useState(false);

  // --- Osztott nézet (keskeny képernyő): fent a rögzített előnézet, lent a
  // saját görgetésű vezérlőpanel. A kettő aránya húzható, és csúszka-húzás
  // közben automatikusan a legnagyobb előnézetre vált. ---
  const isNarrow = useMediaQuery(NARROW_QUERY);
  /** A KÉP magassága a nézet százalékában (a maradék a vezérlőpanelé). */
  const [splitPct, setSplitPct] = useState(45);
  const [splitDragging, setSplitDragging] = useState(false);
  const layoutRef = useRef(null);
  /** Csúszka-húzás előtti felosztás, hogy elengedés után vissza tudjunk állni. */
  const splitBeforeSlider = useRef(null);
  const restoreTimer = useRef(null);
  /** A megjelenített <svg>-t tartalmazó doboz – innen olvassa ki a kép-export (ShareExportPanel). */
  const canvasWrapRef = useRef(null);

  // --- Taposófelület tervezése: teljesen önálló minta/kép/transzformáció/felirat,
  // független a roller többi részének mintájától (lásd FootboardEditor.jsx). ---
  const [footboardEditMode, setFootboardEditMode] = useState(false);
  const [footboardPatternId, setFootboardPatternId] = useState(DEFAULT_PATTERN_ID);
  const [footboardUploadedPattern, setFootboardUploadedPattern] = useState(null);
  const [footboardTransform, setFootboardTransform] = useState(DEFAULT_TRANSFORM);
  const [footboardRemoteImage, setFootboardRemoteImage] = useState(null);
  const [footboardLabel, setFootboardLabel] = useState(newFootboardLabel);

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

  // A "koppints egy darabra" súgó csak az első pillanatokban kell: magától
  // eltűnik, utána egy ⓘ ikon hozza vissza (lásd stage-footer).
  useEffect(() => {
    const t = setTimeout(() => setHintDismissed(true), 8000);
    return () => clearTimeout(t);
  }, []);

  /**
   * Csúszka megfogásakor a panel automatikusan lecsúszik, hogy a lehető
   * legtöbb látszódjon az előnézetből, elengedés után 1 mp-cel visszaáll.
   * Globális pointer-figyelő, mert csúszka a minta-illesztésben, a
   * feliratkártyákon és a taposó-szerkesztőben is van – így egyikbe sem kell
   * külön propot fűzni (bármely natív `input[type=range]`-re működik).
   */
  useEffect(() => {
    if (!isNarrow) return undefined;
    const isSlider = (t) => t instanceof HTMLInputElement && t.type === 'range';

    const onDown = (e) => {
      if (!isSlider(e.target)) return;
      clearTimeout(restoreTimer.current);
      setSplitPct((cur) => {
        if (splitBeforeSlider.current === null) splitBeforeSlider.current = cur;
        return SLIDER_PREVIEW_PCT;
      });
    };
    const onUp = () => {
      if (splitBeforeSlider.current === null) return;
      clearTimeout(restoreTimer.current);
      restoreTimer.current = setTimeout(() => {
        if (splitBeforeSlider.current !== null) setSplitPct(splitBeforeSlider.current);
        splitBeforeSlider.current = null;
      }, SLIDER_RESTORE_MS);
    };

    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      clearTimeout(restoreTimer.current);
    };
  }, [isNarrow]);

  /** Kézi átméretezés: felülírja a csúszka-automatika függőben lévő visszaállítását. */
  const setSplitManually = useCallback((pct) => {
    clearTimeout(restoreTimer.current);
    splitBeforeSlider.current = null;
    setSplitPct(pct);
  }, []);

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

  // A taposófelület-darab ki/bekapcsolása EGYBEN a +6 900 Ft-os extra
  // kapcsolója is – egyetlen állapot, két helyről (darablista, ársáv) vezérelve.
  const footboardPiece = model?.pieces.find((p) => p.footboard) ?? null;
  const footboardPieceId = footboardPiece?.id ?? null;
  const includeFootboard = Boolean(footboardPieceId) && !disabledPieces.has(footboardPieceId);
  const setFootboard = useCallback((on) => {
    if (!footboardPieceId) return;
    setDisabledByModel((prev) => {
      const next = new Set(prev[modelId] ?? []);
      if (on) next.delete(footboardPieceId); else next.add(footboardPieceId);
      return { ...prev, [modelId]: next };
    });
  }, [footboardPieceId, modelId]);

  // A taposó saját mintája/felirata – teljesen független a roller fő mintájától.
  const footboardPattern = useMemo(
    () => (footboardPatternId === UPLOAD_PATTERN_ID ? footboardUploadedPattern : getPattern(footboardPatternId)),
    [footboardPatternId, footboardUploadedPattern],
  );
  const footboardCategory = getCategory(footboardPattern?.category ?? 'solid');
  const footboardAutoColor = labelColorFor(footboardPattern);
  const renderFootboardLabel = {
    ...footboardLabel,
    font: resolveLabelFont(footboardLabel, footboardCategory.labelFont),
    color: resolveLabelColor(footboardLabel, footboardAutoColor),
  };

  function handleFootboardUpload(img, file) {
    setFootboardUploadedPattern(img);
    setFootboardPatternId(UPLOAD_PATTERN_ID);
    setFootboardTransform(DEFAULT_TRANSFORM);
    setFootboardRemoteImage({ url: null, width: null, height: null, uploading: true, error: null });
    uploadCustomImage(file)
      .then(({ url, width, height }) => setFootboardRemoteImage({ url, width, height, uploading: false, error: null }))
      .catch((e) => setFootboardRemoteImage({ url: null, width: null, height: null, uploading: false, error: e.message }));
  }
  function handleFootboardClearUpload() {
    setFootboardUploadedPattern(null);
    setFootboardRemoteImage(null);
    if (footboardPatternId === UPLOAD_PATTERN_ID) setFootboardPatternId(DEFAULT_PATTERN_ID);
  }

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

  // Egy névhez (árcsoporthoz, pl. "Dekk oldala") több fizikai darab-azonosító
  // is tartozhat (pieces[].priceGroup) – ezek egyetlen közös be-/kikapcsoló
  // gombként viselkednek, és egyetlen közös áruk van (lásd src/pricing.js
  // PRICE_GROUPS). A taposófelület (footboard: true) ettől független, saját
  // extraként kezelt darab, sosem tartozik árcsoporthoz.
  const activeGroupIds = [...new Set(activePieces.filter((p) => p.priceGroup).map((p) => p.priceGroup))];
  const selectedGroupIds = activeGroupIds.filter((gid) =>
    activePieces.filter((p) => p.priceGroup === gid).every((p) => !disabledPieces.has(p.id)));

  const togglePiece = useCallback((pieceId) => {
    const piece = activePieces.find((p) => p.id === pieceId);
    const memberIds = piece?.priceGroup
      ? activePieces.filter((p) => p.priceGroup === piece.priceGroup).map((p) => p.id)
      : [pieceId];
    // Az első koppintás után a súgó feleslegessé válik (lásd stage-footer).
    setHintDismissed(true);
    // Ha teljes kitet vásárolna, de kikapcsol egy árazott darabot, attól kezdve
    // darabonkénti (à la carte) módban van – a választó ezt tükrözi.
    if (piece?.priceGroup && pieceMode === 'kit' && !disabledPieces.has(pieceId)) setPieceMode('pieces');
    setDisabledByModel((prev) => {
      const next = new Set(prev[modelId] ?? []);
      const turningOn = next.has(pieceId);
      for (const id of memberIds) { turningOn ? next.delete(id) : next.add(id); }
      return { ...prev, [modelId]: next };
    });
  }, [modelId, activePieces, pieceMode, disabledPieces]);

  /** A Darabok szekció "Teljes kit" gombja: minden ÁRAZOTT darab vissza be.
   *  A taposófelület külön extra (más anyag, külön ár) – azt nem érinti. */
  const selectFullKit = useCallback(() => {
    setPieceMode('kit');
    setDisabledByModel((prev) => {
      const next = new Set(prev[modelId] ?? []);
      for (const p of activePieces) { if (p.priceGroup) next.delete(p.id); }
      return { ...prev, [modelId]: next };
    });
  }, [modelId, activePieces]);
  const hoveredPiece = activePieces.find((p) => p.id === hoveredId);
  const autoColor = labelColorFor(pattern);
  // feliratok a renderelőnek: betűtípus a kategóriából VAGY a felirat saját
  // felülbírálásából, szín az üzemmód szerint (lásd utils/labelStyle.js)
  const renderLabels = labels.map((l) => ({
    ...l,
    font: resolveLabelFont(l, category.labelFont),
    color: resolveLabelColor(l, autoColor),
  }));
  const isTiled = pattern?.type === 'image-tile' || pattern?.type === 'tile';

  // Az export-kártyához (ShareExportPanel) ugyanazzal a központi modullal
  // számolt ár – nem duplikáljuk az árazási logikát.
  const exportPrice = model && hasPrice(modelId)
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, selectedGroupIds })
    : null;

  // Ugyanaz a vászon kell a beágyazott előnézetbe ÉS a teljes képernyős
  // nagyításba (FullscreenPreview) – egy helyen írjuk le, két helyen rendereljük.
  const canvasEl = !model ? null : activeView === 'photo' ? (
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
  );

  // A kép alatti sáv (képaláírás/súgó + mentés-gomb): asztalin a kép alá, keskeny
  // nézetben a görgethető panel tetejére kerül – ezért külön változó.
  const belowCanvasEl = !model ? null : (
    <>
      <div className="stage-footer">
        <div>
          <strong>{model.name}</strong>
          <span className="muted"> · {enabledCount} / {activePieces.length} darab · {pattern?.name ?? 'nincs minta'}</span>
        </div>
        {hoveredPiece ? (
          <div className="hover-label">{hoveredPiece.name}</div>
        ) : isTouch && hintDismissed ? (
          <button type="button" className="hint-icon" title="Hogyan használd?"
            aria-label="Súgó" onClick={() => setHintDismissed(false)}>ⓘ</button>
        ) : (
          <div className="hover-label">
            {isTouch ? 'Koppints egy darabra a ki-/bekapcsoláshoz' : 'Vidd az egeret egy darab fölé'}
          </div>
        )}
      </div>

      {exportPrice && (
        <ShareExportPanel
          canvasWrapRef={canvasWrapRef}
          modelName={model.name}
          tierLabel={getTier(tier)?.name ?? tier}
          patternName={pattern?.name}
          priceText={formatHuf(exportPrice.total)}
        />
      )}
    </>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={assetUrl('brand/scoover-logo.svg')} alt="Scoover" className="brand-logo" />
          <div>
            <h1>fólia-konfigurátor</h1>
            <p className="muted">Prototípus · minta-a-darabokra vizuális mag</p>
          </div>
        </div>
        <ModelSelector value={modelId} onChange={setModelId} />
      </header>

      {/* Osztott nézet: a --split-h a felső (kép) régió magassága. Keskeny
          képernyőn a két régió külön görög – a kép SOSEM fut ki a képernyőről,
          miközben a vevő lent a csúszkákat állítja. */}
      <main
        className={`layout${splitDragging ? ' dragging' : ''}`}
        ref={layoutRef}
        style={{ '--split-h': `${splitPct}%` }}
      >
        <section className="stage">
          {error && <p className="error">Hiba a modell betöltésekor: {error.message}</p>}
          {!model && loading && <p className="muted">Modell betöltése…</p>}
          {model && (
            <>
              {/* Asztalin a gyorsnavigáció a kép fölött van; keskeny nézetben a
                  görgethető panel tetejére kerül (lásd lentebb, a sidebarban). */}
              {!isNarrow && (
                <QuickNav
                  footboardActive={footboardEditMode}
                  onToggleFootboard={() => setFootboardEditMode((v) => !v)}
                  footboardAvailable={Boolean(footboardPieceId)}
                />
              )}

              {!footboardEditMode && (
                <div className="canvas-wrap" ref={canvasWrapRef}>
                  {canvasEl}
                  {hasPhoto && (
                    <div className="view-switch" role="tablist">
                      <button type="button" role="tab" aria-selected={activeView === 'schematic'}
                        className={activeView === 'schematic' ? 'active' : ''} onClick={() => setView('schematic')}>Vázlat</button>
                      <button type="button" role="tab" aria-selected={activeView === 'photo'}
                        className={activeView === 'photo' ? 'active' : ''} onClick={() => setView('photo')}>Fotó</button>
                    </div>
                  )}
                  <button type="button" className="canvas-icon-btn" title="Teljes képernyős előnézet"
                    aria-label="Teljes képernyős előnézet" onClick={() => setFullscreen(true)}>⛶</button>
                </div>
              )}

              {fullscreen && (
                <FullscreenPreview title={`${model.name} · ${pattern?.name ?? 'nincs minta'}`} onClose={() => setFullscreen(false)}>
                  {canvasEl}
                </FullscreenPreview>
              )}

              {footboardEditMode ? (
                <FootboardEditor
                  piece={footboardPiece}
                  pattern={footboardPattern}
                  transform={footboardTransform}
                  label={renderFootboardLabel}
                  onLabelDrag={(d) => setFootboardLabel((l) => ({ ...l, ...d }))}
                  price={FOOTBOARD_EXTRA_HUF}
                  includeFootboard={includeFootboard}
                  onIncludeFootboardChange={setFootboard}
                  onBack={() => setFootboardEditMode(false)}
                />
              ) : (
                /* Keskeny nézetben ezek a görgethető panel tetejére kerülnek –
                   a felső régió csak a képnek van fenntartva. */
                !isNarrow && belowCanvasEl
              )}
            </>
          )}
        </section>

        {isNarrow && model && (
          <SplitHandle
            pct={splitPct}
            onChange={setSplitManually}
            onDragStateChange={setSplitDragging}
            containerRef={layoutRef}
          />
        )}

        <aside className="sidebar">
          {isNarrow && model && (
            <QuickNav
              footboardActive={footboardEditMode}
              onToggleFootboard={() => setFootboardEditMode((v) => !v)}
              footboardAvailable={Boolean(footboardPieceId)}
            />
          )}

          {isNarrow && !footboardEditMode && belowCanvasEl}

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
              selectedGroupIds={selectedGroupIds}
              totalGroupCount={activeGroupIds.length}
            />
          )}

          {footboardEditMode ? (
            <>
              <details open>
                <summary>Taposó – minta</summary>
                <PatternGallery
                  selectedId={footboardPatternId}
                  onSelect={setFootboardPatternId}
                  uploadedPattern={footboardUploadedPattern}
                  onUpload={handleFootboardUpload}
                  onClear={handleFootboardClearUpload}
                  uploadStatus={footboardRemoteImage}
                />
              </details>

              <details open>
                <summary>Taposó – minta illesztése</summary>
                <div className="controls">
                  <Slider label="Méret" value={footboardTransform.scale} min={0.25} max={3} step={0.05}
                    onChange={(v) => setFootboardTransform({ ...footboardTransform, scale: v })} format={(v) => `${v.toFixed(2)}×`} />
                  <Slider label="Forgatás" value={footboardTransform.rotate} min={0} max={360} step={1}
                    onChange={(v) => setFootboardTransform({ ...footboardTransform, rotate: v })} format={(v) => `${v}°`} />
                  <Slider label="Eltolás X" value={footboardTransform.dx} min={-300} max={300} step={1}
                    onChange={(v) => setFootboardTransform({ ...footboardTransform, dx: v })} />
                  <Slider label="Eltolás Y" value={footboardTransform.dy} min={-300} max={300} step={1}
                    onChange={(v) => setFootboardTransform({ ...footboardTransform, dy: v })} />
                  <div className="control-row">
                    <button type="button" className="link" onClick={() => setFootboardTransform(DEFAULT_TRANSFORM)}>Alaphelyzet</button>
                  </div>
                </div>
              </details>

              <details open>
                <summary>Taposó – felirat</summary>
                <div className="controls">
                  <label className="check">
                    <input type="checkbox" checked={footboardLabel.enabled}
                      onChange={(e) => setFootboardLabel((l) => ({ ...l, enabled: e.target.checked }))} />
                    Felirat a taposón
                  </label>
                  <label className="field">
                    <span>Szöveg</span>
                    <input type="text" value={footboardLabel.text} maxLength={24} placeholder="SCOOVER"
                      onChange={(e) => setFootboardLabel((l) => ({ ...l, text: e.target.value }))} />
                  </label>
                  <Slider label="Méret" value={footboardLabel.scale} min={0.3} max={2} step={0.05}
                    onChange={(v) => setFootboardLabel((l) => ({ ...l, scale: v }))} format={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Eltolás X" value={footboardLabel.dx} min={-150} max={150} step={1}
                    onChange={(v) => setFootboardLabel((l) => ({ ...l, dx: v }))} />
                  <Slider label="Eltolás Y" value={footboardLabel.dy} min={-100} max={100} step={1}
                    onChange={(v) => setFootboardLabel((l) => ({ ...l, dy: v }))} />
                  <Slider label="Forgatás" value={footboardLabel.rotate} min={-90} max={90} step={1}
                    onChange={(v) => setFootboardLabel((l) => ({ ...l, rotate: v }))} format={(v) => `${v}°`} />
                  <FontColorPicker
                    label={footboardLabel}
                    categoryFont={footboardCategory.labelFont}
                    autoColor={footboardAutoColor}
                    onChange={(patch) => setFootboardLabel((l) => ({ ...l, ...patch }))}
                  />
                </div>
              </details>
            </>
          ) : (
            <>
              <details open id="section-minta">
                <summary>Minta</summary>
                <PatternGallery
                  selectedId={patternId}
                  onSelect={setPatternId}
                  uploadedPattern={uploadedPattern}
                  onUpload={handleUpload}
                  onClear={handleClearUpload}
                  uploadStatus={remoteImage}
                />
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
                <details id="section-darabok">
                  <summary>Darabok ({enabledCount}/{activePieces.length})</summary>
                  <PieceList
                    pieces={activePieces}
                    hoveredId={hoveredId}
                    disabledPieces={disabledPieces}
                    enabledCount={enabledCount}
                    onHover={setHoveredId}
                    onToggle={togglePiece}
                    modelId={modelId}
                    tier={tier}
                    selectedGroupIds={selectedGroupIds}
                    totalGroupCount={activeGroupIds.length}
                    mode={pieceMode}
                    onSelectFullKit={selectFullKit}
                    onSelectPieces={() => setPieceMode('pieces')}
                  />
                </details>
              )}

              <details open id="section-feliratok">
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
            </>
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
                selectedGroupIds={selectedGroupIds}
                footboardDesign={{
                  pattern: footboardPattern,
                  uploadedImageUrl: footboardRemoteImage?.url ?? null,
                  uploading: footboardRemoteImage?.uploading ?? false,
                  transform: footboardTransform,
                  label: footboardLabel,
                }}
              />
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

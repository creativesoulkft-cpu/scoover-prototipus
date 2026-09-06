/**
 * Scoover roller-fólia konfigurátor – alkalmazás-váz.
 *
 * A felület ÖT, jól elkülönülő szekcióra tagolt kártya (egyszerre egy nyitva):
 *   1. A rollered      – modell + évjárat
 *   2. Stílus          – SOLID / PRINT / saját kép, minta-illesztés, feliratok
 *   3. Mit fóliázunk   – ZÓNÁS választás (nem darabonkénti), teljes szett alapból
 *   4. Taposófelület   – külön tétel, saját tervezőnézettel
 *   5. Felrakás vagy postázás
 *
 * Állapot: kiválasztott modell/évjárat, minta (beépített vagy feltöltött),
 * minta-transzformáció, nézeti kapcsolók, kiválasztott ZÓNÁK (ebből származik,
 * mely darabok kapnak fóliát), taposó, felrakás, feliratok. Az adat (modellek,
 * minták, zónák, árak) a src/data és src/pricing.js alatt él; a komponensek
 * csak megjelenítenek.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MODEL_ID, defaultYearFor } from './data/models/index.js';
import { DEFAULT_PATTERN_ID, UPLOAD_PATTERN_ID, getPattern, getCategory } from './data/patterns/index.js';
import { zonesForPieces, zoneOfPiece } from './data/zones.js';
import { useScooterModel } from './hooks/useScooterModel.js';
import { labelColorFor } from './utils/color.js';
import { assetUrl } from './utils/assets.js';
import ScooterCanvas from './components/ScooterCanvas.jsx';
import PhotoCanvas from './components/PhotoCanvas.jsx';
import PatternGallery from './components/PatternGallery.jsx';
import PatternControls, { DEFAULT_TRANSFORM } from './components/PatternControls.jsx';
import LabelControls from './components/LabelControls.jsx';
import CartPanel from './components/CartPanel.jsx';
import PriceBar from './components/PriceBar.jsx';
import ShareExportPanel from './components/ShareExportPanel.jsx';
import QuickNav, { SECTIONS } from './components/QuickNav.jsx';
import Section from './components/Section.jsx';
import ZoneSelector from './components/ZoneSelector.jsx';
import ModelSection from './components/ModelSection.jsx';
import FootboardSection from './components/FootboardSection.jsx';
import DeliverySection from './components/DeliverySection.jsx';
import HelpLine from './components/HelpLine.jsx';
import FootboardEditor from './components/FootboardEditor.jsx';
import FullscreenPreview from './components/FullscreenPreview.jsx';
import SplitHandle from './components/SplitHandle.jsx';
import { useMediaQuery, NARROW_QUERY } from './hooks/useMediaQuery.js';
import { useReportHeight } from './hooks/useReportHeight.js';
import { piecesCenter } from './utils/pathBox.js';
import {
  trackConfiguratorOpened, trackTierSelected, trackPatternSelected,
  trackImageUploaded, trackFootboardToggled, trackZoneToggled, trackKitToggled,
} from './utils/analytics.js';
import FontColorPicker from './components/FontColorPicker.jsx';
import Slider from './components/Slider.jsx';
import { useIsTouch } from './hooks/useIsTouch.js';
import { uploadCustomImage } from './api/cartBridge.js';
import { logDevPriceTable } from './utils/devPriceTable.js';
import {
  calculatePrice, getTier, hasPrice, getZonePrices, getKitInfo,
  FOOTBOARD_EXTRA_HUF, INSTALLATION_OPTIONS,
} from './pricing.js';
import { formatHuf } from './utils/format.js';
import { resolveLabelFont, resolveLabelColor } from './utils/labelStyle.js';

if (import.meta.env.DEV) logDevPriceTable();

/** Egy felirat alapértelmezett beállításai; a pieceId modellváltáskor töltődik ki. */
const newLabel = (text = 'SCOOVER') => ({
  id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  enabled: true, text, pieceId: null, scale: 1, dx: 0, dy: 0, rotate: 0,
  fontId: 'auto', colorMode: 'auto', customColor: '#ff6a1a',
});

/**
 * Saját kép feltöltésénél a kép a roller darabjaira oszlik szét. A "fő darab"
 * az, amelyikre a kép LÉNYEGE (középpontja) essen – alapból a dekk oldala, mert
 * az a legnagyobb és a legjobban látható felület.
 */
const DEFAULT_FOCUS_PIECE_ID = 'deck-side';

/** Osztott nézet: a kép magassága %-ban csúszka-húzás közben (a legnagyobb előnézet). */
const SLIDER_PREVIEW_PCT = 70;
/** Ennyi idő után áll vissza a felosztás, miután a felhasználó elengedte a csúszkát. */
const SLIDER_RESTORE_MS = 1000;

/** A taposófelület saját, egyetlen felirata – nincs pieceId-je, mindig a taposóra kerül. */
const newFootboardLabel = () => ({
  enabled: false, text: 'SCOOVER', scale: 1, dx: 0, dy: 0, rotate: 0,
  fontId: 'auto', colorMode: 'auto', customColor: '#ff6a1a',
});

/**
 * A szekciók fejléc-szövegei: egysoros magyarázat (mindig látszik) és a ⓘ
 * ikonra nyíló, bővebb (2-3 mondatos) leírás. Egy helyen, hogy a szöveg
 * egyszerre legyen cserélhető.
 */
const SECTION_TEXT = {
  'section-model': {
    title: 'A rollered',
    blurb: 'Válaszd ki a modellt és az évjáratot, hogy pontosan illeszkedjen a fólia.',
    info: 'A fóliát modellenként és évjáratonként vágjuk, mert a burkolatok mérete és a csavarok, kivágások helye típusonként eltér. A pontos választással garantáljuk, hogy minden darab hézag nélkül illeszkedik. Ha nem találod a modelledet, hívj minket – felvesszük.',
  },
  'section-style': {
    title: 'Stílus',
    blurb: 'Egyszínű, kész grafika vagy saját kép — itt dől el a fólia jellege.',
    info: 'A SOLID egyszínű, nyomtatás nélküli fólia a legkedvezőbb áron. A PRINT kész Scoover-grafika, azonnal választható. Az EGYEDI a te képedet teszi a rollerre – ez kézi ellenőrzéssel, drágábban készül. A feliratok minden szinten ingyenesek.',
  },
  'section-zones': {
    title: 'Mit fóliázunk',
    blurb: 'Alapból az egész rollert. Ha csak egy részt szeretnél, itt tudod kivenni a többit.',
    info: 'A rollert zónákra osztottuk: minden zóna mögött a valós fóliadarabok állnak. A teljes szett egyben a legkedvezőbb; ha kiveszel egy zónát, a többi külön áron számít, és a megtakarítás egy koppintással visszakapcsolható. Amit kiveszel, a képen azonnal csupasz feketén látszik.',
  },
  'section-footboard': {
    title: 'Taposófelület',
    blurb: 'Csúszásgátló anyagból készül, ezért külön tétel és külön tervezhető.',
    info: 'A taposófelület kültéri, érdesített csúszásgátló fólia – más anyag, mint a többi darab, ezért a teljes szett sem tartalmazza. Bekapcsolva külön tervezőnézetet kap: saját mintát vagy képet tehetsz rá, a roller többi részétől függetlenül.',
  },
  'section-delivery': {
    title: 'Felrakás vagy postázás',
    blurb: 'Postázzuk a kész szettet, vagy behozod és mi rakjuk fel Veszprémben.',
    info: 'Postázásnál a szettet felrakási útmutatóval küldjük, a felrakás nálad történik. A felrakást csak személyesen, az üzletünkben végezzük – normál vagy komplex díjjal, a roller állapotától és a fólia bonyolultságától függően.',
  },
};

export default function App() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  /** A roller évjárata – csak a rendelésbe kerül (lásd src/data/models/index.js). */
  const [year, setYear] = useState(() => defaultYearFor(DEFAULT_MODEL_ID));
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
  /**
   * ZÓNÁS választás modellenként: { [modelId]: Set<zoneId> }. Ha egy modellhez
   * nincs bejegyzés, MINDEN zónája ki van választva (teljes fólia szett) – ez
   * az alapállapot, ezért nem is tároljuk, amíg a vevő nem nyúl hozzá.
   */
  const [zonesByModel, setZonesByModel] = useState({});
  /** Taposófelület modellenként: { [modelId]: boolean } – alapból KI (külön anyag, külön tétel). */
  const [footboardByModel, setFootboardByModel] = useState({});
  /** Az éppen nyitott főszekció (egyszerre csak egy) – lásd SECTIONS. */
  const [openSection, setOpenSection] = useState(SECTIONS[0].id);
  /** Teljes képernyős, csippentéssel nagyítható előnézet (FullscreenPreview.jsx). */
  const [fullscreen, setFullscreen] = useState(false);
  /** Az érintős "koppints egy darabra" súgó csak egyszer, az elején kell – utána ⓘ ikon. */
  const [hintDismissed, setHintDismissed] = useState(false);
  /** Saját képnél: melyik darabra essen a kép lényege (lásd DEFAULT_FOCUS_PIECE_ID). */
  const [focusPieceId, setFocusPieceId] = useState(DEFAULT_FOCUS_PIECE_ID);

  // --- Osztott nézet (keskeny képernyő): fent a rögzített előnézet, lent a
  // saját görgetésű vezérlőpanel. A kettő aránya húzható, és csúszka-húzás
  // közben automatikusan a legnagyobb előnézetre vált. ---
  const isNarrow = useMediaQuery(NARROW_QUERY);
  /** A KÉP magassága a nézet százalékában (a maradék a vezérlőpanelé). */
  const [splitPct, setSplitPct] = useState(45);
  const [splitDragging, setSplitDragging] = useState(false);
  const layoutRef = useRef(null);
  const topbarRef = useRef(null);
  // asztalin a fejléc a lap tetejére tapad, alá sorakozik a kép és az ársáv
  useReportHeight(topbarRef, '--topbar-h');
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

  // --- Mérés (lásd utils/analytics.js – egyelőre csak konzolra logol) ---
  useEffect(() => { trackConfiguratorOpened({ model: DEFAULT_MODEL_ID }); }, []);

  /** Modellváltás: az évjárat a modell legfrissebbjére áll, a taposó-szerkesztő bezárul. */
  const changeModel = useCallback((id) => {
    setModelId(id);
    setYear(defaultYearFor(id));
    setFootboardEditMode(false);
  }, []);

  /**
   * Csúszka megfogásakor a panel automatikusan lecsúszik, hogy a lehető
   * legtöbb látszódjon az előnézetből, elengedés után 1 mp-cel visszaáll.
   * Globális pointer-figyelő, mert csúszka több szekcióban is van – így
   * egyikbe sem kell külön propot fűzni (bármely natív `input[type=range]`-re működik).
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

  /**
   * Melyik csúszkát húzza épp a felhasználó és milyen értéken – ezt írjuk ki a
   * kép fölé, hogy a felnagyított előnézet magyarázatot is kapjon.
   */
  const [sliderHint, setSliderHint] = useState(null);
  useEffect(() => {
    const onSlider = (e) => setSliderHint(e.detail.active ? { label: e.detail.label, text: e.detail.text } : null);
    window.addEventListener('scoover:slider', onSlider);
    return () => window.removeEventListener('scoover:slider', onSlider);
  }, []);

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

  // ---------------------------------------------------------------------
  // Zónák és taposó – ebből SZÁRMAZIK, mely darabok kapnak fóliát.
  // ---------------------------------------------------------------------
  const hasPhoto = Boolean(model?.photoView);
  const activeView = view === 'photo' && hasPhoto ? 'photo' : 'schematic';
  // az aktív nézet darablistája (a fotós nézet darabjai ugyanazokat az id-kat használják)
  const activePieces = activeView === 'photo' ? model.photoView.pieces : model?.pieces ?? [];

  /** Az ezen a modellen/nézeten létező zónák, a darabjaikkal (ZONES sorrendjében). */
  const zones = useMemo(() => zonesForPieces(activePieces), [activePieces]);
  const availableZoneIds = useMemo(() => zones.map((z) => z.id), [zones]);
  /** A kiválasztott zónák – bejegyzés nélkül (alapállapot) az összes. */
  const selectedZoneSet = useMemo(
    () => zonesByModel[modelId] ?? new Set(availableZoneIds),
    [zonesByModel, modelId, availableZoneIds],
  );
  const selectedZoneIds = useMemo(
    () => availableZoneIds.filter((id) => selectedZoneSet.has(id)),
    [availableZoneIds, selectedZoneSet],
  );
  const isFullKit = zones.length > 0 && selectedZoneIds.length === zones.length;

  const footboardPiece = activePieces.find((p) => p.footboard) ?? null;
  const footboardPieceId = footboardPiece?.id ?? null;
  const includeFootboard = Boolean(footboardPieceId) && Boolean(footboardByModel[modelId]);

  /**
   * Fólia nélkül maradó darabok: a ki nem választott zónák darabjai, plusz a
   * taposó, ha az extra nincs bekapcsolva. A vásznon ezek csupasz feketék –
   * a vevő azonnal LÁTJA, mit rendel, nem kell olvasnia hozzá.
   */
  const disabledPieces = useMemo(() => {
    const off = new Set();
    for (const z of zones) if (!selectedZoneSet.has(z.id)) z.pieceIds.forEach((id) => off.add(id));
    if (footboardPieceId && !includeFootboard) off.add(footboardPieceId);
    return off;
  }, [zones, selectedZoneSet, footboardPieceId, includeFootboard]);

  const setFootboard = useCallback((on) => {
    if (!footboardPieceId) return;
    trackFootboardToggled(on);
    setFootboardByModel((prev) => ({ ...prev, [modelId]: Boolean(on) }));
    if (!on) setFootboardEditMode(false);
  }, [footboardPieceId, modelId]);

  const toggleZone = useCallback((zoneId) => {
    setZonesByModel((prev) => {
      const cur = prev[modelId] ?? new Set(availableZoneIds);
      const next = new Set(cur);
      const turningOn = !next.has(zoneId);
      if (turningOn) next.add(zoneId); else next.delete(zoneId);
      trackZoneToggled(zoneId, turningOn);
      return { ...prev, [modelId]: next };
    });
  }, [modelId, availableZoneIds]);

  /** "Teljes fólia szett" / "Kérem egyben": minden zóna vissza (a taposót nem érinti). */
  const selectAllZones = useCallback(() => {
    trackKitToggled(true);
    setZonesByModel((prev) => ({ ...prev, [modelId]: new Set(availableZoneIds) }));
  }, [modelId, availableZoneIds]);

  /** "Törlés mind": nulláról indulás annak, aki csak egy dolgot akar. */
  const clearAllZones = useCallback(() => {
    trackKitToggled(false);
    setZonesByModel((prev) => ({ ...prev, [modelId]: new Set() }));
  }, [modelId]);

  /** Vászon-kattintás: a darab zónáját kapcsolja (a taposó a saját extráját). */
  const togglePiece = useCallback((pieceId) => {
    const piece = activePieces.find((p) => p.id === pieceId);
    setHintDismissed(true);
    if (!piece) return;
    if (piece.footboard) { setFootboard(!includeFootboard); return; }
    const zone = zoneOfPiece(piece);
    if (zone) toggleZone(zone.id);
  }, [activePieces, includeFootboard, setFootboard, toggleZone]);

  const hoveredPiece = activePieces.find((p) => p.id === hoveredId);

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
    // a kép lényege alapból a legnagyobb, legjobban látható darabra kerül
    setFocusPieceId(DEFAULT_FOCUS_PIECE_ID);
    trackImageUploaded({ width: img?.originalWidth, height: img?.originalHeight, focusPieceId: DEFAULT_FOCUS_PIECE_ID });
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

  // A szint és a minta is a kiválasztásból ADÓDIK, ezért a derived értéket
  // figyeljük; az első renderelés nem "váltás", azt kihagyjuk.
  const firstTier = useRef(true);
  useEffect(() => {
    if (firstTier.current) { firstTier.current = false; return; }
    trackTierSelected(tier);
  }, [tier]);
  const firstPattern = useRef(true);
  useEffect(() => {
    if (firstPattern.current) { firstPattern.current = false; return; }
    if (pattern && patternId !== UPLOAD_PATTERN_ID) trackPatternSelected(pattern);
  }, [patternId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Egy forrás a darabszámhoz: a fejléc ugyanezt mutatja.
  const enabledCount = activePieces.filter((p) => !disabledPieces.has(p.id)).length;

  /**
   * "Fő darab": a feltöltött kép a darabok között oszlik szét, és a lényege
   * (a kép közepe) alapból a vászon közepére esne – ami gyakran két darab közé
   * vagy egy alig látható részre kerül. Ez az eltolás viszi a kép közepét a
   * kiválasztott darab közepére. NEM a transform state-be írjuk, hanem
   * rendereléskor adjuk hozzá: így a felhasználói csúszkák tartománya és az
   * "Alaphelyzet" gomb változatlan marad, a finomhangolás pedig a fókuszhoz
   * képest értendő.
   */
  const imageFocus = useMemo(() => {
    const vb = activeView === 'photo' ? model?.photoView?.viewBox : model?.viewBox;
    if (tier !== 'custom' || !focusPieceId || !vb) return { fx: 0, fy: 0 };
    const target = activePieces.find((p) => p.id === focusPieceId);
    if (!target) return { fx: 0, fy: 0 };
    const members = target.priceGroup
      ? activePieces.filter((p) => p.priceGroup === target.priceGroup)
      : [target];
    const c = piecesCenter(members);
    if (!c) return { fx: 0, fy: 0 };
    const s = transform.scale ?? 1;
    const r = ((transform.rotate ?? 0) * Math.PI) / 180;
    const hx = vb.width / 2, hy = vb.height / 2;
    const px = s * hx, py = s * hy;
    const rx = hx + (px - hx) * Math.cos(r) - (py - hy) * Math.sin(r);
    const ry = hy + (px - hx) * Math.sin(r) + (py - hy) * Math.cos(r);
    return { fx: Math.round(c.cx - rx), fy: Math.round(c.cy - ry) };
  }, [tier, focusPieceId, model, activeView, activePieces, transform.scale, transform.rotate]);

  /**
   * A fő darab választható értékei: darab-csoportonként EGY sor (a több
   * fizikai darabból álló csoportok – pl. "Dekk oldala" – egyként viselkednek),
   * a taposófelület nélkül (annak saját, önálló szerkesztője van).
   */
  const focusPieceOptions = useMemo(() => {
    const seen = new Set();
    return activePieces
      .filter((p) => !p.footboard)
      .filter((p) => {
        const key = p.priceGroup ?? p.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p) => ({ id: p.id, name: p.name }));
  }, [activePieces]);

  useEffect(() => {
    if (!focusPieceOptions.length) return;
    if (focusPieceOptions.some((p) => p.id === focusPieceId)) return;
    const fallback = focusPieceOptions.find((p) => p.id === DEFAULT_FOCUS_PIECE_ID) ?? focusPieceOptions[0];
    setFocusPieceId(fallback.id);
  }, [focusPieceOptions, focusPieceId]);

  /** A ténylegesen kirajzolt (és a rendelésbe kerülő) minta-transzformáció. */
  const renderTransform = imageFocus.fx || imageFocus.fy
    ? { ...transform, dx: transform.dx + imageFocus.fx, dy: transform.dy + imageFocus.fy }
    : transform;

  const autoColor = labelColorFor(pattern);
  const renderLabels = labels.map((l) => ({
    ...l,
    font: resolveLabelFont(l, category.labelFont),
    color: resolveLabelColor(l, autoColor),
  }));
  const isTiled = pattern?.type === 'image-tile' || pattern?.type === 'tile';

  // --- Árak: MINDEN a központi src/pricing.js-ből ---
  const priced = Boolean(model) && hasPrice(modelId);
  const exportPrice = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, selectedZoneIds, availableZoneIds })
    : null;
  const zonePrices = useMemo(
    () => (priced ? Object.fromEntries(getZonePrices(modelId, tier, availableZoneIds).map((z) => [z.id, z.price])) : {}),
    [priced, modelId, tier, availableZoneIds],
  );
  const kitInfo = priced ? getKitInfo(modelId, tier, availableZoneIds) : { listSum: 0, kitPrice: 0, savings: 0 };
  const minimumOrder = exportPrice ? exportPrice.minimumOrder : { ok: true };

  // --- Szekciók: egyszerre egy nyitva; a gyorsnavigáció nyit ÉS odagörget ---
  const showSection = useCallback((id) => {
    setFootboardEditMode(false);
    setOpenSection(id);
    // a görgetés a nyitás utáni layoutra vár
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);
  const toggleSection = useCallback((id) => {
    setOpenSection((cur) => (cur === id ? null : id));
  }, []);
  const nextSectionId = (id) => SECTIONS[SECTIONS.findIndex((s) => s.id === id) + 1]?.id ?? null;
  const nextButton = (id) => {
    const next = nextSectionId(id);
    return next ? (
      <button type="button" className="btn btn-next" onClick={() => showSection(next)}>
        Tovább: {SECTION_TEXT[next].title} →
      </button>
    ) : null;
  };

  /** A "Taposófelület tervezése" gomb: a nagy előnézet a taposó felülnézetére vált. */
  const startFootboardDesign = useCallback(() => {
    if (!includeFootboard) setFootboard(true);
    setFootboardEditMode(true);
    if (isNarrow) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [includeFootboard, setFootboard, isNarrow]);

  // Ugyanaz a vászon kell a beágyazott előnézetbe ÉS a teljes képernyős
  // nagyításba (FullscreenPreview) – egy helyen írjuk le, két helyen rendereljük.
  const canvasEl = !model ? null : activeView === 'photo' ? (
    <PhotoCanvas
      view={model.photoView}
      modelName={model.name}
      pattern={pattern}
      transform={renderTransform}
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
      transform={renderTransform}
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
          <span className="muted"> · {year} · {enabledCount} / {activePieces.length} darab · {pattern?.name ?? 'nincs minta'}</span>
        </div>
        {hoveredPiece ? (
          <div className="hover-label">{hoveredPiece.name}</div>
        ) : isTouch && hintDismissed ? (
          <button type="button" className="hint-icon" title="Hogyan használd?"
            aria-label="Súgó" onClick={() => setHintDismissed(false)}>ⓘ</button>
        ) : (
          <div className="hover-label">
            {isTouch ? 'Koppints egy zónára a képen a ki-/bekapcsoláshoz' : 'Kattints egy zónára a képen a ki-/bekapcsoláshoz'}
          </div>
        )}
      </div>

      {/* Saját képnél a minta "neve" a nyers fájlnév (pl. egy uuid.jpg), az
          exportált képre az nem való – ott a semleges "Saját kép" áll. */}
      {exportPrice && (
        <ShareExportPanel
          canvasWrapRef={canvasWrapRef}
          modelName={model.name}
          tierLabel={getTier(tier)?.name ?? tier}
          patternName={patternId === UPLOAD_PATTERN_ID ? 'Saját kép' : pattern?.name}
          priceText={formatHuf(exportPrice.total)}
        />
      )}
    </>
  );

  const tierName = getTier(tier)?.name ?? tier;
  const installationName = INSTALLATION_OPTIONS.find((o) => o.id === installation)?.name ?? '';
  /** A kártyák fejlécén látszó, egyszavas összefoglaló az aktuális választásról. */
  const summaries = {
    'section-model': model ? `${model.name} · ${year ?? ''}` : '…',
    'section-style': `${tierName} · ${patternId === UPLOAD_PATTERN_ID ? 'Saját kép' : (pattern?.name ?? '–')}`,
    'section-zones': isFullKit ? 'Teljes szett' : `${selectedZoneIds.length}/${zones.length} zóna`,
    'section-footboard': includeFootboard ? `+${formatHuf(FOOTBOARD_EXTRA_HUF)}` : 'Nincs',
    'section-delivery': installation === 'none' ? 'Postázás' : `Felrakás · ${installationName}`,
  };
  const sectionProps = (id) => ({
    id,
    title: SECTION_TEXT[id].title,
    blurb: SECTION_TEXT[id].blurb,
    info: SECTION_TEXT[id].info,
    summary: summaries[id],
    open: openSection === id,
    onToggle: () => toggleSection(id),
  });

  return (
    <div className="app">
      <header className="topbar" ref={topbarRef}>
        <div className="brand">
          <img src={assetUrl('brand/scoover-logo.svg')} alt="Scoover" className="brand-logo" />
          <h1>Scoover fólia-konfigurátor</h1>
        </div>
        {model && <span className="topbar-model muted small">{model.name} · {year}</span>}
      </header>

      {/* Az OLDAL görög egyben – nincs belső görgetősáv. A kép (stage) a nézet
          tetejére tapad (sticky), a vezérlőpanel alatta folyik. Keskeny
          képernyőn a kép magassága a nézet --split-pct százaléka, így a roller
          SOSEM fut ki a képernyőről, miközben a vevő lent a csúszkákat állítja. */}
      <main
        className={`layout${splitDragging ? ' dragging' : ''}`}
        ref={layoutRef}
        style={{ '--split-pct': splitPct }}
      >
        <section className="stage">
          {error && <p className="error">Hiba a modell betöltésekor: {error.message}</p>}
          {!model && loading && <p className="muted">Modell betöltése…</p>}
          {model && (
            <>
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

                  {sliderHint && (
                    <div className="canvas-slider-hint" aria-live="polite">
                      <span className="csh-label">{sliderHint.label}</span>
                      <strong className="csh-value">{sliderHint.text}</strong>
                      <span className="csh-tip">húzd a csúszkát – itt látod élőben</span>
                    </div>
                  )}
                </div>
              )}

              {fullscreen && (
                <FullscreenPreview title={`${model.name} · ${pattern?.name ?? 'nincs minta'}`} onClose={() => setFullscreen(false)}>
                  {canvasEl}
                </FullscreenPreview>
              )}

              {footboardEditMode ? (
                <FootboardEditor
                  model={model}
                  piece={footboardPiece}
                  pattern={footboardPattern}
                  transform={footboardTransform}
                  label={renderFootboardLabel}
                  onLabelDrag={(d) => setFootboardLabel((l) => ({ ...l, ...d }))}
                  price={FOOTBOARD_EXTRA_HUF}
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
          />
        )}

        <aside className="sidebar">
          {model && !footboardEditMode && (
            <PriceBar
              modelId={modelId}
              modelName={model.name}
              tier={tier}
              includeFootboard={includeFootboard}
              installation={installation}
              selectedZoneIds={selectedZoneIds}
              availableZoneIds={availableZoneIds}
            />
          )}

          {model && !footboardEditMode && (
            <QuickNav activeId={openSection} onSelect={showSection} />
          )}

          {isNarrow && !footboardEditMode && belowCanvasEl}

          {footboardEditMode ? (
            <div className="footboard-tools">
              {/* Mindig látható visszalépés a teljes rollernézetre – a panel tetejére tapad. */}
              <div className="footboard-backbar">
                <button type="button" className="btn btn-outline" onClick={() => setFootboardEditMode(false)}>
                  ← Vissza a teljes rollerhez
                </button>
                <span className="muted small">Taposófelület tervezése · +{formatHuf(FOOTBOARD_EXTRA_HUF)}</span>
              </div>

              <section className="card open">
                <div className="card-head static"><span className="card-title">Taposó – minta vagy saját kép</span></div>
                <div className="card-body">
                  <PatternGallery
                    selectedId={footboardPatternId}
                    onSelect={setFootboardPatternId}
                    uploadedPattern={footboardUploadedPattern}
                    onUpload={handleFootboardUpload}
                    onClear={handleFootboardClearUpload}
                    uploadStatus={footboardRemoteImage}
                  />
                </div>
              </section>

              <section className="card open">
                <div className="card-head static"><span className="card-title">Taposó – nagyítás, forgatás, eltolás</span></div>
                <div className="card-body controls">
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
              </section>

              <section className="card open">
                <div className="card-head static"><span className="card-title">Taposó – felirat</span></div>
                <div className="card-body controls">
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
              </section>

              <button type="button" className="btn btn-outline" onClick={() => setFootboardEditMode(false)}>
                ← Vissza a teljes rollerhez
              </button>
            </div>
          ) : model && (
            <div className="cards">
              <Section {...sectionProps('section-model')} footer={nextButton('section-model')}>
                <ModelSection modelId={modelId} onModelChange={changeModel} year={year} onYearChange={setYear} />
              </Section>

              <Section {...sectionProps('section-style')} footer={nextButton('section-style')}>
                <PatternGallery
                  selectedId={patternId}
                  onSelect={setPatternId}
                  uploadedPattern={uploadedPattern}
                  onUpload={handleUpload}
                  onClear={handleClearUpload}
                  uploadStatus={remoteImage}
                  focusPieceId={focusPieceId}
                  onFocusPieceChange={setFocusPieceId}
                  focusPieceOptions={focusPieceOptions}
                />
                <details className="sub">
                  <summary>Minta illesztése és nézet</summary>
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
                <details className="sub">
                  <summary>Feliratok ({labels.length})</summary>
                  <LabelControls
                    labels={labels}
                    onChange={updateLabel}
                    onAdd={addLabel}
                    onRemove={removeLabel}
                    pieces={activePieces.filter((p) => !disabledPieces.has(p.id))}
                    font={category.labelFont}
                    autoColor={autoColor}
                  />
                </details>
              </Section>

              <Section {...sectionProps('section-zones')} footer={nextButton('section-zones')}>
                {priced ? (
                  <ZoneSelector
                    zones={zones}
                    selectedIds={selectedZoneSet}
                    onToggleZone={toggleZone}
                    onSelectAll={selectAllZones}
                    onClearAll={clearAllZones}
                    prices={zonePrices}
                    kitPrice={kitInfo.kitPrice}
                    listSum={kitInfo.listSum}
                    savings={kitInfo.savings}
                    hoveredId={hoveredId}
                    onHover={setHoveredId}
                    minimumOrder={minimumOrder}
                  />
                ) : (
                  <p className="muted small">Ehhez a modellhez még nincs árlista.</p>
                )}
              </Section>

              <Section {...sectionProps('section-footboard')} footer={nextButton('section-footboard')}>
                <FootboardSection
                  available={Boolean(footboardPieceId)}
                  included={includeFootboard}
                  onIncludedChange={setFootboard}
                  price={FOOTBOARD_EXTRA_HUF}
                  onDesign={startFootboardDesign}
                  editing={footboardEditMode}
                />
              </Section>

              <Section {...sectionProps('section-delivery')}>
                <DeliverySection installation={installation} onInstallationChange={setInstallation} />
                <div className="cart-box">
                  <h4>Kosárba teszem</h4>
                  <CartPanel
                    modelId={modelId}
                    modelName={model.name}
                    tier={tier}
                    pattern={pattern}
                    transform={renderTransform}
                    labels={labels}
                    includeFootboard={includeFootboard}
                    installation={installation}
                    remoteImage={remoteImage}
                    selectedZoneIds={selectedZoneIds}
                    availableZoneIds={availableZoneIds}
                    year={year}
                    footboardDesign={{
                      pattern: footboardPattern,
                      uploadedImageUrl: footboardRemoteImage?.url ?? null,
                      uploading: footboardRemoteImage?.uploading ?? false,
                      transform: footboardTransform,
                      label: footboardLabel,
                    }}
                  />
                </div>
              </Section>
            </div>
          )}

          {/* A legalján, minden szekció után – nem tapad, nem szakít meg semmit. */}
          <div className="help-line-wrap"><HelpLine /></div>
        </aside>
      </main>
    </div>
  );
}

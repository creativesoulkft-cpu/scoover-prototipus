/**
 * Scoover roller-fólia konfigurátor – alkalmazás-váz.
 *
 * A felület ÖT, jól elkülönülő szekcióra tagolt kártya (egyszerre egy nyitva):
 *   1. A rollered      – modell + évjárat
 *   2. Stílus          – melyik részre? · SOLID / PRINT / saját kép · igazítás · feliratok
 *   3. Mit fóliázunk   – ZÓNÁS választás, teljes szett alapból
 *   4. Taposófelület   – külön tétel, saját tervezőnézettel
 *   5. Felrakás vagy postázás + Kosárba teszem
 *
 * ÁLLAPOT: a teljes terv EGY dokumentumban él (src/design/schema.js), amit
 * a useDesign reducer kezel – ebből épül a megosztható link, a szerveres
 * mentés (SCV-… azonosító), a kosár-csomag és a nyomdai fájl. Itt csak
 * felületi állapot van (nyitott szekció, kiemelés, igazítás mód, felosztás).
 * Az adat (modellek, minták, zónák, árak) a src/data és src/pricing.js alatt
 * él; a komponensek csak megjelenítenek.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MODEL_ID, defaultYearFor } from './data/models/index.js';
import { DEFAULT_PATTERN_ID, UPLOAD_PATTERN_ID, getCategory } from './data/patterns/index.js';
import { zonesForPieces, zoneOfPiece } from './data/zones.js';
import { useScooterModel } from './hooks/useScooterModel.js';
import { labelColorFor } from './utils/color.js';
import { assetUrl } from './utils/assets.js';
import ScooterCanvas from './components/ScooterCanvas.jsx';
import PhotoCanvas from './components/PhotoCanvas.jsx';
import PatternGallery from './components/PatternGallery.jsx';
import FineTuneBar from './components/FineTuneBar.jsx';
import ZoneTargetChips, { TARGET_ALL } from './components/ZoneTargetChips.jsx';
import LabelControls from './components/LabelControls.jsx';
import CartPanel from './components/CartPanel.jsx';
import PriceBar from './components/PriceBar.jsx';
import ShareExportPanel from './components/ShareExportPanel.jsx';
import SaveSharePanel from './components/SaveSharePanel.jsx';
import QuickNav, { SECTIONS } from './components/QuickNav.jsx';
import Section from './components/Section.jsx';
import ZoneSelector from './components/ZoneSelector.jsx';
import ModelSection from './components/ModelSection.jsx';
import FootboardSection from './components/FootboardSection.jsx';
import DeliverySection from './components/DeliverySection.jsx';
import HelpLine from './components/HelpLine.jsx';
import FootboardEditor from './components/FootboardEditor.jsx';
import FullscreenPreview from './components/FullscreenPreview.jsx';
import LabelRotate from './components/LabelRotate.jsx';
import { getFootboardFlat } from './data/footboardFlat.js';
import SplitHandle from './components/SplitHandle.jsx';
import CanvasCoach, { coachSeen, markCoachSeen } from './components/CanvasCoach.jsx';
import AccountPanel from './account/AccountPanel.jsx';
import AdminView from './admin/AdminView.jsx';
import WishlistDialog from './components/WishlistDialog.jsx';
import { effectiveDpi, dpiVerdict } from './utils/printQuality.js';
import { getModelMeta } from './data/models/index.js';
import { useAccount } from './account/useAccount.js';
import { useMediaQuery, NARROW_QUERY } from './hooks/useMediaQuery.js';
import { useReportHeight } from './hooks/useReportHeight.js';
import { usePatternGesture } from './hooks/usePatternGesture.js';
import { useDesign, LAYER_BASE, LAYER_FOOTBOARD, zoneLayerKey, readLayer } from './design/useDesign.js';
import { renderLayers, zoneTiersOf, patternForLayer } from './design/layers.js';
import { newLabel, emptyDesign, DEFAULT_TRANSFORM } from './design/schema.js';
import { parseLocationHash, replaceLocationHash, hashForShare } from './design/share.js';
import { loadDesign } from './api/designs.js';
import { renderPreviewPng } from './utils/exportImage.js';
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
  calculatePrice, getTier, hasPrice, getZonePrices, getKitInfo, highestTier,
  FOOTBOARD_EXTRA_HUF, INSTALLATION_OPTIONS,
} from './pricing.js';
import { formatHuf } from './utils/format.js';
import { resolveLabelFont, resolveLabelColor } from './utils/labelStyle.js';

if (import.meta.env.DEV) logDevPriceTable();

/** Saját kép feltöltésénél a kép LÉNYEGE (középpontja) alapból erre a darabra kerül. */
const DEFAULT_FOCUS_PIECE_ID = 'deck-side';
/** Osztott nézet: a kép magassága %-ban csúszka-húzás közben (a legnagyobb előnézet). */
const SLIDER_PREVIEW_PCT = 70;
/** Ennyi idő után áll vissza a felosztás, miután a felhasználó elengedte a csúszkát. */
const SLIDER_RESTORE_MS = 1000;
/** Első mintaválasztáskor a Méret csúszka is kinyílik – utána már csak a chipsor. */
const FINETUNE_SEEN_KEY = 'scoover-finetune-seen-v1';

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
    info: 'A SOLID egyszínű, nyomtatás nélküli fólia a legkedvezőbb áron. A PRINT kész Scoover-grafika, azonnal választható. Az EGYEDI a te képedet teszi a rollerre – ez kézi ellenőrzéssel, drágábban készül. Zónánként más mintát is választhatsz („Melyik részre?”). A feliratok minden szinten ingyenesek.',
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
  // ---------------------------------------------------------------------
  // A TERV – egyetlen dokumentum (schema.js), reducerrel (useDesign.js)
  // ---------------------------------------------------------------------
  const design = useDesign({ model: DEFAULT_MODEL_ID, year: defaultYearFor(DEFAULT_MODEL_ID), patternId: DEFAULT_PATTERN_ID });
  const { doc, localImages, uploads, actions } = design;
  const modelId = doc.model;
  const year = doc.year;

  // --- felületi állapot ---
  const [hoveredId, setHoveredId] = useState(null);
  const [openSection, setOpenSection] = useState(SECTIONS[0].id);
  const [fullscreen, setFullscreen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [exploded, setExploded] = useState(false);
  /** Melyik részre megy a Stílus-választás: 'all' (az egész roller) vagy zónaId. */
  const [editTarget, setEditTarget] = useState(TARGET_ALL);
  /** Igazítás mód: a képen közvetlenül mozgatható a minta (usePatternGesture). */
  const [gestureMode, setGestureMode] = useState(false);
  const [finetunePanel, setFinetunePanel] = useState(null);
  const [coachVisible, setCoachVisible] = useState(false);
  const [footboardEditMode, setFootboardEditMode] = useState(false);
  /** Link/mentett terv betöltése indításkor: null | 'loading' | { error } */
  const [loadState, setLoadState] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  /** A fiók-panel előtöltése (kívánságlistából "Fiók létrehozása": e-mail, név, regisztráció fül). */
  const [accountPrefill, setAccountPrefill] = useState(null);
  /** Kívánságlista párbeszéd: "melyik rollerre kérnél fóliát?" */
  const [wishlistOpen, setWishlistOpen] = useState(false);
  /** Ügyfélszolgálati nézet (#admin) – a konfigurátor helyett. */
  const [adminMode, setAdminMode] = useState(() => typeof location !== 'undefined' && /^#admin\b/.test(location.hash));
  /** E-mailből jövő jelszó-visszaállító token (#reset=…) – a fiók-panel kéri be az új jelszót. */
  const [resetToken, setResetToken] = useState(null);
  /** Rövid, felül megjelenő üzenet (pl. "e-mail megerősítve"). */
  const [notice, setNotice] = useState(null);
  const account = useAccount();

  // --- Osztott nézet (keskeny képernyő): fent a tapadó előnézet ---
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const [splitPct, setSplitPct] = useState(45);
  const [splitDragging, setSplitDragging] = useState(false);
  const layoutRef = useRef(null);
  const topbarRef = useRef(null);
  useReportHeight(topbarRef, '--topbar-h');
  const splitBeforeSlider = useRef(null);
  const restoreTimer = useRef(null);
  const canvasWrapRef = useRef(null);
  /** a taposó-szerkesztő vászna – a taposó képként mentéséhez és a bélyegképhez */
  const footboardWrapRef = useRef(null);

  const { model, loading, error } = useScooterModel(modelId);
  const isTouch = useIsTouch();

  // ---------------------------------------------------------------------
  // Indítás: link (#id= / #d=) betöltése
  // ---------------------------------------------------------------------
  // a felosztás a <html>-en is kell (scroll-padding a tapadó sávokhoz – styles.css)
  useEffect(() => {
    document.documentElement.style.setProperty('--split-pct', String(splitPct));
  }, [splitPct]);

  useEffect(() => {
    const onHash = () => setAdminMode(/^#admin\b/.test(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (adminMode) return;
    // e-mailes linkek: #verify=<token> / #reset=<token>
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const verify = params.get('verify');
    const reset = params.get('reset');
    if (verify) {
      account.verifyEmail(verify)
        .then((r) => setNotice(r.message ?? 'Az e-mail címed megerősítve.'))
        .catch((e) => setNotice(e.message));
      replaceLocationHash('');
      return;
    }
    if (reset) { setResetToken(reset); setAccountOpen(true); replaceLocationHash(''); return; }

    const parsed = parseLocationHash();
    if (!parsed) return;
    if (parsed.error) { setLoadState({ error: parsed.error }); return; }
    if (parsed.doc) { actions.load(parsed.doc); return; }
    if (parsed.id) {
      setLoadState('loading');
      loadDesign(parsed.id)
        .then((r) => { actions.load({ ...r.design, id: r.id, title: r.title ?? r.design.title ?? null }); setLoadState(null); })
        .catch((e) => setLoadState({ error: `A(z) ${parsed.id} terv nem tölthető be: ${e.message}` }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ha a címsorban link van, tartsuk frissen a terv változásával (a linket
  // frissítéskor is ugyanaz a terv nyílik meg). Csak akkor, ha a felhasználó
  // már kért linket / linkről jött – enélkül a címsor tiszta marad.
  useEffect(() => {
    if (!design.dirty || !location.hash) return undefined;
    const t = setTimeout(() => {
      const parsed = parseLocationHash();
      if (parsed?.id && doc.id === parsed.id) return; // mentett terv: a link az azonosítóra mutat, azt a Mentés frissíti
      if (parsed?.doc || (parsed?.id && !doc.id)) replaceLocationHash(hashForShare({ doc }));
    }, 600);
    return () => clearTimeout(t);
  }, [doc, design.dirty]);

  // Modellváltáskor a felirat a modell alapértelmezett darabjára kerül, ha az
  // aktuális céldarab nem létezik az új modellen.
  useEffect(() => {
    if (!model) return;
    const def = model.pieces.find((p) => p.defaultLabel) ?? model.pieces[0];
    const fixed = doc.labels.map((l) =>
      (l.pieceId && model.pieces.some((p) => p.id === l.pieceId) ? l : { ...l, pieceId: def.id, dx: 0, dy: 0 }));
    if (fixed.some((l, i) => l !== doc.labels[i])) actions.setLabels(fixed);
  }, [model]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setHintDismissed(true), 8000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { trackConfiguratorOpened({ model: DEFAULT_MODEL_ID }); }, []);

  /** Modellváltás: az évjárat a modell legfrissebbjére áll, a taposó-szerkesztő bezárul. */
  const changeModel = useCallback((id) => {
    actions.setModel(id, defaultYearFor(id));
    setFootboardEditMode(false);
    setEditTarget(TARGET_ALL);
  }, [actions]);

  // Csúszka megfogásakor a panel automatikusan lecsúszik (a legtöbb látszódjon
  // az előnézetből), elengedés után 1 mp-cel visszaáll.
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

  const [sliderHint, setSliderHint] = useState(null);
  useEffect(() => {
    const onSlider = (e) => setSliderHint(e.detail.active ? { label: e.detail.label, text: e.detail.text } : null);
    window.addEventListener('scoover:slider', onSlider);
    return () => window.removeEventListener('scoover:slider', onSlider);
  }, []);

  const setSplitManually = useCallback((pct) => {
    clearTimeout(restoreTimer.current);
    splitBeforeSlider.current = null;
    setSplitPct(pct);
  }, []);

  // ---------------------------------------------------------------------
  // Zónák és taposó – ebből SZÁRMAZIK, mely darabok kapnak fóliát.
  // ---------------------------------------------------------------------
  const hasPhoto = Boolean(model?.photoView);
  const activeView = doc.view === 'photo' && hasPhoto ? 'photo' : 'schematic';
  const activePieces = activeView === 'photo' ? model.photoView.pieces : model?.pieces ?? [];
  const activeViewBox = activeView === 'photo' ? model?.photoView?.viewBox : model?.viewBox;

  const zones = useMemo(() => zonesForPieces(activePieces), [activePieces]);
  const availableZoneIds = useMemo(() => zones.map((z) => z.id), [zones]);
  const selectedZoneSet = useMemo(
    () => new Set(doc.selection.zones ?? availableZoneIds),
    [doc.selection.zones, availableZoneIds],
  );
  const selectedZoneIds = useMemo(
    () => availableZoneIds.filter((id) => selectedZoneSet.has(id)),
    [availableZoneIds, selectedZoneSet],
  );
  const isFullKit = zones.length > 0 && selectedZoneIds.length === zones.length;

  const footboardPiece = activePieces.find((p) => p.footboard) ?? null;
  const footboardPieceId = footboardPiece?.id ?? null;
  const includeFootboard = Boolean(footboardPieceId) && doc.selection.footboard;

  const disabledPieces = useMemo(() => {
    const off = new Set();
    for (const z of zones) if (!selectedZoneSet.has(z.id)) z.pieceIds.forEach((id) => off.add(id));
    if (footboardPieceId && !includeFootboard) off.add(footboardPieceId);
    return off;
  }, [zones, selectedZoneSet, footboardPieceId, includeFootboard]);

  const setFootboard = useCallback((on) => {
    if (!footboardPieceId) return;
    trackFootboardToggled(on);
    actions.setFootboard(on);
    if (!on) setFootboardEditMode(false);
  }, [footboardPieceId, actions]);

  const toggleZone = useCallback((zoneId) => {
    trackZoneToggled(zoneId, !selectedZoneSet.has(zoneId));
    actions.toggleZone(zoneId, availableZoneIds);
  }, [actions, availableZoneIds, selectedZoneSet]);
  const selectAllZones = useCallback(() => { trackKitToggled(true); actions.setZones(null); }, [actions]);
  const clearAllZones = useCallback(() => { trackKitToggled(false); actions.setZones([]); }, [actions]);

  /** Vászon-koppintás: a darab zónáját kapcsolja (a taposó a saját extráját). */
  const togglePiece = useCallback((pieceId) => {
    const piece = activePieces.find((p) => p.id === pieceId);
    setHintDismissed(true);
    if (!piece) return;
    if (piece.footboard) { setFootboard(!includeFootboard); return; }
    const zone = zoneOfPiece(piece);
    if (zone) toggleZone(zone.id);
  }, [activePieces, includeFootboard, setFootboard, toggleZone]);

  const hoveredPiece = activePieces.find((p) => p.id === hoveredId);

  // ---------------------------------------------------------------------
  // Stílus: melyik rétegre megy a választás, minta, feltöltés, igazítás
  // ---------------------------------------------------------------------
  const editLayerKey = editTarget === TARGET_ALL ? LAYER_BASE : zoneLayerKey(editTarget);
  const editLayer = readLayer(doc, editLayerKey);
  const editPattern = patternForLayer(editLayer, localImages[editLayerKey]);
  const editCategory = getCategory(editPattern?.category ?? 'solid');
  const overriddenZoneIds = useMemo(() => new Set(Object.keys(doc.style.zones)), [doc.style.zones]);
  const targetZone = editTarget === TARGET_ALL ? null : zones.find((z) => z.id === editTarget);
  const targetPieceIds = useMemo(
    () => (targetZone ? new Set(targetZone.pieceIds) : null),
    [targetZone],
  );
  // ha a modellen nincs meg a célzóna (modellváltás), vissza az egészre
  useEffect(() => {
    if (editTarget !== TARGET_ALL && zones.length && !zones.some((z) => z.id === editTarget)) setEditTarget(TARGET_ALL);
  }, [zones, editTarget]);

  /** Mintaválasztás után a finomhangolás "felugrik": igazítás mód + tanító buborék + (először) a Méret csúszka. */
  const revealFineTune = useCallback(() => {
    setGestureMode(true);
    if (!coachSeen()) setCoachVisible(true);
    let seen = false;
    try { seen = localStorage.getItem(FINETUNE_SEEN_KEY) === '1'; } catch { /* privát mód */ }
    if (!seen) {
      setFinetunePanel('scale');
      try { localStorage.setItem(FINETUNE_SEEN_KEY, '1'); } catch { /* privát mód */ }
    }
  }, []);

  const selectPattern = useCallback((patternId) => {
    if (editTarget === TARGET_ALL) {
      // "Az egész roller": a zónánkénti eltérések törlődnek, minden egyforma lesz
      if (Object.keys(doc.style.zones).length) actions.clearZoneOverrides();
      actions.setLayerPattern(LAYER_BASE, patternId);
    } else {
      actions.setLayerPattern(zoneLayerKey(editTarget), patternId);
    }
    revealFineTune();
  }, [editTarget, actions, doc.style.zones, revealFineTune]);

  /** Saját kép egy rétegre: helyi előnézet azonnal, az EREDETI fájl a szerverre. */
  const uploadToLayer = useCallback((layerKey, img, file) => {
    actions.setLayerImage(layerKey, {
      uploadPatternId: UPLOAD_PATTERN_ID, preview: img, image: null,
      focusPieceId: layerKey === LAYER_FOOTBOARD ? null : DEFAULT_FOCUS_PIECE_ID,
    });
    trackImageUploaded({ width: img?.originalWidth, height: img?.originalHeight, focusPieceId: DEFAULT_FOCUS_PIECE_ID });
    uploadCustomImage(file)
      .then(({ url, width, height }) => actions.layerUploaded(layerKey, { url, width, height }))
      .catch((e) => actions.layerUploadFailed(layerKey, e.message));
  }, [actions]);

  const handleUpload = useCallback((img, file) => {
    if (editTarget === TARGET_ALL && Object.keys(doc.style.zones).length) actions.clearZoneOverrides();
    uploadToLayer(editLayerKey, img, file);
    revealFineTune();
  }, [editTarget, editLayerKey, doc.style.zones, actions, uploadToLayer, revealFineTune]);
  const handleClearUpload = useCallback(() => actions.clearLayerImage(editLayerKey, DEFAULT_PATTERN_ID), [actions, editLayerKey]);

  const setEditTransform = useCallback((patch) => actions.setLayerTransform(editLayerKey, patch), [actions, editLayerKey]);

  const gesture = usePatternGesture({
    enabled: gestureMode && !footboardEditMode && Boolean(model),
    transform: editLayer.transform,
    onChange: setEditTransform,
    onGestureStart: () => { setCoachVisible(false); markCoachSeen(); },
    wheelRef: canvasWrapRef,
  });
  const dismissCoach = useCallback(() => { setCoachVisible(false); markCoachSeen(); }, []);

  /** Saját kép nyomtatási minősége az aktuális nagyítással (a szerver ugyanezt számolja a manifestbe). */
  const dpiInfo = useMemo(() => {
    if (editLayer.patternId !== UPLOAD_PATTERN_ID) return null;
    const local = localImages[editLayerKey];
    const px = editLayer.image ?? (local ? { width: local.originalWidth ?? local.width, height: local.originalHeight ?? local.height } : null);
    const mmPerUnit = getModelMeta(modelId)?.printScale?.[activeView];
    return dpiVerdict(effectiveDpi(px, activeViewBox, editLayer.transform.scale, mmPerUnit));
  }, [editLayer, localImages, editLayerKey, modelId, activeView, activeViewBox]);

  /** A fő darab választható értékei: darab-csoportonként EGY sor, a taposó nélkül. */
  const focusPieceOptions = useMemo(() => {
    const seen = new Set();
    return activePieces
      .filter((p) => !p.footboard)
      .filter((p) => { const key = p.priceGroup ?? p.id; if (seen.has(key)) return false; seen.add(key); return true; })
      .map((p) => ({ id: p.id, name: p.name }));
  }, [activePieces]);

  // ---------------------------------------------------------------------
  // Rétegek a vászonnak, szintek, feliratok
  // ---------------------------------------------------------------------
  const { layers, layerOfPiece } = useMemo(
    () => renderLayers(doc, activePieces, activeViewBox, localImages, { includeFootboard }),
    [doc, activePieces, activeViewBox, localImages, includeFootboard],
  );
  const zoneTiers = useMemo(() => zoneTiersOf(doc, selectedZoneIds), [doc, selectedZoneIds]);
  const baseTier = layers.find((l) => l.key === LAYER_BASE)?.tier ?? 'solid';
  /** A rendelés szintje: a kiválasztott zónák legmagasabbja (kevert designnál a szett ára is eszerint). */
  const tier = highestTier(selectedZoneIds.length ? selectedZoneIds.map((z) => zoneTiers[z]) : [baseTier]);
  const isMixed = overriddenZoneIds.size > 0;

  const firstTier = useRef(true);
  useEffect(() => {
    if (firstTier.current) { firstTier.current = false; return; }
    trackTierSelected(tier);
  }, [tier]);
  const firstPattern = useRef(true);
  useEffect(() => {
    if (firstPattern.current) { firstPattern.current = false; return; }
    if (editPattern && editLayer.patternId !== UPLOAD_PATTERN_ID) trackPatternSelected(editPattern);
  }, [editLayer.patternId]); // eslint-disable-line react-hooks/exhaustive-deps

  // A felirat színe/betűje a darab ALATTI réteg mintájából jön.
  const renderLabels = useMemo(() => doc.labels.map((l) => {
    const layer = layers.find((x) => x.key === layerOfPiece[l.pieceId]) ?? layers[0];
    const cat = layer?.category ?? getCategory('solid');
    return {
      ...l,
      font: resolveLabelFont(l, cat.labelFont),
      color: resolveLabelColor(l, labelColorFor(layer?.pattern)),
    };
  }), [doc.labels, layers, layerOfPiece]);

  const addLabel = useCallback(() => {
    const def = model?.pieces.find((p) => p.defaultLabel) ?? model?.pieces[0];
    actions.addLabel(newLabel(doc.labels.length ? 'G2' : 'SCOOVER', def?.id ?? null));
  }, [model, actions, doc.labels.length]);

  // --- Taposó saját rétege ---
  const footboardLayer = doc.footboard;
  const footboardPattern = patternForLayer(footboardLayer, localImages[LAYER_FOOTBOARD]);
  const footboardCategory = getCategory(footboardPattern?.category ?? 'solid');
  const footboardAutoColor = labelColorFor(footboardPattern);
  const footboardLabel = doc.footboard.label;
  const footboardFlat = getFootboardFlat(model);
  const renderFootboardLabel = {
    ...footboardLabel,
    font: resolveLabelFont(footboardLabel, footboardCategory.labelFont),
    color: resolveLabelColor(footboardLabel, footboardAutoColor),
  };
  const uploadsPending = Object.values(uploads).some((u) => u?.uploading);

  // ---------------------------------------------------------------------
  // Árak: MINDEN a központi src/pricing.js-ből
  // ---------------------------------------------------------------------
  const priced = Boolean(model) && hasPrice(modelId);
  const exportPrice = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation: doc.installation, selectedZoneIds, availableZoneIds, zoneTiers })
    : null;
  const allZoneTiers = useMemo(() => zoneTiersOf(doc, availableZoneIds), [doc, availableZoneIds]);
  const zonePrices = useMemo(
    () => (priced ? Object.fromEntries(getZonePrices(modelId, tier, availableZoneIds, allZoneTiers).map((z) => [z.id, z.price])) : {}),
    [priced, modelId, tier, availableZoneIds, allZoneTiers],
  );
  const kitInfo = priced ? getKitInfo(modelId, tier, availableZoneIds, allZoneTiers) : { listSum: 0, kitPrice: 0, savings: 0 };
  const minimumOrder = exportPrice ? exportPrice.minimumOrder : { ok: true };

  // ---------------------------------------------------------------------
  // Szekciók
  // ---------------------------------------------------------------------
  const showSection = useCallback((id) => {
    setFootboardEditMode(false);
    setOpenSection(id);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);
  const toggleSection = useCallback((id) => setOpenSection((cur) => (cur === id ? null : id)), []);
  const nextSectionId = (id) => SECTIONS[SECTIONS.findIndex((s) => s.id === id) + 1]?.id ?? null;
  const nextButton = (id) => {
    const next = nextSectionId(id);
    return next ? (
      <button type="button" className="btn btn-next" onClick={() => showSection(next)}>
        Tovább: {SECTION_TEXT[next].title} →
      </button>
    ) : null;
  };
  const goToCart = useCallback(() => {
    showSection('section-delivery');
    setTimeout(() => document.querySelector('.cart-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
  }, [showSection]);

  const startFootboardDesign = useCallback(() => {
    if (!includeFootboard) setFootboard(true);
    setFootboardEditMode(true);
    setGestureMode(false);
    if (isNarrow) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [includeFootboard, setFootboard, isNarrow]);

  /** A mentett terv bélyegképe (fiók, munkalap) – az aktuális vászonból. */
  const renderPreview = useCallback(async () => {
    // taposó-szerkesztés közben a roller vászna nincs a DOM-ban – ilyenkor a taposó a bélyegkép
    const svgEl = (canvasWrapRef.current ?? footboardWrapRef.current)?.querySelector('svg.scooter-canvas');
    return svgEl ? renderPreviewPng(svgEl) : null;
  }, []);

  /** Új, üres terv (a fiókból vagy a "Terveim"-ből nyitott terv helyett). */
  const startNewDesign = useCallback(() => {
    actions.reset(emptyDesign({ model: DEFAULT_MODEL_ID, year: defaultYearFor(DEFAULT_MODEL_ID), patternId: DEFAULT_PATTERN_ID }));
    replaceLocationHash('');
    setEditTarget(TARGET_ALL);
    setFootboardEditMode(false);
  }, [actions]);
  const openSavedDesign = useCallback((saved) => {
    actions.load({ ...saved.design, id: saved.id, title: saved.title ?? null });
    replaceLocationHash(hashForShare({ id: saved.id }));
    setEditTarget(TARGET_ALL);
    setFootboardEditMode(false);
    setAccountOpen(false);
  }, [actions]);

  // ---------------------------------------------------------------------
  // Vászon
  // ---------------------------------------------------------------------
  const canvasEl = !model ? null : activeView === 'photo' ? (
    <PhotoCanvas
      view={model.photoView}
      modelName={model.name}
      layers={layers}
      layerOfPiece={layerOfPiece}
      sizeAwareTiling={doc.options.sizeAwareTiling}
      showCutLines={doc.options.showCutLines}
      disabledPieces={disabledPieces}
      hoveredId={hoveredId}
      onHover={setHoveredId}
      onTogglePiece={togglePiece}
      labels={renderLabels}
      onLabelDrag={actions.updateLabel}
      targetPieceIds={targetPieceIds}
      gesture={gesture}
    />
  ) : (
    <ScooterCanvas
      model={model}
      layers={layers}
      layerOfPiece={layerOfPiece}
      sizeAwareTiling={doc.options.sizeAwareTiling}
      exploded={exploded}
      showCutLines={doc.options.showCutLines}
      disabledPieces={disabledPieces}
      hoveredId={hoveredId}
      onHover={setHoveredId}
      onTogglePiece={togglePiece}
      labels={renderLabels}
      onLabelDrag={actions.updateLabel}
      targetPieceIds={targetPieceIds}
      gesture={gesture}
    />
  );

  const tierName = getTier(tier)?.name ?? tier;
  const editPatternName = editLayer.patternId === UPLOAD_PATTERN_ID ? 'Saját kép' : (editPattern?.name ?? '–');
  const styleSummary = isMixed
    ? `Kevert · ${overriddenZoneIds.size} zóna eltér`
    : editPatternName;

  const belowCanvasEl = !model ? null : (
    <>
      <div className="stage-footer">
        <div>
          <strong>{model.name}</strong>
          <span className="muted"> · {year} · {selectedZoneIds.length} / {zones.length} zóna fóliázva{includeFootboard ? ' + taposó' : ''}</span>
        </div>
        {hoveredPiece ? (
          <div className="hover-label">{hoveredPiece.name}</div>
        ) : gestureMode && !footboardEditMode ? (
          <div className="hover-label gesture">
            {isTouch ? 'Húzd · csippentsd · forgasd a mintát a képen' : 'Húzd a mintát · görgő = méret · Shift+görgő = forgatás'}
          </div>
        ) : isTouch && hintDismissed ? (
          <button type="button" className="hint-icon" title="Hogyan használd?"
            aria-label="Súgó" onClick={() => setHintDismissed(false)}>ⓘ</button>
        ) : (
          <div className="hover-label">
            {isTouch ? 'Koppints egy zónára a képen a ki-/bekapcsoláshoz' : 'Kattints egy zónára a képen a ki-/bekapcsoláshoz'}
          </div>
        )}
      </div>

      {exportPrice && (
        <div className="below-actions">
          <ShareExportPanel
            canvasWrapRef={canvasWrapRef}
            modelName={model.name}
            tierLabel={tierName}
            patternName={isMixed ? 'Kevert design' : editPatternName}
            priceText={formatHuf(exportPrice.total)}
          />
          <SaveSharePanel
            doc={doc}
            onSaved={actions.setId}
            renderPreview={renderPreview}
            user={account.user}
            onRequireLogin={() => setAccountOpen(true)}
            modelName={model.name}
            tierLabel={tierName}
          />
        </div>
      )}
    </>
  );

  /** Taposó-szerkesztés közben is menthető legyen a terv: kép a taposóról, link, fiók. */
  const footboardPatternName = footboardLayer.patternId === UPLOAD_PATTERN_ID ? 'Saját kép' : (footboardPattern?.name ?? '–');
  const footboardActionsEl = !model || !exportPrice ? null : (
    <div className="below-actions footboard-actions">
      <ShareExportPanel
        canvasWrapRef={footboardWrapRef}
        modelName={`${model.name} taposó`}
        tierLabel={tierName}
        patternName={footboardPatternName}
        priceText={formatHuf(exportPrice.total)}
        buttonText="📸 Mentsd le a taposó tervét!"
      />
      <SaveSharePanel
        doc={doc}
        onSaved={actions.setId}
        renderPreview={renderPreview}
        user={account.user}
        onRequireLogin={() => setAccountOpen(true)}
        modelName={model.name}
        tierLabel={tierName}
      />
    </div>
  );

  const installationName = INSTALLATION_OPTIONS.find((o) => o.id === doc.installation)?.name ?? '';
  const summaries = {
    'section-model': model ? `${model.name} · ${year ?? ''}` : '…',
    'section-style': styleSummary,
    'section-zones': isFullKit ? 'Teljes szett' : `${selectedZoneIds.length}/${zones.length} zóna`,
    'section-footboard': includeFootboard ? `+${formatHuf(FOOTBOARD_EXTRA_HUF)}` : 'Nincs',
    'section-delivery': doc.installation === 'none' ? 'Postázás' : `Felrakás · ${installationName}`,
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

  if (adminMode) {
    return (
      <div className="app">
        <header className="topbar" ref={topbarRef}>
          <div className="brand">
            <img src={assetUrl('brand/scoover-logo.svg')} alt="Scoover" className="brand-logo" />
            <h1>Scoover · ügyfélszolgálat</h1>
          </div>
        </header>
        <AdminView user={account.user} onExit={() => { replaceLocationHash(''); setAdminMode(false); }} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar" ref={topbarRef}>
        <div className="brand">
          <img src={assetUrl('brand/scoover-logo.svg')} alt="Scoover" className="brand-logo" />
          <h1>Scoover fólia-konfigurátor</h1>
        </div>
        <div className="topbar-right">
          {model && <span className="topbar-model muted small">{model.name} · {year}{doc.id ? ` · ${doc.id}` : ''}</span>}
          <button type="button" className={`btn btn-secondary account-btn${account.user ? ' logged' : ''}`}
            onClick={() => setAccountOpen(true)} title={account.user ? account.user.email : 'Belépés vagy regisztráció'}>
            {account.user ? `👤 ${account.user.name?.split(' ')[0] || 'Fiókom'}` : '👤 Belépés'}
          </button>
        </div>
      </header>

      {notice && (
        <div className="notice-bar" role="status">
          <span>{notice}</span>
          <button type="button" className="link" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}

      {wishlistOpen && (
        <WishlistDialog
          user={account.user}
          onClose={() => setWishlistOpen(false)}
          onRegister={(prefill) => { setWishlistOpen(false); setAccountPrefill({ ...prefill, mode: 'register', tab: 'scooters' }); setAccountOpen(true); }}
        />
      )}

      {accountOpen && (
        <AccountPanel
          account={account}
          prefill={accountPrefill}
          onWishlist={() => { setAccountOpen(false); setWishlistOpen(true); }}
          resetToken={resetToken}
          onResetDone={() => setResetToken(null)}
          onClose={() => { setAccountOpen(false); setResetToken(null); setAccountPrefill(null); }}
          currentDoc={doc}
          onOpenDesign={openSavedDesign}
          onNewDesign={() => { startNewDesign(); setAccountOpen(false); }}
          onPickScooter={(s) => { changeModel(s.modelId); if (s.year) actions.setYear(s.year); setAccountOpen(false); }}
        />
      )}

      <main
        className={`layout${splitDragging ? ' dragging' : ''}`}
        ref={layoutRef}
        style={{ '--split-pct': splitPct }}
      >
        <section className="stage">
          {error && <p className="error">Hiba a modell betöltésekor: {error.message}</p>}
          {!model && loading && <p className="muted">Modell betöltése…</p>}
          {loadState === 'loading' && <p className="muted small">Mentett terv betöltése…</p>}
          {loadState?.error && <p className="error small">{loadState.error}</p>}
          {model && (
            <>
              {!footboardEditMode && (
                <div className={`canvas-wrap${gestureMode ? ' adjust' : ''}`} ref={canvasWrapRef}>
                  {canvasEl}
                  {hasPhoto && (
                    <div className="view-switch" role="tablist">
                      <button type="button" role="tab" aria-selected={activeView === 'schematic'}
                        className={activeView === 'schematic' ? 'active' : ''} onClick={() => actions.setView('schematic')}>Vázlat</button>
                      <button type="button" role="tab" aria-selected={activeView === 'photo'}
                        className={activeView === 'photo' ? 'active' : ''} onClick={() => actions.setView('photo')}>Fotó</button>
                    </div>
                  )}
                  <button type="button" className="canvas-icon-btn" title="Teljes képernyős előnézet"
                    aria-label="Teljes képernyős előnézet" onClick={() => setFullscreen(true)}>⛶</button>

                  {gestureMode && (
                    <div className="canvas-adjust-bar">
                      <span className="cab-title">✋ Igazítás{targetZone ? ` · ${targetZone.name}` : ''}</span>
                      <button type="button" className="link" onClick={() => setEditTransform({ ...DEFAULT_TRANSFORM })}>Alaphelyzet</button>
                      <button type="button" className="btn cab-done" onClick={() => setGestureMode(false)}>Kész</button>
                    </div>
                  )}
                  {gestureMode && coachVisible && <CanvasCoach onDismiss={dismissCoach} />}

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
                <FullscreenPreview title={`${model.name} · ${isMixed ? 'kevert design' : editPatternName}`} onClose={() => setFullscreen(false)}>
                  {canvasEl}
                </FullscreenPreview>
              )}

              {footboardEditMode ? (
                <FootboardEditor
                  model={model}
                  piece={footboardPiece}
                  pattern={footboardPattern}
                  transform={footboardLayer.transform}
                  label={renderFootboardLabel}
                  onLabelDrag={(d) => actions.setFootboardLabel(d)}
                  onLabelChange={(patch) => actions.setFootboardLabel(patch)}
                  wrapRef={footboardWrapRef}
                  price={FOOTBOARD_EXTRA_HUF}
                  onBack={() => setFootboardEditMode(false)}
                  actions={!isNarrow ? footboardActionsEl : null}
                />
              ) : (
                !isNarrow && belowCanvasEl
              )}
            </>
          )}
        </section>

        {isNarrow && model && (
          <SplitHandle pct={splitPct} onChange={setSplitManually} onDragStateChange={setSplitDragging} />
        )}

        <aside className="sidebar">
          {model && !footboardEditMode && (
            <PriceBar
              modelId={modelId}
              modelName={model.name}
              tier={tier}
              includeFootboard={includeFootboard}
              installation={doc.installation}
              selectedZoneIds={selectedZoneIds}
              availableZoneIds={availableZoneIds}
              zoneTiers={zoneTiers}
              onGoToCart={isNarrow && openSection !== 'section-delivery' ? goToCart : null}
            />
          )}

          {model && !footboardEditMode && (
            <QuickNav activeId={openSection} onSelect={showSection} />
          )}

          {isNarrow && !footboardEditMode && belowCanvasEl}

          {footboardEditMode ? (
            <div className="footboard-tools">
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
                    selectedId={footboardLayer.patternId}
                    onSelect={(id) => actions.setLayerPattern(LAYER_FOOTBOARD, id)}
                    uploadedPattern={localImages[LAYER_FOOTBOARD] ?? (footboardLayer.image ? footboardPattern : null)}
                    onUpload={(img, file) => uploadToLayer(LAYER_FOOTBOARD, img, file)}
                    onClear={() => actions.clearLayerImage(LAYER_FOOTBOARD, DEFAULT_PATTERN_ID)}
                    uploadStatus={uploads[LAYER_FOOTBOARD]}
                  />
                </div>
              </section>

              <section className="card open">
                <div className="card-head static"><span className="card-title">Taposó – nagyítás, forgatás, eltolás</span></div>
                <div className="card-body controls">
                  <Slider label="Méret" value={footboardLayer.transform.scale} min={0.25} max={3} step={0.05}
                    onChange={(v) => actions.setLayerTransform(LAYER_FOOTBOARD, { scale: v })} format={(v) => `${v.toFixed(2)}×`} />
                  <Slider label="Forgatás" value={footboardLayer.transform.rotate} min={0} max={360} step={1}
                    onChange={(v) => actions.setLayerTransform(LAYER_FOOTBOARD, { rotate: v })} format={(v) => `${v}°`} />
                  <Slider label="Eltolás X" value={footboardLayer.transform.dx} min={-300} max={300} step={1}
                    onChange={(v) => actions.setLayerTransform(LAYER_FOOTBOARD, { dx: v })} />
                  <Slider label="Eltolás Y" value={footboardLayer.transform.dy} min={-300} max={300} step={1}
                    onChange={(v) => actions.setLayerTransform(LAYER_FOOTBOARD, { dy: v })} />
                  <div className="control-row">
                    <button type="button" className="link" onClick={() => actions.setLayerTransform(LAYER_FOOTBOARD, { ...DEFAULT_TRANSFORM })}>Alaphelyzet</button>
                  </div>
                </div>
              </section>

              <section className="card open">
                <div className="card-head static"><span className="card-title">Taposó – felirat</span></div>
                <div className="card-body controls">
                  <label className="check">
                    <input type="checkbox" checked={footboardLabel.enabled}
                      onChange={(e) => actions.setFootboardLabel({ enabled: e.target.checked })} />
                    Felirat a taposón
                  </label>
                  <label className="field">
                    <span>Szöveg</span>
                    <input type="text" value={footboardLabel.text} maxLength={24} placeholder="SCOOVER"
                      onChange={(e) => actions.setFootboardLabel({ text: e.target.value })} />
                  </label>
                  <Slider label="Méret" value={footboardLabel.scale} min={0.3} max={2} step={0.05}
                    onChange={(v) => actions.setFootboardLabel({ scale: v })} format={(v) => `${Math.round(v * 100)}%`} />
                  {/* az eltolás mm-ben, a taposó valós méretéhez: a széléig el lehessen vinni */}
                  <Slider label="Eltolás X" value={footboardLabel.dx} min={-Math.round(footboardFlat.widthMm / 2)} max={Math.round(footboardFlat.widthMm / 2)} step={1}
                    onChange={(v) => actions.setFootboardLabel({ dx: v })} format={(v) => `${v} mm`} />
                  <Slider label="Eltolás Y" value={footboardLabel.dy} min={-Math.round(footboardFlat.heightMm / 2)} max={Math.round(footboardFlat.heightMm / 2)} step={1}
                    onChange={(v) => actions.setFootboardLabel({ dy: v })} format={(v) => `${v} mm`} />
                  <LabelRotate value={footboardLabel.rotate} onChange={(v) => actions.setFootboardLabel({ rotate: v })} />
                  <FontColorPicker
                    label={footboardLabel}
                    categoryFont={footboardCategory.labelFont}
                    autoColor={footboardAutoColor}
                    onChange={(patch) => actions.setFootboardLabel(patch)}
                  />
                </div>
              </section>

              {isNarrow && footboardActionsEl}

              <button type="button" className="btn btn-outline" onClick={() => setFootboardEditMode(false)}>
                ← Vissza a teljes rollerhez
              </button>
            </div>
          ) : model && (
            <div className="cards">
              <Section {...sectionProps('section-model')} footer={nextButton('section-model')}>
                <ModelSection modelId={modelId} onModelChange={changeModel} year={year} onYearChange={actions.setYear}
                  onWishlist={() => setWishlistOpen(true)} />
              </Section>

              <Section {...sectionProps('section-style')} footer={nextButton('section-style')}>
                {zones.length > 1 && (
                  <ZoneTargetChips
                    zones={zones}
                    target={editTarget}
                    onTarget={setEditTarget}
                    overriddenIds={overriddenZoneIds}
                    onResetZone={(zoneId) => { actions.removeZoneOverride(zoneId); if (editTarget === zoneId) setEditTarget(TARGET_ALL); }}
                    onHover={setHoveredId}
                  />
                )}
                <PatternGallery
                  key={editLayerKey}
                  selectedId={editLayer.patternId}
                  onSelect={selectPattern}
                  uploadedPattern={localImages[editLayerKey] ?? (editLayer.image ? editPattern : null)}
                  onUpload={handleUpload}
                  onClear={handleClearUpload}
                  uploadStatus={uploads[editLayerKey]}
                  focusPieceId={editLayer.focusPieceId ?? DEFAULT_FOCUS_PIECE_ID}
                  onFocusPieceChange={(id) => actions.setLayerFocus(editLayerKey, id)}
                  focusPieceOptions={focusPieceOptions}
                  dpiInfo={dpiInfo}
                />
                <FineTuneBar
                  transform={editLayer.transform}
                  onTransformChange={setEditTransform}
                  gestureMode={gestureMode}
                  onGestureModeChange={(on) => { setGestureMode(on); if (on && !coachSeen()) setCoachVisible(true); }}
                  openPanel={finetunePanel}
                  onOpenPanelChange={setFinetunePanel}
                  isTiled={editPattern?.type === 'image-tile' || editPattern?.type === 'tile'}
                  sizeAwareTiling={doc.options.sizeAwareTiling}
                  onSizeAwareTilingChange={(v) => actions.setOptions({ sizeAwareTiling: v })}
                  exploded={exploded}
                  onExplodedChange={setExploded}
                  canExplode={activeView === 'schematic'}
                  showCutLines={doc.options.showCutLines}
                  onShowCutLinesChange={(v) => actions.setOptions({ showCutLines: v })}
                  targetName={targetZone?.name ?? null}
                />
                <details className="sub">
                  <summary>Feliratok ({doc.labels.length})</summary>
                  <LabelControls
                    labels={doc.labels}
                    onChange={actions.updateLabel}
                    onAdd={addLabel}
                    onRemove={actions.removeLabel}
                    pieces={activePieces.filter((p) => !disabledPieces.has(p.id))}
                    font={editCategory.labelFont}
                    autoColor={labelColorFor(editPattern)}
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
                <DeliverySection installation={doc.installation} onInstallationChange={actions.setInstallation} />
                <div className="cart-box">
                  <h4>Kosárba teszem</h4>
                  <CartPanel
                    doc={doc}
                    modelName={model.name}
                    tier={tier}
                    availableZoneIds={availableZoneIds}
                    zoneTiers={zoneTiers}
                    uploadsPending={uploadsPending}
                    onSaved={actions.setId}
                  />
                </div>
              </Section>
            </div>
          )}

          <div className="help-line-wrap"><HelpLine onWishlist={() => setWishlistOpen(true)} /></div>
        </aside>
      </main>
    </div>
  );
}

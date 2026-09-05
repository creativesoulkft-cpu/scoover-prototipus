/**
 * Állandóan látható ársáv: mindig az aktuális végösszeget mutatja, és élőben
 * frissül, ahogy a felhasználó modellt, szintet vagy extrát vált.
 *
 * A bontás (alapár, darabkedvezmény, taposó, felrakás, végösszeg) ALAPBÓL
 * NYITVA van – a vevőnek látnia kell, miből jön ki az ár, nem egy gomb mögé
 * rejtve. Darab ki-/bekapcsolásakor egy rövid, animált "−4 200 Ft" jelzés
 * mutatja a döntés hatását.
 *
 * Asztali nézetben a konfigurátor-oszlop tetejére tapad, mobilon a képernyő
 * aljára rögzül (a bontás ilyenkor felfelé nyílik – lásd styles.css). A saját
 * magasságát `--price-bar-h` CSS-változóba írja, hogy a mobil oldalsáv alsó
 * térköze pontosan ennyi + 24px legyen, és semmi ne csússzon alá.
 *
 * Minden összeg a központi src/pricing.js-ből jön; itt nincs árazási logika.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  calculatePrice, getTier, hasPrice, FOOTBOARD_EXTRA_HUF,
  INSTALLATION_OPTIONS, INSTALLATION_NOTE, getPartialPricingInfo,
} from '../pricing.js';
import { formatHuf } from '../utils/format.js';

function Row({ label, amount, muted, children }) {
  return (
    <div className={`pb-row${muted ? ' muted' : ''}`}>
      <div className="pb-row-label">{label}{children}</div>
      <span className="pb-row-amount">{amount}</span>
    </div>
  );
}

/** A sáv tényleges magassága → CSS-változó (a mobil oldalsáv alsó térköze ebből számol). */
function useReportHeight(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const write = () => document.documentElement.style.setProperty('--price-bar-h', `${el.offsetHeight}px`);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, [ref]);
}

/** Az utolsó ár-változás nagysága, ~1,6 másodpercre (animált visszajelzéshez). */
function usePriceDelta(total) {
  const prev = useRef(total);
  const [delta, setDelta] = useState(null);
  /** Betöltéskor a modell adataiból induló ár-beállások (pl. a taposó
   *  alapértelmezett kikapcsolása) nem a vevő döntései – ezeket nem jelezzük. */
  const settled = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { settled.current = true; }, 1200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const d = total - prev.current;
    prev.current = total;
    if (!d || !settled.current) return undefined;
    // kulcs: minden változás új animációt indítson akkor is, ha ugyanaz az összeg
    setDelta({ value: d, key: Date.now() });
    const t = setTimeout(() => setDelta(null), 1600);
    return () => clearTimeout(t);
  }, [total]);
  return delta;
}

export default function PriceBar({
  modelId, modelName, tier,
  includeFootboard, onFootboardChange, hasFootboardPiece,
  installation, onInstallationChange,
  selectedGroupIds, totalGroupCount,
}) {
  const [open, setOpen] = useState(true);
  const barRef = useRef(null);
  useReportHeight(barRef);

  const priced = hasPrice(modelId);
  const price = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, selectedGroupIds })
    : null;
  const delta = usePriceDelta(price?.total ?? 0);

  if (!priced) {
    return (
      <div className="price-bar" ref={barRef}>
        <div className="pb-main">
          <div className="pb-total">
            <span className="muted small">Ehhez a modellhez még nincs árlista</span>
          </div>
        </div>
      </div>
    );
  }

  const tierName = getTier(tier)?.name ?? tier;
  const installationName = INSTALLATION_OPTIONS.find((o) => o.id === installation)?.name ?? 'Nem kérem';
  const selectedCount = selectedGroupIds?.length ?? totalGroupCount ?? 0;
  const info = selectedGroupIds?.length ? getPartialPricingInfo(modelId, tier, selectedGroupIds) : null;
  /** Mennyivel jár jobban a teljes kittel a darabonkénti listaárakhoz képest. */
  const kitSavings = info?.kitPrice != null ? info.listSum - info.kitPrice : 0;
  /** Darabonkénti módban: a listaár-összeghez képest most adott kedvezmény. */
  const pieceDiscount = info && !price.isFullKit ? info.selectedListSum - info.total : 0;

  return (
    <div className="price-bar" ref={barRef}>
      <div className="pb-main">
        <div className="pb-total">
          <span className="muted small">{modelName} · {tierName}{!price.isFullKit && ` · ${selectedCount}/${totalGroupCount} darab`}</span>
          <strong className="pb-amount">
            {formatHuf(price.total)}
            {info && !price.isFullKit && info.discountPct > 0 && (
              <span className="pb-discount-badge">-{info.discountPct}%</span>
            )}
            {delta && (
              <span key={delta.key} className={`pb-delta${delta.value < 0 ? ' down' : ' up'}`}>
                {delta.value < 0 ? '−' : '+'}{formatHuf(Math.abs(delta.value))}
              </span>
            )}
          </strong>
        </div>
        <button
          type="button"
          className="pb-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Bontás elrejtése' : 'Miből áll össze?'}
        </button>
      </div>

      {!price.minimumOrder.ok && (
        <p className="error small pb-min-warning">{price.minimumOrder.message}</p>
      )}

      {kitSavings > 0 && (
        <div className={`pb-savings${price.isFullKit ? ' earned' : ''}`}>
          {price.isFullKit
            ? <>Teljes kit: <strong>{formatHuf(kitSavings)}</strong> megtakarítás a darabárakhoz képest ✓</>
            : <>Megtakarításod a teljes kittel: <strong>{formatHuf(kitSavings)}</strong> a darabárakhoz képest</>}
        </div>
      )}

      {open && (
        <div className="pb-details">
          <Row
            label={price.isFullKit
              ? `Alapár · ${tierName} (teljes kit)`
              : `Darabonkénti alapár · ${selectedCount}/${totalGroupCount} darab (listaáron)`}
            amount={formatHuf(price.isFullKit ? price.base : info.selectedListSum)}
          />

          {!price.isFullKit && pieceDiscount > 0 && (
            <Row
              label={`Darabkedvezmény (${info.discountPct}%)`}
              amount={`−${formatHuf(pieceDiscount)}`}
            />
          )}

          {hasFootboardPiece && (
            <Row
              label={(
                <label className="check">
                  <input
                    type="checkbox"
                    checked={includeFootboard}
                    onChange={(e) => onFootboardChange(e.target.checked)}
                  />
                  Taposófelület (csúszásgátló)
                </label>
              )}
              amount={includeFootboard ? `+${formatHuf(FOOTBOARD_EXTRA_HUF)}` : '–'}
              muted={!includeFootboard}
            />
          )}

          <Row
            label={(
              <label className="check">
                <input
                  type="checkbox"
                  checked={installation !== 'none'}
                  onChange={(e) => onInstallationChange(e.target.checked ? 'normal' : 'none')}
                />
                Kérem a felrakást is
              </label>
            )}
            amount={price.installation ? `+${formatHuf(price.installation)}` : '–'}
            muted={installation === 'none'}
          />

          {installation !== 'none' && (
            <div className="pb-install-options">
              <div className="chip-row">
                {INSTALLATION_OPTIONS.filter((o) => o.id !== 'none').map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`chip${installation === o.id ? ' active' : ''}`}
                    onClick={() => onInstallationChange(o.id)}
                  >
                    {o.name} · {formatHuf(o.price)}
                  </button>
                ))}
              </div>
              <p className="muted small">{INSTALLATION_NOTE}</p>
            </div>
          )}

          <div className="pb-row pb-sum">
            <strong>Végösszeg</strong>
            <strong>{formatHuf(price.total)}</strong>
          </div>
          <p className="muted small">Az árak bruttó, forintos árak. Kiválasztott felrakás: {installationName}.</p>
        </div>
      )}
    </div>
  );
}

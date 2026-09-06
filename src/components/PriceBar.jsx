/**
 * Állandóan látható ársáv – MINDIG pontosan két szám:
 *
 *   Kiválasztva: 26 800 Ft · Egyben: 39 900 Ft (−28 100)
 *
 * "Kiválasztva" = a mostani választás végösszege (zónák/szett + taposó +
 * felrakás). "Egyben" = ugyanez a teljes fólia szettel, mellette zárójelben
 * a szett megtakarítása a zónák külön-külön árához képest. Ha minden zóna ki
 * van választva (teljes szett), a második szám ELTŰNIK – nincs mit spórolni.
 *
 * Kinyitva tételes bontás: zónák (vagy a szett egy sorban), taposó, felrakás,
 * végösszeg. Asztalin a konfigurátor-oszlop tetejére tapad, mobilon a
 * képernyő aljára rögzül (a bontás felfelé nyílik – lásd styles.css). A saját
 * magasságát `--price-bar-h`-ba írja, hogy semmi ne csússzon alá.
 *
 * Minden összeg a központi src/pricing.js-ből; itt nincs árazási logika.
 */
import { useEffect, useRef, useState } from 'react';
import { calculatePrice, getTier, hasPrice, INSTALLATION_OPTIONS } from '../pricing.js';
import { formatHuf } from '../utils/format.js';
import { useReportHeight } from '../hooks/useReportHeight.js';

function Row({ label, amount, muted }) {
  return (
    <div className={`pb-row${muted ? ' muted' : ''}`}>
      <div className="pb-row-label">{label}</div>
      <span className="pb-row-amount">{amount}</span>
    </div>
  );
}

/** Az utolsó ár-változás nagysága, ~1,6 másodpercre (animált visszajelzéshez). */
function usePriceDelta(total) {
  const prev = useRef(total);
  const [delta, setDelta] = useState(null);
  const settled = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { settled.current = true; }, 1200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const d = total - prev.current;
    prev.current = total;
    if (!d || !settled.current) return undefined;
    setDelta({ value: d, key: Date.now() });
    const t = setTimeout(() => setDelta(null), 1600);
    return () => clearTimeout(t);
  }, [total]);
  return delta;
}

export default function PriceBar({
  modelId, modelName, tier, includeFootboard, installation, selectedZoneIds, availableZoneIds,
}) {
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);
  useReportHeight(barRef, '--price-bar-h');

  const priced = hasPrice(modelId);
  const price = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, selectedZoneIds, availableZoneIds })
    : null;
  // Ugyanez a választás, de a teljes szettel – az "Egyben" számhoz.
  const kitPrice = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, availableZoneIds })
    : null;
  const delta = usePriceDelta(price?.total ?? 0);

  if (!priced) {
    return (
      <div className="price-bar" ref={barRef}>
        <div className="pb-main">
          <span className="muted small">Ehhez a modellhez még nincs árlista</span>
        </div>
      </div>
    );
  }

  const tierName = getTier(tier)?.name ?? tier;
  const installationName = INSTALLATION_OPTIONS.find((o) => o.id === installation)?.name ?? 'Nem kérem';

  return (
    <div className="price-bar" ref={barRef}>
      <div className="pb-main">
        <button type="button" className="pb-numbers" aria-expanded={open} onClick={() => setOpen((o) => !o)}
          title={open ? 'Bontás elrejtése' : 'Tételes bontás'}>
          <span className="pb-num">
            <span className="pb-label">Kiválasztva:</span>
            <strong className="pb-amount">{formatHuf(price.total)}</strong>
            {delta && (
              <span key={delta.key} className={`pb-delta${delta.value < 0 ? ' down' : ' up'}`}>
                {delta.value < 0 ? '−' : '+'}{formatHuf(Math.abs(delta.value))}
              </span>
            )}
          </span>
          {!price.isFullKit && (
            <span className="pb-num pb-kit">
              <span className="pb-sep" aria-hidden="true">·</span>
              <span className="pb-label">Egyben:</span>
              <strong>{formatHuf(kitPrice.total)}</strong>
              <span className="pb-savings-tag">(−{formatHuf(price.kit.savings)})</span>
            </span>
          )}
          <span className="pb-chevron" aria-hidden="true">{open ? '▾' : '▴'}</span>
        </button>
      </div>

      {!price.minimumOrder.ok && (
        <p className="error small pb-min-warning">{price.minimumOrder.message}</p>
      )}

      {open && (
        <div className="pb-details">
          <p className="muted small pb-context">{modelName} · {tierName}</p>
          {price.isFullKit ? (
            <Row label="Teljes fólia szett (minden zóna)" amount={formatHuf(price.base)} />
          ) : (
            price.zones.length
              ? price.zones.map((z) => <Row key={z.id} label={z.name} amount={formatHuf(z.price)} />)
              : <Row label="Nincs kiválasztott zóna" amount="–" muted />
          )}
          <Row label="Taposófelület (csúszásgátló)" amount={includeFootboard ? `+${formatHuf(price.footboard)}` : '–'} muted={!includeFootboard} />
          <Row label={price.installation ? `Felrakás · ${installationName}` : 'Postázás (felrakás nélkül)'}
            amount={price.installation ? `+${formatHuf(price.installation)}` : '–'} muted={!price.installation} />
          <div className="pb-row pb-sum">
            <strong>Végösszeg</strong>
            <strong>{formatHuf(price.total)}</strong>
          </div>
          {!price.isFullKit && price.kit.savings > 0 && (
            <p className="muted small">Egyben (teljes szett + ugyanezek az extrák): {formatHuf(kitPrice.total)} – a szett {formatHuf(price.kit.savings)}-tal olcsóbb, mint a zónák külön-külön.</p>
          )}
          <p className="muted small">Az árak bruttó, forintos árak.</p>
        </div>
      )}
    </div>
  );
}

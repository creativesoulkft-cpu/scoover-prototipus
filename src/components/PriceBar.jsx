/**
 * Állandóan látható ársáv – legfeljebb két szám:
 *
 *   Kiválasztva: 26 800 Ft · Egyben: 39 900 Ft (−18 200)
 *   13 100 Ft-tal kevesebb, mint egyben
 *
 * "Kiválasztva" = a mostani választás végösszege (zónák/szett + taposó +
 * felrakás/postázás). "Egyben" = ugyanez a teljes fólia szettel, zárójelben a
 * szett kedvezménye a zónák külön-árához képest. A második szám ELTŰNIK, ha
 * minden zóna ki van választva (nincs mit összehasonlítani) ÉS akkor is, ha
 * egyetlen zóna sincs kiválasztva (0 Ft mellett nincs értelme a szettárnak).
 * A különbözet mindig szövegesen, magyarázattal: "…-tal több / kevesebb, mint
 * egyben" – a puszta "+5 300 Ft" félreérthető volt.
 *
 * Kinyitva tételes bontás: zónák (vagy a szett egy sorban), taposó,
 * felrakás/postázás, végösszeg. Asztalin a konfigurátor-oszlop tetejére tapad,
 * mobilon a képernyő aljára rögzül (a bontás felfelé nyílik – styles.css).
 * A saját magasságát `--price-bar-h`-ba írja, hogy semmi ne csússzon alá, és
 * kinyitáskor annyival görgeti az oldalt, amennyivel nőtt – így a bontás
 * TOLJA a szekciókat, nem fedi őket.
 *
 * Minden összeg a központi src/pricing.js-ből; itt nincs árazási logika.
 */
import { useLayoutEffect, useRef, useState } from 'react';
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

export default function PriceBar({
  modelId, modelName, tier, includeFootboard, installation, selectedZoneIds, availableZoneIds,
}) {
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);
  const priced = hasPrice(modelId);
  useReportHeight(barRef, '--price-bar-h');

  // A sáv TOL, nem fed: valahányszor a magassága változik (bontás nyitása,
  // "Egyben" sor vagy magyarázat megjelenése), a különbséggel görgetjük az
  // oldalt, hogy a sáv alatt/fölött lévő tartalom ugyanott maradjon a
  // képernyőn. Felül tapadó sáv: felfelé; alul rögzített (mobil): lefelé.
  // Az oldal tetején (scrollY = 0) a felső sáv egyszerűen a folyásban tol.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let prev = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      const delta = el.offsetHeight - prev;
      prev = el.offsetHeight;
      if (!delta) return;
      const bottomFixed = getComputedStyle(el).position === 'fixed';
      // a --price-bar-h-t egy másik figyelő írja – a lap alsó paddingja addig
      // nem nő, ezért egy képkockával később görgetünk
      requestAnimationFrame(() => window.scrollBy({ top: bottomFixed ? delta : -delta, behavior: 'instant' }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [priced]);
  const toggleOpen = () => setOpen((o) => !o);

  const price = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, selectedZoneIds, availableZoneIds })
    : null;
  // Ugyanez a választás, de a teljes szettel – az "Egyben" számhoz.
  const kitPrice = priced
    ? calculatePrice({ model: modelId, tier, includeFootboard, installation, availableZoneIds })
    : null;

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
  const hasZones = price.zones.length > 0;
  // összehasonlítás csak akkor, ha van mivel: legalább egy, de nem minden zóna
  const showCompare = !price.isFullKit && hasZones;
  const diff = price.total - kitPrice.total;

  return (
    <div className="price-bar" ref={barRef}>
      <div className="pb-summary">
      <div className="pb-main">
        <button type="button" className="pb-numbers" aria-expanded={open} onClick={toggleOpen}
          title={open ? 'Bontás elrejtése' : 'Tételes bontás'}>
          <span className="pb-num">
            <span className="pb-label">Kiválasztva:</span>
            <strong className="pb-amount">{formatHuf(price.total)}</strong>
          </span>
          {showCompare && (
            <span className="pb-num pb-kit">
              <span className="pb-sep" aria-hidden="true">·</span>
              <span className="pb-label">Egyben:</span>
              <strong>{formatHuf(kitPrice.total)}</strong>
              <span className="pb-savings-tag" title="A szett kedvezménye a zónák külön-árához képest">(−{formatHuf(price.kit.savings)})</span>
            </span>
          )}
          <span className="pb-chevron" aria-hidden="true">{open ? '▾' : '▴'}</span>
        </button>
      </div>

      {showCompare && diff !== 0 && (
        <p className={`pb-compare small${diff > 0 ? ' more' : ' less'}`}>
          {formatHuf(Math.abs(diff))}-tal {diff > 0 ? 'több' : 'kevesebb'}, mint egyben
        </p>
      )}

      {!price.minimumOrder.ok && (
        <p className="error small pb-min-warning">{price.minimumOrder.message}</p>
      )}
      </div>

      {open && (
        <div className="pb-details">
          <p className="muted small pb-context">{modelName} · {tierName}</p>
          {price.isFullKit ? (
            <Row label="Teljes fólia szett (minden zóna)" amount={formatHuf(price.base)} />
          ) : (
            hasZones
              ? price.zones.map((z) => <Row key={z.id} label={z.name} amount={formatHuf(z.price)} />)
              : <Row label="Nincs kiválasztott zóna" amount="–" muted />
          )}
          <Row label="Taposófelület (csúszásgátló)" amount={includeFootboard ? `+${formatHuf(price.footboard)}` : '–'} muted={!includeFootboard} />
          {price.installation ? (
            <Row label={`Felrakás nálunk · ${installationName}`} amount={`+${formatHuf(price.installation)}`} />
          ) : (
            <Row label="Postázás" amount={price.shipping ? `+${formatHuf(price.shipping)}` : 'ingyenes'} muted={!price.shipping} />
          )}
          <div className="pb-row pb-sum">
            <strong>Végösszeg</strong>
            <strong>{formatHuf(price.total)}</strong>
          </div>
          {showCompare && price.kit.savings > 0 && (
            <p className="muted small">Egyben (teljes szett + ugyanezek az extrák): {formatHuf(kitPrice.total)} – a szett {formatHuf(price.kit.savings)}-tal olcsóbb, mint a zónák külön-külön.</p>
          )}
          <p className="muted small">Az árak bruttó, forintos árak.</p>
        </div>
      )}
    </div>
  );
}

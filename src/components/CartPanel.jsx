/**
 * "Kosárba teszem" panel: a köztes híd szerveren (server/) keresztül valódi
 * WooCommerce kosártételt hoz létre, és megjeleníti a hiba-/sikervisszajelzést.
 *
 * A kosár-csomag a TERV-DOKUMENTUMBÓL épül (src/utils/cartConfig.js) – a
 * rendelés így a teljes receptet hordozza, amiből a nyomdai fájl szerver
 * oldalon újragyártható. Az árbontás az állandóan látható ársávban (PriceBar)
 * van, itt csak a fizetendő végösszeg ismétlődik a gomb mellett; az összeg
 * ugyanabból a központi modulból jön (src/pricing.js), amit a szerver is használ.
 */
import { useState } from 'react';
import { calculatePrice, requiresManualApproval } from '../pricing.js';
import { formatHuf } from '../utils/format.js';
import { buildCartConfig } from '../utils/cartConfig.js';
import { addToCart } from '../api/cartBridge.js';
import { trackAddToCart } from '../utils/analytics.js';
import { hasUnuploadedImage } from '../design/schema.js';
import { UPLOAD_PATTERN_ID } from '../data/patterns/index.js';

export default function CartPanel({
  doc, modelName, tier, availableZoneIds, zoneTiers, uploadsPending, onSaved,
}) {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  const selectedZoneIds = doc.selection.zones ?? availableZoneIds;
  let price = null;
  let priceError = null;
  try {
    price = calculatePrice({
      model: doc.model, tier, includeFootboard: doc.selection.footboard, installation: doc.installation,
      selectedZoneIds, availableZoneIds, zoneTiers,
    });
  } catch (e) {
    priceError = e.message;
  }

  const imageMissing = hasUnuploadedImage(doc, UPLOAD_PATTERN_ID) && !uploadsPending;
  const belowMinimum = price ? !price.minimumOrder.ok : false;
  const nothingSelected = selectedZoneIds.length === 0 && !doc.selection.footboard;
  const canSubmit = status !== 'submitting' && !imageMissing && !uploadsPending && !priceError && !belowMinimum && !nothingSelected;

  async function handleSubmit() {
    setStatus('submitting');
    setMessage(null);
    setErrors([]);
    try {
      const config = buildCartConfig({ doc, availableZoneIds });
      const res = await addToCart(config);
      if (res.designId && res.designId !== doc.id) onSaved?.(res.designId);
      trackAddToCart({
        modelName, tier, total: price?.total,
        isFullKit: price?.isFullKit, pieceCount: selectedZoneIds.length,
      });
      setResult(res);
      setStatus('success');
      setMessage(
        res.requiresApproval
          ? 'Kosárba került! Az EGYEDI tétel fizetés után kézi jóváhagyásra kerül, mielőtt gyártásba megy.'
          : 'Kosárba került!',
      );
      if (res.checkoutUrl) {
        window.setTimeout(() => { window.location.href = res.checkoutUrl; }, 1200);
      }
    } catch (e) {
      setStatus('error');
      setMessage(e.message);
      setErrors(e.errors ?? []);
    }
  }

  return (
    <div className="controls cart-panel">
      {uploadsPending && <p className="muted small">Kép feltöltése a szerverre…</p>}
      {imageMissing && (
        <p className="muted small error">
          Egy saját képes réteg képe nincs a szerveren – töltsd fel újra a Stílus kártyán, vagy válassz beépített mintát.
        </p>
      )}
      {nothingSelected && <p className="muted small">Válassz legalább egy zónát vagy a taposófelületet.</p>}

      <div className="price-row price-total">
        <strong>Fizetendő</strong>
        <strong>{price ? formatHuf(price.total) : '–'}</strong>
      </div>
      {priceError && <p className="error small">{priceError}</p>}
      {belowMinimum && <p className="error small">{price.minimumOrder.message}</p>}

      {requiresManualApproval(tier) && (
        <p className="muted small">
          Az EGYEDI szint fizetés után kézi jóváhagyást igényel (felbontás- és jogtisztaság-ellenőrzés), mielőtt gyártásba kerül.
        </p>
      )}

      <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
        {status === 'submitting' ? 'Kosárba helyezés…' : 'Kosárba teszem'}
      </button>

      {status === 'success' && <p className="success">{message}</p>}
      {status === 'error' && (
        <div className="error-box">
          <p className="error">{message}</p>
          {errors.length > 1 && (
            <ul className="error-list">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
      {status === 'success' && result?.checkoutUrl && (
        <p className="muted small">Átirányítás a pénztárhoz… vagy <a href={result.checkoutUrl}>kattints ide</a>.</p>
      )}
    </div>
  );
}

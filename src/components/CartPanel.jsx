/**
 * "Kosárba teszem" panel: a köztes híd szerveren (server/) keresztül valódi
 * WooCommerce kosártételt hoz létre, és megjeleníti a hiba-/sikervisszajelzést.
 *
 * Az árbontás nem itt, hanem az állandóan látható ársávban (PriceBar) van –
 * itt csak a fizetendő végösszeg ismétlődik meg a gomb mellett. Az összeg
 * ugyanabból a központi modulból jön (src/pricing.js), amit a szerver is
 * használ az ár hitelesítéséhez.
 */
import { useState } from 'react';
import { calculatePrice, requiresManualApproval } from '../pricing.js';
import { formatHuf } from '../utils/format.js';
import { buildCartConfig } from '../utils/cartConfig.js';
import { addToCart } from '../api/cartBridge.js';

export default function CartPanel({
  modelId, modelName, tier, pattern, transform, labels, includeFootboard, installation, remoteImage,
  selectedGroupIds, footboardDesign,
}) {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  let price = null;
  let priceError = null;
  try {
    price = calculatePrice({ model: modelId, tier, includeFootboard, installation, selectedGroupIds });
  } catch (e) {
    priceError = e.message;
  }

  const customImageMissing = tier === 'custom' && !remoteImage?.url;
  const customImageUploading = tier === 'custom' && remoteImage?.uploading;
  const customImageError = tier === 'custom' ? remoteImage?.error : null;
  const footboardImageUploading = includeFootboard && footboardDesign?.uploading;
  const belowMinimum = price ? !price.minimumOrder.ok : false;
  const canSubmit = status !== 'submitting' && !customImageMissing && !customImageUploading
    && !footboardImageUploading && !priceError && !belowMinimum;

  async function handleSubmit() {
    setStatus('submitting');
    setMessage(null);
    setErrors([]);
    try {
      const config = buildCartConfig({
        modelId, tier, pattern, transform, labels, includeFootboard, installation, remoteImage, selectedGroupIds,
        footboardDesign,
      });
      const res = await addToCart(config);
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
      {tier === 'custom' && (
        <p className={`muted small${customImageError ? ' error' : ''}`}>
          {customImageUploading && 'Kép feltöltése a szerverre…'}
          {!customImageUploading && customImageError}
          {!customImageUploading && !customImageError && remoteImage?.url &&
            `Kép feltöltve: ${remoteImage.width}×${remoteImage.height} px`}
          {!customImageUploading && !customImageError && !remoteImage?.url &&
            'Tölts fel egy képet a Minta szekció "EGYEDI" fülén a kosárba tételhez.'}
        </p>
      )}

      {footboardImageUploading && <p className="muted small">Taposó-kép feltöltése a szerverre…</p>}

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

/**
 * "Kosárba teszem" panel: élő ár-előnézet (src/pricing.js, ugyanaz a modul,
 * mint a szerveren), taposófelület extra ki/bekapcsolása, kosárba helyezés
 * a köztes híd szerveren (server/) keresztül, és a hiba-/sikervisszajelzés.
 */
import { useState } from 'react';
import { calculatePrice, requiresManualApproval } from '../pricing.js';
import { buildCartConfig } from '../utils/cartConfig.js';
import { addToCart } from '../api/cartBridge.js';

const TIER_NAMES = { solid: 'SOLID', print: 'PRINT', custom: 'CUSTOM (egyedi kép)' };

function formatHuf(n) {
  return `${n.toLocaleString('hu-HU')} Ft`;
}

export default function CartPanel({
  modelId, modelName, tier, pattern, transform, labels, includeFootboard, onIncludeFootboardChange, remoteImage,
}) {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);

  let price = null;
  let priceError = null;
  try {
    price = calculatePrice({ model: modelId, tier, includeFootboard });
  } catch (e) {
    priceError = e.message;
  }

  const customImageMissing = tier === 'custom' && !remoteImage?.url;
  const customImageUploading = tier === 'custom' && remoteImage?.uploading;
  const customImageError = tier === 'custom' ? remoteImage?.error : null;
  const canSubmit = status !== 'submitting' && !customImageMissing && !customImageUploading && !priceError;

  async function handleSubmit() {
    setStatus('submitting');
    setMessage(null);
    setErrors([]);
    try {
      const config = buildCartConfig({ modelId, tier, pattern, transform, labels, includeFootboard, remoteImage });
      const res = await addToCart(config);
      setResult(res);
      setStatus('success');
      setMessage(
        res.requiresApproval
          ? 'Kosárba került! Az egyedi (CUSTOM) tétel fizetés után kézi jóváhagyásra kerül, mielőtt gyártásba megy.'
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
      <label className="check" title="Kültéri csúszásgátló anyagból készül, minden szinten bekapcsolható">
        <input
          type="checkbox"
          checked={includeFootboard}
          onChange={(e) => onIncludeFootboardChange(e.target.checked)}
        />
        Taposófelület extra (csúszásgátló)
      </label>

      {tier === 'custom' && (
        <p className={`muted small${customImageError ? ' error' : ''}`}>
          {customImageUploading && 'Kép feltöltése a szerverre…'}
          {!customImageUploading && customImageError}
          {!customImageUploading && !customImageError && remoteImage?.url &&
            `Kép feltöltve: ${remoteImage.width}×${remoteImage.height} px`}
          {!customImageUploading && !customImageError && !remoteImage?.url &&
            'Tölts fel egy képet a "Saját kép" panelen a kosárba tételhez.'}
        </p>
      )}

      <div className="price-breakdown">
        <div className="price-row">
          <span>{modelName} · {TIER_NAMES[tier]}</span>
          <span>{price ? formatHuf(price.base) : '–'}</span>
        </div>
        {price?.tierSurcharge > 0 && (
          <div className="price-row muted small">
            <span>{tier === 'custom' ? 'PRINT + CUSTOM felár (kézi jóváhagyás)' : 'PRINT felár'}</span>
            <span>+{formatHuf(price.tierSurcharge)}</span>
          </div>
        )}
        {price?.footboardSurcharge > 0 && (
          <div className="price-row muted small">
            <span>Taposófelület extra</span>
            <span>+{formatHuf(price.footboardSurcharge)}</span>
          </div>
        )}
        <div className="price-row price-total">
          <strong>Összesen</strong>
          <strong>{price ? formatHuf(price.total) : '–'}</strong>
        </div>
        {priceError && <p className="error small">{priceError}</p>}
      </div>

      {requiresManualApproval(tier) && (
        <p className="muted small">
          A CUSTOM szint fizetés után kézi jóváhagyást igényel (felbontás- és jogtisztaság-ellenőrzés), mielőtt gyártásba kerül.
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

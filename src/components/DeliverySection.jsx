/**
 * "Felrakás vagy postázás" – hogyan jut a fólia a rollerre.
 *
 * Két út: postázzuk a kész fóliát (felrakás nélkül), vagy behozod a rollert és
 * mi rakjuk fel (normál / komplex – csak személyes átvétellel). A díjak a
 * központi src/pricing.js-ből (INSTALLATION_OPTIONS) jönnek.
 */
import { INSTALLATION_OPTIONS, INSTALLATION_NOTE, SHIPPING_HUF, getInstallation } from '../pricing.js';
import { formatHuf } from '../utils/format.js';

export default function DeliverySection({ installation, onInstallationChange }) {
  const wantsInstall = installation !== 'none';
  // a címkén mindig látszik az ár: postázásnál a díj (vagy "ingyenes"),
  // felrakásnál a kiválasztott (alapból a normál) csomag díja
  const shippingLabel = SHIPPING_HUF > 0 ? formatHuf(SHIPPING_HUF) : 'ingyenes';
  const installPrice = getInstallation(wantsInstall ? installation : 'normal').price;
  return (
    <div className="controls">
      <div className="choice-list" role="radiogroup" aria-label="Felrakás vagy postázás">
        <label className={`choice${!wantsInstall ? ' active' : ''}`}>
          <input type="radio" name="delivery" checked={!wantsInstall} onChange={() => onInstallationChange('none')} />
          <span className="choice-text">
            <strong>Postázás <span className="choice-price">— {shippingLabel}</span></strong>
            <span className="muted small">A kész fóliaszettet postán küldjük, felrakási útmutatóval.</span>
          </span>
        </label>
        <label className={`choice${wantsInstall ? ' active' : ''}`}>
          <input type="radio" name="delivery" checked={wantsInstall} onChange={() => onInstallationChange('normal')} />
          <span className="choice-text">
            <strong>Felrakás nálunk <span className="choice-price">— {formatHuf(installPrice)}</span></strong>
            <span className="muted small">{INSTALLATION_NOTE}</span>
          </span>
        </label>
      </div>

      {wantsInstall && (
        <div className="chip-row install-options">
          {INSTALLATION_OPTIONS.filter((o) => o.id !== 'none').map((o) => (
            <button key={o.id} type="button" className={`chip${installation === o.id ? ' active' : ''}`}
              onClick={() => onInstallationChange(o.id)}>
              {o.name} · +{formatHuf(o.price)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

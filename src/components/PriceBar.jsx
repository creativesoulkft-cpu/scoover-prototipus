/**
 * Állandóan látható ársáv: mindig az aktuális végösszeget mutatja, és élőben
 * frissül, ahogy a felhasználó modellt, szintet vagy extrát vált.
 *
 * Asztali nézetben a konfigurátor-oszlop tetejére tapad, mobilon a képernyő
 * aljára rögzül (a bontás ilyenkor felfelé nyílik – lásd styles.css).
 *
 * Minden összeg a központi src/pricing.js-ből jön; itt nincs árazási logika.
 */
import { useState } from 'react';
import {
  calculatePrice, getTier, hasPrice, FOOTBOARD_EXTRA_HUF,
  INSTALLATION_OPTIONS, INSTALLATION_NOTE,
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

export default function PriceBar({
  modelId, modelName, tier,
  includeFootboard, onFootboardChange, hasFootboardPiece,
  installation, onInstallationChange,
}) {
  const [open, setOpen] = useState(false);

  if (!hasPrice(modelId)) {
    return (
      <div className="price-bar">
        <div className="pb-main">
          <div className="pb-total">
            <span className="muted small">Ehhez a modellhez még nincs árlista</span>
          </div>
        </div>
      </div>
    );
  }

  const price = calculatePrice({ model: modelId, tier, includeFootboard, installation });
  const tierName = getTier(tier)?.name ?? tier;
  const installationName = INSTALLATION_OPTIONS.find((o) => o.id === installation)?.name ?? 'Nem kérem';

  return (
    <div className="price-bar">
      <div className="pb-main">
        <div className="pb-total">
          <span className="muted small">{modelName} · {tierName}</span>
          <strong className="pb-amount">{formatHuf(price.total)}</strong>
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

      {open && (
        <div className="pb-details">
          <Row label={`Alapár · ${modelName} · ${tierName}`} amount={formatHuf(price.base)} />

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

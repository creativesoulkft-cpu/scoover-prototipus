/**
 * KÍVÁNSÁGLISTA – "Nem találod a rollered? Szólj, melyikre kérnél fóliát."
 *
 * Szándékosan KÍVÜL van a regisztráción: egy e-mail cím elég, hogy szóljunk,
 * amint elkészül a modell fóliaszettje. Bejelentkezve e-mail sem kell, a
 * kívánság a fiókhoz kerül. Beküldés után egy lépésben felajánljuk a fiókot
 * (előtöltött e-maillel) – aki kéri, ott látja a kívánságait és a terveit.
 *
 * A márka/modell javaslatok a src/data/wishlistModels.js-ből jönnek; a
 * szerver (server/routes/wishes.js) a márka + modell alapján összesít.
 */
import { useEffect, useMemo, useState } from 'react';
import { WISHLIST_BRANDS, wishlistYears } from '../data/wishlistModels.js';
import { bridgeFetch } from '../api/cartBridge.js';
import { trackWishAdded } from '../utils/analytics.js';

export default function WishlistDialog({ user, onClose, onRegister }) {
  const [brandId, setBrandId] = useState(WISHLIST_BRANDS[0].id);
  const [otherBrand, setOtherBrand] = useState('');
  const [modelName, setModelName] = useState('');
  const [year, setYear] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot – ember nem tölti ki
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { wish, duplicate }

  const brand = useMemo(() => WISHLIST_BRANDS.find((b) => b.id === brandId), [brandId]);
  const brandName = brandId === 'other' ? otherBrand.trim() : brand?.name ?? '';
  const years = useMemo(() => wishlistYears(), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await bridgeFetch('/api/wishes', {
        method: 'POST',
        body: { brand: brandName, modelName: modelName.trim(), year: year || null, email, name, note, consent, website },
      });
      trackWishAdded({ brand: brandName, model: modelName.trim(), loggedIn: Boolean(user) });
      setDone({ wish: r.wish, duplicate: r.duplicate });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wishlist" role="dialog" aria-modal="true" aria-label="Kívánságlista" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Melyik rollerre kérnél fóliát?</strong>
          <button type="button" className="canvas-icon-btn modal-x" aria-label="Bezárás" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div className="controls wish-done">
            <p className="success">
              {done.duplicate ? 'Ezt a modellt már kérted – frissítettük a kívánságod.' : 'Felvettük a kívánságlistára!'}
            </p>
            <p>
              <strong>{done.wish?.brand} {done.wish?.modelName}{done.wish?.year ? ` · ${done.wish.year}` : ''}</strong>
              <br />
              <span className="muted small">Amint elkészül hozzá a fóliaszett, e-mailben szólunk{user ? '' : ` (${email})`}.</span>
            </p>
            {!user && (
              <div className="note-info small">
                Szeretnéd egy helyen látni a kívánságaidat és a terveidet?{' '}
                <button type="button" className="link" onClick={() => onRegister?.({ email, name })}>Fiók létrehozása egy lépésben</button>
                {' '}– az e-mail címed már beírtuk.
              </div>
            )}
            <div className="control-row">
              <button type="button" className="btn btn-primary" onClick={onClose}>Kész</button>
            </div>
          </div>
        ) : (
          <form className="controls" onSubmit={submit}>
            <p className="muted small">
              Egy perc az egész: megmondod, milyen rollered van, mi pedig szólunk, amint elkészül hozzá a fólia.
              Minél többen kéritek ugyanazt a modellt, annál előrébb kerül a sorban.
            </p>
            <label className="field">
              <span>Márka</span>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                {WISHLIST_BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            {brandId === 'other' && (
              <label className="field">
                <span>Márka neve</span>
                <input type="text" value={otherBrand} onChange={(e) => setOtherBrand(e.target.value)} required maxLength={40} />
              </label>
            )}
            <label className="field">
              <span>Modell</span>
              <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} required maxLength={60}
                list="wish-models" placeholder={brand?.models[0] ? `pl. ${brand.models[0]}` : 'pl. G2 Pro Max'} autoComplete="off" />
              <datalist id="wish-models">
                {(brand?.models ?? []).map((m) => <option key={m} value={m} />)}
              </datalist>
            </label>
            <label className="field">
              <span>Évjárat</span>
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Nem tudom / mindegy</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            {!user && (
              <label className="field">
                <span>E-mail – ide szólunk, ha kész</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
            )}
            <label className="field">
              <span>Név (opcionális)</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            </label>
            <label className="field">
              <span>Megjegyzés (opcionális)</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
                placeholder="pl. teljes szett + taposó érdekelne, matt fekete" />
            </label>
            <input type="text" className="hp" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" />
            <label className="check">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
              Értesítsetek e-mailben, amint elérhető a fóliaszett ehhez a modellhez.
            </label>
            {error && <p className="error small">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Küldés…' : 'Felveszem a kívánságlistára'}</button>
            <p className="muted small">Az e-mail címedet csak erre az értesítésre használjuk, bármikor visszavonhatod.</p>
          </form>
        )}
      </div>
    </div>
  );
}

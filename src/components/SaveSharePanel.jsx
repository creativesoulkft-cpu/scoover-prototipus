/**
 * Terv mentése és megosztása LINKKEL.
 *
 *   🔗 Link a tervhez  – ha a híd szerver elérhető: a tervet elmenti (SCV-… id),
 *                        és a rövid #id= linket adja; ha nem: a teljes tervet
 *                        az URL-be tömöríti (#d=…), ami szerver nélkül is nyílik.
 *                        A linket a vágólapra másolja, és a címsorba is beírja.
 *   💾 Mentés a fiókomba – bejelentkezve a terv a fiókhoz kötve marad (Terveim).
 *
 * Saját képes tervet csak akkor lehet megosztani/menteni, ha a kép már
 * feltöltődött a szerverre (a linkbe nem fér bele a kép – lásd schema.js).
 */
import { useState } from 'react';
import { saveDesign, updateDesign, uploadDesignPreview } from '../api/designs.js';
import { bridgeHealth } from '../api/cartBridge.js';
import { buildShareUrl, hashForShare, replaceLocationHash } from '../design/share.js';
import { hasUnuploadedImage } from '../design/schema.js';
import { UPLOAD_PATTERN_ID } from '../data/patterns/index.js';
import { trackDesignSaved } from '../utils/analytics.js';

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function SaveSharePanel({ doc, onSaved, renderPreview, user, onRequireLogin, modelName, tierLabel }) {
  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [link, setLink] = useState(null);
  const [message, setMessage] = useState(null);
  const blocked = hasUnuploadedImage(doc, UPLOAD_PATTERN_ID);

  async function persist({ requireAccount = false } = {}) {
    if (blocked) {
      setStatus('error');
      setMessage('Saját képes tervet csak a kép feltöltése után lehet menteni – várd meg a feltöltést, vagy válassz beépített mintát.');
      return null;
    }
    if (requireAccount && !user) { onRequireLogin?.(); return null; }
    setStatus('working');
    setMessage(null);
    const health = await bridgeHealth();
    if (!health) {
      if (requireAccount) {
        setStatus('error');
        setMessage('A mentéshez a szerver kell, ami most nem elérhető.');
        return null;
      }
      // szerver nélkül: a terv az URL-ben utazik
      return { url: buildShareUrl({ doc }), hash: hashForShare({ doc }), id: null, viaServer: false };
    }
    const res = doc.id ? await updateDesign(doc.id, doc) : await saveDesign(doc);
    const id = res.id ?? doc.id;
    onSaved?.(id);
    // előnézeti kép a mentett tervhez (bélyegkép a fiókban és a munkalapon)
    if (renderPreview) {
      try {
        const blob = await renderPreview();
        if (blob) await uploadDesignPreview(id, blob);
      } catch { /* a bélyegkép opcionális */ }
    }
    return { url: buildShareUrl({ id }), hash: hashForShare({ id }), id, viaServer: true };
  }

  async function handleLink() {
    try {
      const r = await persist();
      if (!r) return;
      replaceLocationHash(r.hash);
      const copied = await copyToClipboard(r.url);
      setLink(r.url);
      setStatus('done');
      setMessage(copied
        ? (r.viaServer ? `Link a vágólapon · azonosító: ${r.id}` : 'Link a vágólapon (a terv a linkben utazik)')
        : 'Másold ki a linket:');
      trackDesignSaved({ modelName, tier: tierLabel, method: r.viaServer ? 'link-server' : 'link-url' });
    } catch (e) {
      setStatus('error');
      setMessage(e.message);
    }
  }

  async function handleSaveToAccount() {
    try {
      const r = await persist({ requireAccount: true });
      if (!r) return;
      replaceLocationHash(r.hash);
      setLink(r.url);
      setStatus('done');
      setMessage(`Elmentve a fiókodba · ${r.id}`);
      trackDesignSaved({ modelName, tier: tierLabel, method: 'account' });
    } catch (e) {
      setStatus('error');
      setMessage(e.message);
    }
  }

  return (
    <div className="save-share">
      <div className="save-share-row">
        <button type="button" className="btn btn-secondary" disabled={status === 'working'} onClick={handleLink}
          title="Megosztható link a tervedhez – küldd el bárkinek">
          {status === 'working' ? 'Mentés…' : '🔗 Link a tervhez'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={status === 'working'} onClick={handleSaveToAccount}
          title={user ? 'A terv a fiókodban marad (Terveim)' : 'Belépés után a tervedet a fiókodba mentheted'}>
          💾 {user ? 'Mentés a fiókomba' : 'Mentés fiókba'}
        </button>
      </div>
      {message && (
        <p className={`small save-share-msg${status === 'error' ? ' error' : ''}`}>
          {message}{' '}
          {status === 'done' && link && <a href={link} className="save-share-link">{link.length > 60 ? `${link.slice(0, 60)}…` : link}</a>}
        </p>
      )}
    </div>
  );
}

/**
 * Fiók-panel (modális): belépés / regisztráció / elfelejtett jelszó, és
 * bejelentkezve a fiók lapjai: Terveim, Rollereim, Adataim.
 *
 * A panel nem tud a konfigurátor belső állapotáról – a szülő adja, mi történjen
 * egy terv megnyitásakor (onOpenDesign) vagy egy roller kiválasztásakor
 * (onPickScooter). A hálózati műveletek a useAccount hookból jönnek.
 */
import { useEffect, useState } from 'react';
import { MODEL_REGISTRY, getModelMeta } from '../data/models/index.js';
import { BRIDGE_URL } from '../api/cartBridge.js';
import { editKeyFor } from '../api/designs.js';

const TABS = [
  { id: 'designs', label: 'Terveim' },
  { id: 'scooters', label: 'Rollereim' },
  { id: 'profile', label: 'Adataim' },
];

function Field({ label, type = 'text', value, onChange, autoComplete, required, minLength, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
        required={required} minLength={minLength} placeholder={placeholder} />
    </label>
  );
}

function AuthForms({ account, onDone }) {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    try {
      if (mode === 'login') { await account.login({ email, password }); onDone?.(); }
      else if (mode === 'register') {
        const r = await account.register({ email, password, name, phone });
        setMessage(r.message ?? 'Sikeres regisztráció.');
        onDone?.();
      } else {
        const r = await account.requestPasswordReset(email);
        setMessage(r.message ?? 'Ha van ilyen fiók, elküldtük a visszaállító linket.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form controls" onSubmit={submit}>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" className={`tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Belépés</button>
        <button type="button" role="tab" className={`tab${mode === 'register' ? ' active' : ''}`} onClick={() => setMode('register')}>Regisztráció</button>
      </div>
      {mode === 'register' && <Field label="Név" value={name} onChange={setName} autoComplete="name" required />}
      <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
      {mode !== 'forgot' && (
        <Field label="Jelszó" type="password" value={password} onChange={setPassword} minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required placeholder="legalább 8 karakter" />
      )}
      {mode === 'register' && <Field label="Telefon (opcionális)" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />}
      {error && <p className="error small">{error}</p>}
      {message && <p className="success small">{message}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Egy pillanat…' : mode === 'login' ? 'Belépés' : mode === 'register' ? 'Fiók létrehozása' : 'Visszaállító link küldése'}
      </button>
      <div className="auth-links">
        {mode === 'login' && <button type="button" className="link" onClick={() => setMode('forgot')}>Elfelejtett jelszó</button>}
        {mode === 'forgot' && <button type="button" className="link" onClick={() => setMode('login')}>Vissza a belépéshez</button>}
      </div>
      {mode === 'register' && (
        <p className="muted small">
          A fiókkal a terveid megmaradnak, újra megnyithatod és újrarendelheted őket, és a rollereidet is eltárolhatod.
        </p>
      )}
    </form>
  );
}

function ResetForm({ account, token, onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await account.resetPassword(token, password); onDone?.(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <form className="controls" onSubmit={submit}>
      <p className="muted small">Add meg az új jelszavad – utána azonnal be is leszel lépve.</p>
      <Field label="Új jelszó" type="password" value={password} onChange={setPassword} minLength={8} autoComplete="new-password" required placeholder="legalább 8 karakter" />
      {error && <p className="error small">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Egy pillanat…' : 'Jelszó beállítása'}</button>
    </form>
  );
}

function DesignsTab({ account, currentDoc, onOpenDesign, onNewDesign }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const reload = () => account.listDesigns().then((r) => setItems(r.designs)).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function claimCurrent() {
    if (!currentDoc?.id) return;
    try { await account.claimDesign(currentDoc.id, editKeyFor(currentDoc.id)); reload(); } catch (e) { setError(e.message); }
  }
  async function remove(id) {
    if (!window.confirm('Biztosan törlöd ezt a tervet?')) return;
    try { await account.deleteDesign(id); reload(); } catch (e) { setError(e.message); }
  }

  const unclaimed = currentDoc?.id && items && !items.some((d) => d.id === currentDoc.id);
  return (
    <div className="controls">
      {error && <p className="error small">{error}</p>}
      {unclaimed && (
        <p className="note-info small">
          A most nyitott terv ({currentDoc.id}) még nincs a fiókodhoz kötve.{' '}
          <button type="button" className="link" onClick={claimCurrent}>Hozzáadom a Terveimhez</button>
        </p>
      )}
      {items === null && !error && <p className="muted small">Betöltés…</p>}
      {items?.length === 0 && <p className="muted small">Még nincs mentett terved. A kép alatti „Mentés a fiókomba” gombbal mentheted a mostanit.</p>}
      {items?.length > 0 && (
        <ul className="design-list">
          {items.map((d) => (
            <li key={d.id} className={`design-item${currentDoc?.id === d.id ? ' current' : ''}`}>
              <div className="design-thumb">
                {d.hasPreview
                  ? <img src={`${BRIDGE_URL}/api/designs/${d.id}/preview.png?v=${encodeURIComponent(d.updatedAt)}`} alt="" loading="lazy" />
                  : <span className="muted small">nincs kép</span>}
              </div>
              <div className="design-meta">
                <strong>{d.title || `${getModelMeta(d.model)?.name ?? d.model} · ${d.year ?? ''}`}</strong>
                <span className="muted small">{d.id} · {new Date(d.updatedAt).toLocaleDateString('hu-HU')}</span>
              </div>
              <div className="design-actions">
                <button type="button" className="btn" onClick={() => onOpenDesign(d)}>Megnyitás</button>
                <button type="button" className="link danger" onClick={() => remove(d.id)}>Törlés</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="control-row">
        <button type="button" className="btn" onClick={onNewDesign}>+ Új terv</button>
      </div>
    </div>
  );
}

function ScootersTab({ account, onPickScooter }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [modelId, setModelId] = useState(MODEL_REGISTRY[0].id);
  const [year, setYear] = useState(() => { const y = MODEL_REGISTRY[0].years; return y[y.length - 1]; });
  const [nickname, setNickname] = useState('');
  const reload = () => account.listScooters().then((r) => setItems(r.scooters)).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const years = getModelMeta(modelId)?.years ?? [];

  async function add(e) {
    e.preventDefault();
    try { await account.addScooter({ modelId, year, nickname }); setNickname(''); reload(); } catch (err) { setError(err.message); }
  }
  async function remove(id) {
    try { await account.removeScooter(id); reload(); } catch (err) { setError(err.message); }
  }

  return (
    <div className="controls">
      {error && <p className="error small">{error}</p>}
      {items?.length === 0 && <p className="muted small">Add meg a rollereidet – új tervnél egy koppintással kiválaszthatod őket.</p>}
      {items?.length > 0 && (
        <ul className="design-list">
          {items.map((s) => (
            <li key={s.id} className="design-item">
              <div className="design-meta">
                <strong>{s.nickname || getModelMeta(s.modelId)?.name || s.modelId}</strong>
                <span className="muted small">{getModelMeta(s.modelId)?.name ?? s.modelId} · {s.year ?? '–'}</span>
              </div>
              <div className="design-actions">
                <button type="button" className="btn" onClick={() => onPickScooter(s)}>Ezt tervezem</button>
                <button type="button" className="link danger" onClick={() => remove(s.id)}>Törlés</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="controls scooter-form" onSubmit={add}>
        <h4>Új roller</h4>
        <label className="field">
          <span>Modell</span>
          <select value={modelId} onChange={(e) => { const id = e.target.value; setModelId(id); const ys = getModelMeta(id)?.years ?? []; setYear(ys[ys.length - 1] ?? null); }}>
            {MODEL_REGISTRY.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Évjárat</span>
          <select value={year ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <Field label="Becenév (opcionális)" value={nickname} onChange={setNickname} placeholder="pl. a piros G2" />
        <div className="control-row"><button type="submit" className="btn">+ Hozzáadás</button></div>
      </form>
    </div>
  );
}

function ProfileTab({ account }) {
  const u = account.user;
  const [name, setName] = useState(u?.name ?? '');
  const [phone, setPhone] = useState(u?.phone ?? '');
  const [address, setAddress] = useState(u?.address ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    setMessage(null); setError(null);
    try {
      await account.updateProfile({ name, phone, address, ...(password ? { password } : {}) });
      setPassword('');
      setMessage('Mentve.');
    } catch (err) { setError(err.message); }
  }
  async function resend() {
    try { const r = await account.resendVerification(); setMessage(r.message ?? 'Elküldve.'); } catch (err) { setError(err.message); }
  }

  return (
    <form className="controls" onSubmit={save}>
      <p className="muted small">
        {u.email} · {u.verifiedAt ? 'megerősített e-mail' : <>e-mail még nincs megerősítve · <button type="button" className="link" onClick={resend}>újraküldés</button></>}
      </p>
      <Field label="Név" value={name} onChange={setName} autoComplete="name" />
      <Field label="Telefon" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
      <label className="field">
        <span>Szállítási cím</span>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} autoComplete="street-address" />
      </label>
      <Field label="Új jelszó (ha változtatnál)" type="password" value={password} onChange={setPassword} minLength={8} autoComplete="new-password" />
      {error && <p className="error small">{error}</p>}
      {message && <p className="success small">{message}</p>}
      <div className="control-row">
        <button type="button" className="link" onClick={() => account.logout()}>Kilépés</button>
        <button type="submit" className="btn">Mentés</button>
      </div>
    </form>
  );
}

export default function AccountPanel({ account, onClose, currentDoc, onOpenDesign, onNewDesign, onPickScooter, resetToken, onResetDone }) {
  const [tab, setTab] = useState('designs');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal account-panel" role="dialog" aria-modal="true" aria-label="Fiók" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>{account.user ? `Szia, ${account.user.name || account.user.email}!` : 'Fiók'}</strong>
          <button type="button" className="canvas-icon-btn modal-x" aria-label="Bezárás" onClick={onClose}>✕</button>
        </div>
        {resetToken ? (
          <ResetForm account={account} token={resetToken} onDone={() => { onResetDone?.(); setTab('designs'); }} />
        ) : !account.user ? (
          <AuthForms account={account} onDone={() => setTab('designs')} />
        ) : (
          <>
            <div className="tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
            {tab === 'designs' && <DesignsTab account={account} currentDoc={currentDoc} onOpenDesign={onOpenDesign} onNewDesign={onNewDesign} />}
            {tab === 'scooters' && <ScootersTab account={account} onPickScooter={onPickScooter} />}
            {tab === 'profile' && <ProfileTab account={account} />}
          </>
        )}
      </div>
    </div>
  );
}

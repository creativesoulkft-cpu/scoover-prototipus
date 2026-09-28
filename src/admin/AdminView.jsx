/**
 * ÜGYFÉLSZOLGÁLATI NÉZET – #admin
 *
 * A mentett tervek listája, és tervenként a nyomdai fájl generálása:
 * "Nyomdai fájl generálása" → a híd sorba állítja (print_jobs) → állapot
 * frissül → PDF (CutContour), munkalap PNG, manifest letölthető.
 *
 * Belépés: admin szerepű fiók (ADMIN_EMAILS) VAGY az ADMIN_TOKEN beírása
 * (a böngésző sessionStorage-ban marad, a fájl-linkekhez ?token= kerül).
 */
import { useCallback, useEffect, useState } from 'react';
import { bridgeFetch, BRIDGE_URL } from '../api/cartBridge.js';
import { getModelMeta } from '../data/models/index.js';

const TOKEN_KEY = 'scv-admin-token';
const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; } };

function useAdminApi() {
  const [token, setTokenState] = useState(readToken);
  const setToken = (t) => { setTokenState(t); try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* privát mód */ } };
  const call = useCallback((path, opts = {}) =>
    bridgeFetch(path, { ...opts, headers: { ...(opts.headers ?? {}), ...(token ? { 'x-admin-token': token } : {}) } }), [token]);
  const fileUrl = useCallback((jobId, name) =>
    `${BRIDGE_URL}/api/print-jobs/${encodeURIComponent(jobId)}/files/${encodeURIComponent(name)}${token ? `?token=${encodeURIComponent(token)}` : ''}`, [token]);
  return { token, setToken, call, fileUrl };
}

function JobCard({ job, fileUrl }) {
  const m = job.manifest;
  return (
    <div className={`job-card status-${job.status}`}>
      <div className="job-head">
        <strong>{job.id}</strong>
        <span className={`job-status ${job.status}`}>{{ queued: 'sorban', running: `folyamatban · ${job.progress ?? ''}`, done: 'kész', failed: 'hiba' }[job.status] ?? job.status}</span>
        <span className="muted small">{new Date(job.createdAt).toLocaleString('hu-HU')}{job.orderRef ? ` · ${job.orderRef}` : ''}</span>
      </div>
      {job.error && <p className="error small">{job.error}</p>}
      {job.status === 'done' && m && (
        <>
          <div className="job-files">
            <a className="btn btn-primary" href={fileUrl(job.id, m.files.pdf)}>⬇ PDF (nyomat + CutContour)</a>
            <a className="btn" href={fileUrl(job.id, m.files.jobSheet)} target="_blank" rel="noreferrer">Munkalap</a>
            <a className="btn" href={fileUrl(job.id, m.files.manifest)} target="_blank" rel="noreferrer">manifest.json</a>
          </div>
          <p className="muted small">
            {m.sheet.pieceCount} darab · lap {Math.round(m.sheet.rollWidthMm)} × {Math.round(m.sheet.lengthMm)} mm · {m.dpi} dpi · kifutó {m.bleedMm} mm · geometria: {m.geometry.source === 'cutfile' ? 'vágófájl' : 'HELYŐRZŐ'}
          </p>
          {m.warnings.length > 0 && (
            <ul className="job-warnings">
              {m.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <img className="job-sheet-preview" src={fileUrl(job.id, m.files.jobSheet)} alt="Munkalap" loading="lazy" />
        </>
      )}
    </div>
  );
}

function DesignRow({ d, api }) {
  const [jobs, setJobs] = useState(null);
  const [open, setOpen] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.call(`/api/print-jobs?designId=${d.id}`).then((r) => setJobs(r.jobs)).catch((e) => setError(e.message)), [api, d.id]);
  useEffect(() => { if (open) load(); }, [open, load]);
  // amíg fut valamelyik, 2 mp-enként frissítünk
  useEffect(() => {
    if (!open || !jobs?.some((j) => j.status === 'queued' || j.status === 'running')) return undefined;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [open, jobs, load]);

  async function generate() {
    setBusy(true); setError(null);
    try { await api.call('/api/print-jobs', { method: 'POST', body: { designId: d.id, orderRef } }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <li className={`admin-design${open ? ' open' : ''}`}>
      <button type="button" className="admin-design-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="design-thumb">
          {d.hasPreview ? <img src={`${BRIDGE_URL}/api/designs/${d.id}/preview.png?v=${encodeURIComponent(d.updatedAt)}`} alt="" loading="lazy" /> : <span className="muted small">nincs kép</span>}
        </span>
        <span className="design-meta">
          <strong>{d.id} · {getModelMeta(d.model)?.name ?? d.model} · {d.year ?? '–'}</strong>
          <span className="muted small">{d.title ? `${d.title} · ` : ''}{d.status} · {new Date(d.updatedAt).toLocaleString('hu-HU')}</span>
        </span>
        <span className="card-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="admin-design-body">
          <div className="admin-actions">
            <a className="btn" href={`${location.pathname}#id=${d.id}`} target="_blank" rel="noreferrer">Megnyitás a konfigurátorban</a>
            <input type="text" placeholder="Rendelésszám (opcionális)" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} />
            <button type="button" className="btn btn-primary" disabled={busy} onClick={generate}>
              {busy ? 'Indítás…' : '🖨 Nyomdai fájl generálása'}
            </button>
          </div>
          {error && <p className="error small">{error}</p>}
          {jobs === null && <p className="muted small">Feladatok betöltése…</p>}
          {jobs?.length === 0 && <p className="muted small">Ehhez a tervhez még nem készült nyomdai fájl.</p>}
          {jobs?.map((j) => <JobCard key={j.id} job={j} fileUrl={api.fileUrl} />)}
        </div>
      )}
    </li>
  );
}

export default function AdminView({ user, onExit }) {
  const api = useAdminApi();
  const [designs, setDesigns] = useState(null);
  const [error, setError] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const authorized = Boolean(api.token) || user?.role === 'admin';

  const load = useCallback(() => {
    setError(null);
    api.call('/api/admin/designs?limit=100').then((r) => setDesigns(r.designs)).catch((e) => { setDesigns(null); setError(e.message); });
  }, [api]);
  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  return (
    <div className="admin">
      <div className="admin-bar">
        <strong>Ügyfélszolgálat · mentett tervek és nyomdai fájlok</strong>
        <div className="admin-bar-right">
          {authorized && <button type="button" className="btn" onClick={load}>Frissítés</button>}
          <button type="button" className="btn" onClick={onExit}>← Konfigurátor</button>
        </div>
      </div>
      {!authorized ? (
        <form className="controls admin-login" onSubmit={(e) => { e.preventDefault(); api.setToken(tokenInput.trim()); }}>
          <p className="muted small">Lépj be admin fiókkal, vagy add meg az ADMIN_TOKEN-t (server/.env).</p>
          <label className="field"><span>Admin token</span><input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} /></label>
          <button type="submit" className="btn btn-primary">Belépés</button>
        </form>
      ) : (
        <>
          {error && <p className="error small">{error} {api.token && <button type="button" className="link" onClick={() => api.setToken('')}>token törlése</button>}</p>}
          {designs === null && !error && <p className="muted small">Betöltés…</p>}
          {designs?.length === 0 && <p className="muted small">Még nincs mentett terv.</p>}
          {designs?.length > 0 && (
            <ul className="admin-list">
              {designs.map((d) => <DesignRow key={d.id} d={d} api={api} />)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

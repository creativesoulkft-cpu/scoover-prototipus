/**
 * Nyomdai feladatok sora – egy folyamatban, egymás után (a renderelés
 * CPU-igényes; több párhuzamos munka egy kis szerveren csak lassítana).
 * Állapot az adatbázisban (print_jobs), fájlok a data/print-jobs/<jobId>/ alatt.
 *
 * Több példányos / nagy forgalmú üzemben ez a rész cserélhető külön
 * worker-folyamatra vagy sorkezelőre (a renderPrintJob hívása ugyanaz marad).
 */
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { getDb, nowIso } from '../lib/db.js';
import { config } from '../config.js';
import { getDesign, setStatus as setDesignStatus } from '../lib/designStore.js';
import { renderPrintJob, readPreviewPng } from './render.js';

const jobsDir = () => {
  const d = join(config.dataDir, 'print-jobs');
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
};

function rowToJob(row) {
  if (!row) return null;
  const dir = row.dir;
  const files = dir && existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.') && f !== 'pieces') : [];
  return {
    id: row.id, designId: row.design_id, orderRef: row.order_ref, status: row.status, progress: row.progress,
    error: row.error, manifest: row.manifest ? JSON.parse(row.manifest) : null, files,
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function getJob(id) {
  return rowToJob(getDb().prepare('SELECT * FROM print_jobs WHERE id = ?').get(id));
}

export function listJobs({ designId, limit = 30 } = {}) {
  const db = getDb();
  const rows = designId
    ? db.prepare('SELECT * FROM print_jobs WHERE design_id = ? ORDER BY created_at DESC LIMIT ?').all(designId, limit)
    : db.prepare('SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(rowToJob);
}

export function jobFilePath(job, name) {
  if (!job?.id || !/^[\w.-]+$/.test(name)) return null;
  const p = resolve(jobsDir(), job.id, name);
  return existsSync(p) ? p : null;
}

const queue = [];
let running = false;

function update(id, patch) {
  const db = getDb();
  const sets = Object.keys(patch).map((k) => `${k} = ?`).concat('updated_at = ?');
  db.prepare(`UPDATE print_jobs SET ${sets.join(', ')} WHERE id = ?`).run(...Object.values(patch), nowIso(), id);
}

async function runNext() {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  const { id, designId, orderRef } = next;
  try {
    update(id, { status: 'running', progress: 'indítás' });
    const rec = getDesign(designId);
    if (!rec) throw new Error('A terv időközben törlődött.');
    const dir = join(jobsDir(), id);
    mkdirSync(dir, { recursive: true });
    const manifest = await renderPrintJob({
      design: rec.design, designId, jobId: id, dir, orderRef,
      previewPng: readPreviewPng(rec.previewPath),
      onProgress: (msg) => update(id, { progress: msg }),
    });
    update(id, { status: 'done', progress: 'kész', manifest: JSON.stringify({ ...manifest, design: undefined }), dir });
    setDesignStatus(designId, 'print-ready');
  } catch (e) {
    console.error(`[print-job ${id}]`, e); // eslint-disable-line no-console
    update(id, { status: 'failed', progress: null, error: e.message });
  } finally {
    running = false;
    setImmediate(runNext);
  }
}

/** Új feladat sorba állítása. @returns {object} a feladat rekordja */
export function enqueueJob({ designId, orderRef = null, createdBy = null }) {
  const id = `PJ-${nowIso().slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const now = nowIso();
  getDb().prepare(`INSERT INTO print_jobs (id, design_id, order_ref, status, progress, created_by, created_at, updated_at, dir)
                   VALUES (?, ?, ?, 'queued', 'sorban', ?, ?, ?, ?)`)
    .run(id, designId, orderRef, createdBy, now, now, join(jobsDir(), id));
  queue.push({ id, designId, orderRef });
  setImmediate(runNext);
  return getJob(id);
}

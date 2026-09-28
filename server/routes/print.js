/**
 * Nyomdai feladatok és ügyfélszolgálati (admin) lista – csak adminnak
 * (x-admin-token fejléc / ?token= a fájlletöltéshez, vagy admin szerepű fiók).
 */
import { Router } from 'express';
import { requireAdmin, isAdminRequest } from '../lib/auth.js';
import { DESIGN_ID_RE } from '../../src/design/schema.js';
import { getDesign, listRecentDesigns } from '../lib/designStore.js';
import { enqueueJob, getJob, listJobs, jobFilePath } from '../print/jobs.js';
import { config } from '../config.js';

const router = Router();

/** a fájl-linkeknél a token a query-ben is jöhet (böngésző <a href> nem tud fejlécet) */
function adminViaQuery(req, res, next) {
  if (typeof req.query.token === 'string' && req.query.token && !req.headers['x-admin-token']) {
    req.headers['x-admin-token'] = req.query.token;
  }
  return isAdminRequest(req) ? next() : res.status(403).json({ ok: false, message: 'Csak adminisztrátornak.' });
}

router.get('/api/admin/designs', requireAdmin, (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  res.json({ ok: true, designs: listRecentDesigns(limit) });
});

router.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json({ ok: true, print: { ...config.print, assetsDir: undefined, previewAssetsDir: undefined, fontsDir: undefined } });
});

router.post('/api/print-jobs', requireAdmin, (req, res) => {
  const designId = String(req.body?.designId ?? '').toUpperCase();
  if (!DESIGN_ID_RE.test(designId)) return res.status(400).json({ ok: false, message: 'Hibás terv-azonosító.' });
  if (!getDesign(designId, { withDoc: false })) return res.status(404).json({ ok: false, message: 'Nincs ilyen terv.' });
  const orderRef = req.body?.orderRef ? String(req.body.orderRef).slice(0, 60) : null;
  const job = enqueueJob({ designId, orderRef, createdBy: req.user?.email ?? 'admin-token' });
  res.status(202).json({ ok: true, job });
});

router.get('/api/print-jobs', requireAdmin, (req, res) => {
  const designId = req.query.designId ? String(req.query.designId).toUpperCase() : undefined;
  res.json({ ok: true, jobs: listJobs({ designId }) });
});

router.get('/api/print-jobs/:id', requireAdmin, (req, res) => {
  const job = getJob(String(req.params.id));
  if (!job) return res.status(404).json({ ok: false, message: 'Nincs ilyen feladat.' });
  return res.json({ ok: true, job });
});

router.get('/api/print-jobs/:id/files/:name', adminViaQuery, (req, res) => {
  const job = getJob(String(req.params.id));
  const path = job && jobFilePath(job, String(req.params.name));
  if (!path) return res.status(404).json({ ok: false, message: 'Nincs ilyen fájl.' });
  return res.download(path);
});

export default router;

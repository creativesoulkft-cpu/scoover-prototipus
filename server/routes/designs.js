/**
 * Mentett tervek – POST/GET/PUT/DELETE /api/designs, előnézeti kép, igénylés fiókhoz.
 *
 * Jogosultság (lib/designStore.canEdit): a tulajdonos (fiók), a mentéskor
 * kapott editKey birtokosa (fiók nélkül), vagy admin.
 */
import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config } from '../config.js';
import { DESIGN_ID_RE } from '../../src/design/schema.js';
import { validateDesignDocument } from '../lib/designValidate.js';
import {
  createDesign, getDesign, updateDesign, canEdit, setPreviewPath, setOwner, deleteDesign,
} from '../lib/designStore.js';
import { currentUser, isAdminRequest } from '../lib/auth.js';

const router = Router();
const previewUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

const previewDir = () => {
  const dir = join(config.dataDir, 'previews');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
};

function idParam(req, res) {
  const id = String(req.params.id ?? '').toUpperCase();
  if (!DESIGN_ID_RE.test(id)) { res.status(400).json({ ok: false, message: 'Hibás terv-azonosító.' }); return null; }
  return id;
}

router.post('/api/designs', async (req, res) => {
  const { design, title } = req.body ?? {};
  const { doc, errors } = await validateDesignDocument(design);
  if (!doc) return res.status(400).json({ ok: false, message: errors[0], errors });
  const user = currentUser(req);
  const r = createDesign(doc, { title, ownerUserId: user?.id ?? null });
  return res.status(201).json({ ok: true, id: r.id, editKey: r.editKey, createdAt: r.createdAt, updatedAt: r.updatedAt });
});

router.get('/api/designs/:id', (req, res) => {
  const id = idParam(req, res);
  if (!id) return undefined;
  const rec = getDesign(id);
  if (!rec) return res.status(404).json({ ok: false, message: 'Nincs ilyen terv.' });
  return res.json({ ok: true, id: rec.id, title: rec.title, design: rec.design, model: rec.model, year: rec.year,
    status: rec.status, hasPreview: rec.hasPreview, createdAt: rec.createdAt, updatedAt: rec.updatedAt,
    owned: Boolean(rec.ownerUserId) && rec.ownerUserId === currentUser(req)?.id });
});

router.put('/api/designs/:id', async (req, res) => {
  const id = idParam(req, res);
  if (!id) return undefined;
  const rec = getDesign(id, { withDoc: false });
  if (!rec) return res.status(404).json({ ok: false, message: 'Nincs ilyen terv.' });
  const user = currentUser(req);
  if (!canEdit(rec, { userId: user?.id, editKey: req.body?.editKey, isAdmin: isAdminRequest(req) })) {
    return res.status(403).json({ ok: false, message: 'Ezt a tervet nem módosíthatod – mentsd el sajátként (új azonosítót kap).', code: 'forbidden' });
  }
  const { doc, errors } = await validateDesignDocument(req.body?.design);
  if (!doc) return res.status(400).json({ ok: false, message: errors[0], errors });
  const r = updateDesign(id, doc, { title: req.body?.title });
  return res.json({ ok: true, id, updatedAt: r.updatedAt });
});

router.delete('/api/designs/:id', (req, res) => {
  const id = idParam(req, res);
  if (!id) return undefined;
  const rec = getDesign(id, { withDoc: false });
  if (!rec) return res.status(404).json({ ok: false, message: 'Nincs ilyen terv.' });
  const user = currentUser(req);
  if (!canEdit(rec, { userId: user?.id, editKey: req.body?.editKey, isAdmin: isAdminRequest(req) })) {
    return res.status(403).json({ ok: false, message: 'Ezt a tervet nem törölheted.' });
  }
  deleteDesign(id);
  return res.json({ ok: true });
});

/** Fiók nélkül mentett terv a fiókhoz kötése (a böngészőben őrzött editKey-jel). */
router.post('/api/designs/:id/claim', (req, res) => {
  const id = idParam(req, res);
  if (!id) return undefined;
  const user = currentUser(req);
  if (!user) return res.status(401).json({ ok: false, message: 'Ehhez be kell lépni.' });
  const rec = getDesign(id, { withDoc: false });
  if (!rec) return res.status(404).json({ ok: false, message: 'Nincs ilyen terv.' });
  if (rec.ownerUserId && rec.ownerUserId !== user.id) return res.status(403).json({ ok: false, message: 'Ez a terv más fiókjához tartozik.' });
  if (!rec.ownerUserId && !canEdit(rec, { userId: user.id, editKey: req.body?.editKey })) {
    return res.status(403).json({ ok: false, message: 'Ezt a tervet nem ebből a böngészőből mentették – nyisd meg és mentsd el sajátként.' });
  }
  setOwner(id, user.id);
  return res.json({ ok: true });
});

router.post('/api/designs/:id/preview', previewUpload.single('preview'), (req, res) => {
  const id = idParam(req, res);
  if (!id) return undefined;
  const rec = getDesign(id, { withDoc: false });
  if (!rec) return res.status(404).json({ ok: false, message: 'Nincs ilyen terv.' });
  const user = currentUser(req);
  if (!canEdit(rec, { userId: user?.id, editKey: req.body?.editKey, isAdmin: isAdminRequest(req) })) {
    return res.status(403).json({ ok: false, message: 'Nincs jogosultság.' });
  }
  if (!req.file || req.file.mimetype !== 'image/png') return res.status(400).json({ ok: false, message: 'PNG előnézet kell.' });
  const path = join(previewDir(), `${id}.png`);
  writeFileSync(path, req.file.buffer);
  setPreviewPath(id, path);
  return res.json({ ok: true });
});

router.get('/api/designs/:id/preview.png', (req, res) => {
  const id = idParam(req, res);
  if (!id) return undefined;
  const rec = getDesign(id, { withDoc: false });
  if (!rec?.previewPath || !existsSync(rec.previewPath)) return res.status(404).end();
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.sendFile(resolve(rec.previewPath));
});

export default router;

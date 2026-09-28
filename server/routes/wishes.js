/**
 * Kívánságlista: "erre a rollerre szeretnék fóliát".
 *
 *   POST /api/wishes                 – nyilvános (fiók nélkül is), kérésszám-korláttal, honeypottal
 *   GET  /api/account/wishes         – a saját kívánságaim
 *   DELETE /api/account/wishes/:id   – kívánság visszavonása
 *   GET  /api/admin/wishes           – modellenkénti összesítés (+ ?key= a tételes lista)
 *   GET  /api/admin/wishes.csv       – export táblázatba
 *   POST /api/admin/wishes/notify    – "elérhető lett": értesítő e-mail a modellre várakozóknak
 */
import { Router } from 'express';
import { requireUser, requireAdmin, isAdminRequest, rateLimit, normalizeEmail, isEmail } from '../lib/auth.js';
import { upsertWish, listByUser, deleteForUser, adminSummary, adminListByKey, adminListAll, openByKey, markNotified } from '../lib/wishStore.js';
import { sendMail, wishAvailableMail } from '../lib/mailer.js';

const router = Router();
const wishLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: 'wish' });

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

router.post('/api/wishes', wishLimit, (req, res) => {
  const b = req.body ?? {};
  if (clean(b.website, 200)) return res.status(200).json({ ok: true, wish: null, duplicate: false }); // honeypot: csendben elnyeljük
  const brand = clean(b.brand, 40);
  const modelName = clean(b.modelName, 60);
  const name = clean(b.name, 80);
  const phone = clean(b.phone, 40);
  const note = clean(b.note, 300);
  const year = b.year == null || b.year === '' ? null : Number(b.year);
  const email = req.user ? req.user.email : normalizeEmail(b.email);
  if (!brand) return res.status(400).json({ ok: false, message: 'Add meg a márkát.' });
  if (modelName.length < 2) return res.status(400).json({ ok: false, message: 'Add meg a modellt (pl. G2 Pro Max).' });
  if (year != null && !(Number.isInteger(year) && year >= 2015 && year <= new Date().getFullYear() + 1)) {
    return res.status(400).json({ ok: false, message: 'Hibás évjárat.' });
  }
  if (!isEmail(email)) return res.status(400).json({ ok: false, message: 'Adj meg egy érvényes e-mail címet – ide szólunk, ha elkészült.' });
  if (!b.consent) return res.status(400).json({ ok: false, message: 'Az értesítéshez kérjük a hozzájárulásod (pipa).' });
  const { wish, duplicate } = upsertWish({
    userId: req.user?.id ?? null, email, name: name || req.user?.name || null, phone: phone || req.user?.phone || null,
    brand, modelName, year, note, consent: true,
  });
  return res.status(duplicate ? 200 : 201).json({ ok: true, wish: { id: wish.id, brand: wish.brand, modelName: wish.modelName, year: wish.year }, duplicate });
});

router.get('/api/account/wishes', requireUser, (req, res) => {
  res.json({ ok: true, wishes: listByUser(req.user.id) });
});

router.delete('/api/account/wishes/:id', requireUser, (req, res) => {
  const ok = deleteForUser(String(req.params.id), req.user.id);
  res.status(ok ? 200 : 404).json({ ok, message: ok ? undefined : 'Nincs ilyen kívánság.' });
});

router.get('/api/admin/wishes', requireAdmin, (req, res) => {
  const key = req.query.key ? String(req.query.key) : null;
  res.json({ ok: true, summary: adminSummary(), wishes: key ? adminListByKey(key) : undefined });
});

router.get('/api/admin/wishes.csv', (req, res) => {
  if (typeof req.query.token === 'string' && req.query.token && !req.headers['x-admin-token']) req.headers['x-admin-token'] = req.query.token;
  if (!isAdminRequest(req)) return res.status(403).json({ ok: false, message: 'Csak adminisztrátornak.' });
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [['brand', 'model', 'year', 'email', 'name', 'phone', 'note', 'status', 'created_at', 'notified_at'].join(';')];
  for (const w of adminListAll()) lines.push([w.brand, w.modelName, w.year, w.email, w.name, w.phone, w.note, w.status, w.createdAt, w.notifiedAt].map(esc).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="scoover-kivansaglista.csv"');
  return res.send(`﻿${lines.join('\n')}`);
});

/** "Elkészült a fólia ehhez a modellhez" – e-mail mindenkinek, aki erre vár és hozzájárult. */
router.post('/api/admin/wishes/notify', requireAdmin, async (req, res) => {
  const key = clean(req.body?.modelKey, 120);
  if (!key) return res.status(400).json({ ok: false, message: 'Hiányzó modell-kulcs.' });
  const link = clean(req.body?.link, 300) || null;
  const message = clean(req.body?.message, 600) || null;
  const targets = openByKey(key);
  let sent = 0;
  const failed = [];
  for (const w of targets) {
    try { await sendMail(wishAvailableMail(w, { link, message })); sent++; } catch (e) { failed.push(`${w.email}: ${e.message}`); }
  }
  markNotified(targets.filter((w) => !failed.some((f) => f.startsWith(`${w.email}:`))).map((w) => w.id));
  return res.json({ ok: true, sent, failed });
});

export default router;

/**
 * Fiók: regisztráció, belépés, kilépés, profil, e-mail megerősítés,
 * jelszó-visszaállítás, Terveim, Rollereim.
 *
 * Biztonsági elvek: a belépési hibaüzenet nem árulja el, hogy létezik-e a
 * fiók; a jelszó-visszaállítás válasza mindig ugyanaz; jelszóváltásnál a többi
 * munkamenet lezárul; kérésszám-korlát a próbálgatás ellen.
 */
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDb, nowIso } from '../lib/db.js';
import {
  createUser, findUserByEmail, findUserById, updateUser, markVerified, publicUser,
  verifyPassword, validatePassword, normalizeEmail, isEmail,
  createSession, destroySession, destroyAllSessions, requireUser,
  issueToken, consumeToken, rateLimit,
} from '../lib/auth.js';
import { sendMail, verificationMail, passwordResetMail } from '../lib/mailer.js';
import { listDesignsByOwner } from '../lib/designStore.js';
import { MODEL_REGISTRY, getModelMeta } from '../../src/data/models/index.js';

const router = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: 'auth' });

router.get('/api/account/me', (req, res) => res.json({ ok: true, user: publicUser(req.user) }));

router.post('/api/account/register', authLimit, async (req, res) => {
  const { email, password, name, phone } = req.body ?? {};
  const em = normalizeEmail(email);
  if (!isEmail(em)) return res.status(400).json({ ok: false, message: 'Adj meg egy érvényes e-mail címet.' });
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ ok: false, message: pwErr });
  if (findUserByEmail(em)) return res.status(409).json({ ok: false, message: 'Ezzel az e-mail címmel már van fiók – lépj be, vagy kérj új jelszót.' });
  const user = createUser({ email: em, password, name, phone });
  createSession(res, user.id, req.headers['user-agent']);
  const token = issueToken(user.id, 'verify', 24 * 60);
  const mail = await sendMail(verificationMail(user, token)).catch((e) => ({ error: e.message }));
  return res.status(201).json({
    ok: true, user: publicUser(user),
    message: mail?.delivered ? 'Sikeres regisztráció! Küldtünk egy megerősítő e-mailt.' : 'Sikeres regisztráció!',
  });
});

router.post('/api/account/login', authLimit, (req, res) => {
  const { email, password } = req.body ?? {};
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(String(password ?? ''), user.password_hash)) {
    return res.status(401).json({ ok: false, message: 'Hibás e-mail cím vagy jelszó.' });
  }
  createSession(res, user.id, req.headers['user-agent']);
  return res.json({ ok: true, user: publicUser(user) });
});

router.post('/api/account/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.put('/api/account/me', requireUser, (req, res) => {
  const { name, phone, address, password } = req.body ?? {};
  if (password) {
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ ok: false, message: pwErr });
  }
  const user = updateUser(req.user.id, { name, phone, address, password });
  if (password) { destroyAllSessions(req.user.id); createSession(res, user.id, req.headers['user-agent']); }
  return res.json({ ok: true, user: publicUser(user) });
});

router.post('/api/account/verify', (req, res) => {
  const userId = consumeToken(req.body?.token, 'verify');
  if (!userId) return res.status(400).json({ ok: false, message: 'A megerősítő link érvénytelen vagy lejárt.' });
  markVerified(userId);
  const user = findUserById(userId);
  return res.json({ ok: true, user: req.user?.id === userId ? publicUser(user) : null, message: 'Az e-mail címed megerősítve.' });
});

router.post('/api/account/verify/resend', requireUser, authLimit, async (req, res) => {
  if (req.user.verified_at) return res.json({ ok: true, message: 'Az e-mail címed már megerősített.' });
  const token = issueToken(req.user.id, 'verify', 24 * 60);
  await sendMail(verificationMail(req.user, token)).catch(() => null);
  return res.json({ ok: true, message: 'Megerősítő e-mail elküldve.' });
});

router.post('/api/account/password/forgot', authLimit, async (req, res) => {
  const user = findUserByEmail(req.body?.email);
  if (user) {
    const token = issueToken(user.id, 'reset', 60);
    await sendMail(passwordResetMail(user, token)).catch(() => null);
  }
  return res.json({ ok: true, message: 'Ha van ilyen fiók, elküldtük a visszaállító linket az e-mail címre.' });
});

router.post('/api/account/password/reset', authLimit, (req, res) => {
  const { token, password } = req.body ?? {};
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ ok: false, message: pwErr });
  const userId = consumeToken(token, 'reset');
  if (!userId) return res.status(400).json({ ok: false, message: 'A visszaállító link érvénytelen vagy lejárt – kérj újat.' });
  const user = updateUser(userId, { password });
  if (!user.verified_at) markVerified(userId); // a linkre kattintás bizonyítja az e-mail birtoklását
  destroyAllSessions(userId);
  createSession(res, userId, req.headers['user-agent']);
  return res.json({ ok: true, user: publicUser(findUserById(userId)), message: 'Új jelszó beállítva.' });
});

// --- Terveim ---
router.get('/api/account/designs', requireUser, (req, res) => {
  res.json({ ok: true, designs: listDesignsByOwner(req.user.id) });
});

// --- Rollereim ---
const rowToScooter = (r) => ({ id: r.id, modelId: r.model_id, year: r.year, nickname: r.nickname, createdAt: r.created_at });

router.get('/api/account/scooters', requireUser, (req, res) => {
  const rows = getDb().prepare('SELECT * FROM scooters WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ ok: true, scooters: rows.map(rowToScooter) });
});

router.post('/api/account/scooters', requireUser, (req, res) => {
  const { modelId, year, nickname } = req.body ?? {};
  const meta = getModelMeta(modelId);
  if (!meta) return res.status(400).json({ ok: false, message: `Ismeretlen modell (${MODEL_REGISTRY.map((m) => m.name).join(', ')}).` });
  const y = year == null ? null : Number(year);
  if (y != null && meta.years?.length && !meta.years.includes(y)) return res.status(400).json({ ok: false, message: 'Ehhez a modellhez nincs ilyen évjárat.' });
  const id = randomUUID();
  getDb().prepare('INSERT INTO scooters (id, user_id, model_id, year, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, modelId, y, String(nickname ?? '').trim().slice(0, 40) || null, nowIso());
  return res.status(201).json({ ok: true, scooter: { id, modelId, year: y, nickname } });
});

router.delete('/api/account/scooters/:id', requireUser, (req, res) => {
  getDb().prepare('DELETE FROM scooters WHERE id = ? AND user_id = ?').run(String(req.params.id), req.user.id);
  res.json({ ok: true });
});

export default router;

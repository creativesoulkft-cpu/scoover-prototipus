/**
 * Fiókok és munkamenetek.
 *
 * - Jelszó: scrypt (Node beépített), véletlen sóval; formátum
 *   `scrypt$N$r$p$só$hash` – a paraméterek a hash-ben, így később emelhetők.
 * - Munkamenet: 32 bájt véletlen azonosító httpOnly sütiben; az adatbázisban
 *   csak a SHA-256 hash-e (adatbázis-szivárgás esetén sem használható).
 * - Egyszer használatos tokenek (e-mail megerősítés, jelszó-visszaállítás):
 *   szintén csak hash-elve, lejárattal.
 * - CSRF: minden állapotváltó kérésnek `X-Requested-With: scoover` fejlécet
 *   kell vinnie (lásd csrfGuard) – idegen oldal űrlapja ezt nem tudja beállítani.
 * - Admin: `ADMIN_TOKEN` fejlécben (x-admin-token) VAGY admin szerepű fiók.
 * - Egyszerű, memóriabeli kérésszám-korlát a belépési végpontokra.
 */
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDb, nowIso } from './db.js';
import { config } from '../config.js';

const SESSION_COOKIE = 'scv_session';
const SESSION_DAYS = 30;
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------------------
// Jelszó
// ---------------------------------------------------------------------------
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algo, N, r, p, saltB64, hashB64] = String(stored).split('$');
    if (algo !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length,
      { N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) return 'A jelszó legalább 8 karakter legyen.';
  if (password.length > 200) return 'A jelszó túl hosszú.';
  return null;
}

export const normalizeEmail = (e) => String(e ?? '').trim().toLowerCase();
export const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// ---------------------------------------------------------------------------
// Felhasználók
// ---------------------------------------------------------------------------
export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id, email: row.email, name: row.name, phone: row.phone, address: row.address,
    role: row.role, verifiedAt: row.verified_at, createdAt: row.created_at,
  };
}

export function findUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) ?? null;
}
export function findUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) ?? null;
}

export function createUser({ email, password, name, phone }) {
  const now = nowIso();
  const id = randomUUID();
  const role = config.adminEmails.includes(normalizeEmail(email)) ? 'admin' : 'customer';
  getDb().prepare(`INSERT INTO users (id, email, password_hash, name, phone, role, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, normalizeEmail(email), hashPassword(password), name?.trim() || null, phone?.trim() || null, role, now, now);
  return findUserById(id);
}

export function updateUser(id, { name, phone, address, password }) {
  const db = getDb();
  const sets = [];
  const vals = [];
  if (name !== undefined) { sets.push('name = ?'); vals.push(name?.trim() || null); }
  if (phone !== undefined) { sets.push('phone = ?'); vals.push(phone?.trim() || null); }
  if (address !== undefined) { sets.push('address = ?'); vals.push(address?.trim() || null); }
  if (password) { sets.push('password_hash = ?'); vals.push(hashPassword(password)); }
  if (!sets.length) return findUserById(id);
  sets.push('updated_at = ?'); vals.push(nowIso());
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  return findUserById(id);
}

export function markVerified(id) {
  getDb().prepare('UPDATE users SET verified_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), id);
}

// ---------------------------------------------------------------------------
// Munkamenet (süti)
// ---------------------------------------------------------------------------
function parseCookies(header) {
  const out = {};
  for (const part of String(header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function createSession(res, userId, userAgent) {
  const raw = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  getDb().prepare('INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)')
    .run(sha256(raw), userId, nowIso(), expires.toISOString(), String(userAgent ?? '').slice(0, 200));
  res.setHeader('Set-Cookie', cookieString(raw, expires));
}

export function destroySession(req, res) {
  const raw = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (raw) getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sha256(raw));
  res.setHeader('Set-Cookie', cookieString('', new Date(0)));
}

export function destroyAllSessions(userId) {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

function cookieString(value, expires) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/', 'HttpOnly',
    `SameSite=${config.sessionSameSite}`,
    `Expires=${expires.toUTCString()}`,
  ];
  if (config.cookieSecure || config.sessionSameSite.toLowerCase() === 'none') parts.push('Secure');
  return parts.join('; ');
}

/** Express middleware: a süti alapján req.user (vagy null). Lejárt munkameneteket takarít. */
export function attachUser(req, res, next) {
  req.user = null;
  const raw = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (raw) {
    const db = getDb();
    const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sha256(raw));
    if (s) {
      if (s.expires_at < nowIso()) db.prepare('DELETE FROM sessions WHERE id = ?').run(s.id);
      else req.user = findUserById(s.user_id);
    }
  }
  next();
}

export const currentUser = (req) => req.user ?? null;

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ ok: false, message: 'Ehhez be kell lépni.', code: 'unauthenticated' });
  return next();
}

export function isAdminRequest(req) {
  if (req.user?.role === 'admin') return true;
  const t = req.headers['x-admin-token'];
  return Boolean(config.adminToken) && typeof t === 'string' && t.length === config.adminToken.length
    && timingSafeEqual(Buffer.from(t), Buffer.from(config.adminToken));
}

export function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) return res.status(403).json({ ok: false, message: 'Csak adminisztrátornak.', code: 'forbidden' });
  return next();
}

/** CSRF: állapotváltó kérés csak a saját kliensünk fejlécével. */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers['x-requested-with'] !== 'scoover' && !req.headers['x-admin-token']) {
    return res.status(403).json({ ok: false, message: 'Hiányzó X-Requested-With fejléc.', code: 'csrf' });
  }
  return next();
}

// ---------------------------------------------------------------------------
// Egyszer használatos tokenek
// ---------------------------------------------------------------------------
export function issueToken(userId, kind, ttlMinutes) {
  const raw = randomBytes(32).toString('base64url');
  const db = getDb();
  db.prepare('DELETE FROM tokens WHERE user_id = ? AND kind = ?').run(userId, kind);
  db.prepare('INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha256(raw), userId, kind, new Date(Date.now() + ttlMinutes * 60000).toISOString());
  return raw;
}

/** @returns {string|null} a felhasználó id-ja, ha a token érvényes (és felhasználja) */
export function consumeToken(raw, kind) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tokens WHERE token_hash = ? AND kind = ?').get(sha256(String(raw ?? '')));
  if (!row || row.used_at || row.expires_at < nowIso()) return null;
  db.prepare('UPDATE tokens SET used_at = ? WHERE token_hash = ?').run(nowIso(), row.token_hash);
  return row.user_id;
}

// ---------------------------------------------------------------------------
// Kérésszám-korlát (memóriában; több példányos futtatásnál Redis/proxy szintre kell vinni)
// ---------------------------------------------------------------------------
const buckets = new Map();
export function rateLimit({ windowMs, max, key = 'rl' }) {
  return (req, res, next) => {
    const now = Date.now();
    const k = `${key}:${req.ip}`;
    const b = buckets.get(k) ?? { start: now, count: 0 };
    if (now - b.start > windowMs) { b.start = now; b.count = 0; }
    b.count += 1;
    buckets.set(k, b);
    if (buckets.size > 10000) buckets.clear();
    if (b.count > max) return res.status(429).json({ ok: false, message: 'Túl sok próbálkozás – várj egy kicsit.' });
    return next();
  };
}

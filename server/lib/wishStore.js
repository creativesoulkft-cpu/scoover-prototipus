/**
 * Kívánságlista tárolás (wishes tábla): ki melyik rollerre szeretne fóliát.
 *
 * Kulcs: `model_key` = márka + modellnév normalizálva (kisbetű, ékezet
 * nélkül, egy szóköz) – erre csoportosít az admin összesítés, és ez alapján
 * nem duplikálunk (ugyanaz az e-mail + modell → frissítés).
 */
import { randomUUID } from 'node:crypto';
import { getDb, nowIso } from './db.js';

export function modelKey(brand, modelName) {
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ').trim().replace(/\s+/g, ' ');
  return `${norm(brand)}|${norm(modelName)}`;
}

const row2wish = (r) => (r ? {
  id: r.id, userId: r.user_id, email: r.email, name: r.name, phone: r.phone, brand: r.brand, modelName: r.model_name,
  modelKey: r.model_key, year: r.year, note: r.note, status: r.status, consent: Boolean(r.consent),
  createdAt: r.created_at, updatedAt: r.updated_at, notifiedAt: r.notified_at,
} : null);

/**
 * Új kívánság, vagy a meglévő frissítése (ugyanaz az e-mail + modell).
 * @returns {{ wish: object, duplicate: boolean }}
 */
export function upsertWish({ userId = null, email, name, phone, brand, modelName, year, note, consent, source = 'configurator' }) {
  const db = getDb();
  const key = modelKey(brand, modelName);
  const now = nowIso();
  const existing = db.prepare("SELECT * FROM wishes WHERE email = ? AND model_key = ? AND status = 'open'").get(email, key);
  if (existing) {
    db.prepare(`UPDATE wishes SET user_id = COALESCE(?, user_id), name = COALESCE(?, name), phone = COALESCE(?, phone),
                year = COALESCE(?, year), note = COALESCE(?, note), consent = ?, updated_at = ? WHERE id = ?`)
      .run(userId, name || null, phone || null, year ?? null, note || null, consent ? 1 : 0, now, existing.id);
    return { wish: row2wish(db.prepare('SELECT * FROM wishes WHERE id = ?').get(existing.id)), duplicate: true };
  }
  const id = randomUUID();
  db.prepare(`INSERT INTO wishes (id, user_id, email, name, phone, brand, model_name, model_key, year, note, status, consent, source, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`)
    .run(id, userId, email, name || null, phone || null, brand, modelName, key, year ?? null, note || null, consent ? 1 : 0, source, now, now);
  return { wish: row2wish(db.prepare('SELECT * FROM wishes WHERE id = ?').get(id)), duplicate: false };
}

export function listByUser(userId) {
  return getDb().prepare('SELECT * FROM wishes WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(row2wish);
}

/** Fiók nélkül leadott kívánságok hozzákötése a fiókhoz (regisztráció/belépés után, e-mail egyezés). */
export function attachToUser(email, userId) {
  return getDb().prepare('UPDATE wishes SET user_id = ?, updated_at = ? WHERE email = ? AND user_id IS NULL')
    .run(userId, nowIso(), email).changes;
}

export function deleteForUser(id, userId) {
  return getDb().prepare('DELETE FROM wishes WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

/** Admin: modellenkénti összesítés (hányan várnak rá). */
export function adminSummary() {
  const db = getDb();
  const rows = db.prepare(`SELECT model_key, MIN(brand) AS brand, MIN(model_name) AS model_name, COUNT(*) AS total,
                            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open, MAX(created_at) AS latest,
                            GROUP_CONCAT(year) AS years
                            FROM wishes GROUP BY model_key ORDER BY open DESC, total DESC, latest DESC`).all();
  return rows.map((r) => {
    const years = {};
    for (const y of String(r.years ?? '').split(',').filter(Boolean)) years[y] = (years[y] ?? 0) + 1;
    return { modelKey: r.model_key, brand: r.brand, modelName: r.model_name, total: r.total, open: r.open, latest: r.latest, years };
  });
}

export function adminListByKey(key) {
  return getDb().prepare('SELECT * FROM wishes WHERE model_key = ? ORDER BY created_at DESC').all(key).map(row2wish);
}

export function adminListAll() {
  return getDb().prepare('SELECT * FROM wishes ORDER BY model_key, created_at DESC').all().map(row2wish);
}

export function openByKey(key) {
  return getDb().prepare("SELECT * FROM wishes WHERE model_key = ? AND status = 'open' AND consent = 1").all(key).map(row2wish);
}

export function markNotified(ids) {
  const db = getDb();
  const stmt = db.prepare("UPDATE wishes SET status = 'notified', notified_at = ?, updated_at = ? WHERE id = ?");
  const now = nowIso();
  for (const id of ids) stmt.run(now, now, id);
}

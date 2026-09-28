/**
 * Mentett tervek tárolása (designs tábla).
 *
 * Azonosító: SCV-XXXXXX (schema.js DESIGN_ID_ALPHABET), ütközés-ellenőrzéssel.
 * Fiók nélküli mentésnél a válasz egy `editKey`-t ad; csak annak hash-ét
 * tároljuk, a kulcsot a vevő böngészője őrzi. Fiókkal a tulajdonos kulcs
 * nélkül is módosíthat, és a tervet a fiókjához "igényelheti" (claim).
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { getDb, nowIso } from './db.js';
import { DESIGN_ID_ALPHABET, MAX_TITLE_LENGTH } from '../../src/design/schema.js';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

function generateId() {
  let s = 'SCV-';
  for (let i = 0; i < 6; i++) s += DESIGN_ID_ALPHABET[randomInt(DESIGN_ID_ALPHABET.length)];
  return s;
}

function rowToRecord(row, { withDoc = true } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    model: row.model,
    year: row.year,
    status: row.status,
    hasPreview: Boolean(row.preview_path),
    previewPath: row.preview_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(withDoc ? { design: JSON.parse(row.doc) } : {}),
  };
}

const cleanTitle = (t) => (typeof t === 'string' && t.trim() ? t.trim().slice(0, MAX_TITLE_LENGTH) : null);

export function createDesign(doc, { title, ownerUserId = null } = {}) {
  const db = getDb();
  let id;
  for (let i = 0; i < 20; i++) {
    id = generateId();
    if (!db.prepare('SELECT 1 FROM designs WHERE id = ?').get(id)) break;
    id = null;
  }
  if (!id) throw new Error('Nem sikerült egyedi terv-azonosítót adni.');
  const editKey = ownerUserId ? null : randomBytes(18).toString('base64url');
  const now = nowIso();
  const stored = { ...doc, id, meta: { ...doc.meta, updatedAt: now } };
  db.prepare(`INSERT INTO designs (id, owner_user_id, edit_key_hash, title, model, year, doc, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`)
    .run(id, ownerUserId, editKey ? sha256(editKey) : null, cleanTitle(title) ?? cleanTitle(doc.title), doc.model, doc.year ?? null,
      JSON.stringify(stored), now, now);
  return { id, editKey, createdAt: now, updatedAt: now };
}

export function getDesign(id, opts) {
  return rowToRecord(getDb().prepare('SELECT * FROM designs WHERE id = ?').get(id), opts);
}

/** Jogosult-e a hívó a terv módosítására: tulajdonos, vagy a helyes editKey birtokosa, vagy admin. */
export function canEdit(record, { userId = null, editKey = null, isAdmin = false }) {
  if (!record) return false;
  if (isAdmin) return true;
  if (record.ownerUserId) return Boolean(userId) && record.ownerUserId === userId;
  const row = getDb().prepare('SELECT edit_key_hash FROM designs WHERE id = ?').get(record.id);
  if (!row?.edit_key_hash) return Boolean(userId); // kulcs nélküli, tulajdonos nélküli terv (nem fordul elő normál úton)
  return Boolean(editKey) && sha256(editKey) === row.edit_key_hash;
}

export function updateDesign(id, doc, { title } = {}) {
  const now = nowIso();
  const stored = { ...doc, id, meta: { ...doc.meta, updatedAt: now } };
  getDb().prepare('UPDATE designs SET doc = ?, title = COALESCE(?, title), model = ?, year = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(stored), cleanTitle(title) ?? cleanTitle(doc.title), doc.model, doc.year ?? null, now, id);
  return { id, updatedAt: now };
}

export function setPreviewPath(id, path) {
  getDb().prepare('UPDATE designs SET preview_path = ? WHERE id = ?').run(path, id);
}

export function setOwner(id, userId) {
  getDb().prepare('UPDATE designs SET owner_user_id = ?, edit_key_hash = NULL, updated_at = ? WHERE id = ?').run(userId, nowIso(), id);
}

export function setStatus(id, status) {
  getDb().prepare('UPDATE designs SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
}

export function deleteDesign(id) {
  getDb().prepare('DELETE FROM designs WHERE id = ?').run(id);
}

export function listDesignsByOwner(userId) {
  return getDb().prepare('SELECT * FROM designs WHERE owner_user_id = ? ORDER BY updated_at DESC').all(userId)
    .map((r) => rowToRecord(r, { withDoc: false }));
}

export function listRecentDesigns(limit = 50) {
  return getDb().prepare('SELECT * FROM designs ORDER BY updated_at DESC LIMIT ?').all(limit)
    .map((r) => rowToRecord(r, { withDoc: false }));
}

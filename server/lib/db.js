/**
 * SQLite adatbázis a híd szerverhez – a Node beépített `node:sqlite`
 * moduljával (nincs natív fordítás, nincs külső függőség).
 *
 * Táblák (lásd MIGRATIONS): designs (mentett tervek), print_jobs (nyomdai
 * feladatok), users / sessions / tokens / scooters (fiók). A séma verziózott:
 * minden lépés egyszer fut le, a `schema_migrations` tábla jegyzi.
 *
 * Éles környezetben az adatbázis-fájlt (DB_PATH) rendszeres mentés alá kell
 * vonni – ez hordozza a vevők terveit és fiókjait.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS designs (
        id            TEXT PRIMARY KEY,
        owner_user_id TEXT,
        edit_key_hash TEXT,
        title         TEXT,
        model         TEXT NOT NULL,
        year          INTEGER,
        doc           TEXT NOT NULL,
        preview_path  TEXT,
        status        TEXT NOT NULL DEFAULT 'draft',
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS designs_owner ON designs(owner_user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS print_jobs (
        id            TEXT PRIMARY KEY,
        design_id     TEXT NOT NULL,
        order_ref     TEXT,
        status        TEXT NOT NULL,
        progress      TEXT,
        error         TEXT,
        manifest      TEXT,
        dir           TEXT,
        created_by    TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS print_jobs_design ON print_jobs(design_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          TEXT,
        phone         TEXT,
        address       TEXT,
        role          TEXT NOT NULL DEFAULT 'customer',
        verified_at   TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        expires_at    TEXT NOT NULL,
        user_agent    TEXT
      );
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS tokens (
        token_hash    TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        kind          TEXT NOT NULL,
        expires_at    TEXT NOT NULL,
        used_at       TEXT
      );
      CREATE TABLE IF NOT EXISTS scooters (
        id            TEXT PRIMARY KEY,
        user_id       TEXT NOT NULL,
        model_id      TEXT NOT NULL,
        year          INTEGER,
        nickname      TEXT,
        created_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS scooters_user ON scooters(user_id);
    `,
  },
];

let db = null;

/** @param {string} path fájl útvonal vagy ':memory:' */
export function openDb(path) {
  if (db) return db;
  if (path !== ':memory:' && !existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(m.version, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

export function getDb() {
  if (!db) throw new Error('Az adatbázis nincs megnyitva (openDb).');
  return db;
}

export const nowIso = () => new Date().toISOString();

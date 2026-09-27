/**
 * Database access layer.
 *
 * All application code writes PostgreSQL-flavoured SQL ($1 placeholders,
 * RETURNING, jsonb columns). Two drivers are supported:
 *
 *   - `pg`     when DATABASE_URL is set (production / real Postgres)
 *   - sqlite   otherwise, via node:sqlite, so the app runs with zero setup
 *
 * The SQLite driver translates the canonical schema and each query on the
 * fly, so schema.pg.sql stays the single source of truth.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(here, 'schema.pg.sql');

/** Mechanically rewrite the Postgres DDL into an equivalent SQLite one. */
export function toSqliteSchema(pgSql) {
  return pgSql
    // Strip casts first: otherwise the JSONB rule turns '[]'::jsonb into '[]'::TEXT.
    .replace(/::jsonb/gi, '')
    .replace(/\bSERIAL PRIMARY KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bBOOLEAN\b/gi, 'INTEGER')
    .replace(/\bDOUBLE PRECISION\b/gi, 'REAL')
    .replace(/\bNUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'REAL')
    .replace(/\bDATE\b(?!\w)/g, 'TEXT')
    .replace(/DEFAULT\s+now\(\)/gi, "DEFAULT (datetime('now'))")
    .replace(/DEFAULT\s+false\b/gi, 'DEFAULT 0')
    .replace(/DEFAULT\s+true\b/gi, 'DEFAULT 1');
}

/**
 * Rewrite $1-style placeholders to positional `?`, reordering the parameter
 * array to match. Handles repeated and out-of-order references.
 */
export function toSqliteQuery(sql, params) {
  const reordered = [];
  const text = sql.replace(/\$(\d+)/g, (_, n) => {
    reordered.push(params[Number(n) - 1]);
    return '?';
  });
  // SQLite has no native boolean; bind them as 0/1.
  return [text, reordered.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))];
}

let impl;

async function createPgDriver(url) {
  const { default: pg } = await import('pg');
  // Return dates the way SQLite does: DATE as 'YYYY-MM-DD', timestamps as ISO
  // strings. pg's default is a JS Date, and code written against SQLite then
  // breaks only in production - String(date).slice(0, 10) yields 'Sun Sep 27',
  // and comparing two Dates as strings compares their weekday names.
  pg.types.setTypeParser(1082, (v) => v);
  pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
  pg.types.setTypeParser(1114, (v) => new Date(`${v.replace(' ', 'T')}Z`).toISOString());
  // Hosted Postgres (Supabase, Neon, RDS) requires TLS; a local server usually
  // has none. PGSSL=off forces plain connections for an unusual remote setup.
  const host = new URL(url).hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const ssl = local || process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false };
  const pool = new pg.Pool({ connectionString: url, ssl });
  // Poolers close idle connections; without a listener that error kills the
  // process. The pool discards the dead client and opens a fresh one on demand.
  pool.on('error', (err) => console.error('Postgres idle client error:', err.message));
  return {
    dialect: 'postgres',
    async query(sql, params = []) {
      const res = await pool.query(sql, params);
      return res.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
  };
}

async function createSqliteDriver(file) {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  return {
    dialect: 'sqlite',
    raw: db,
    async query(sql, params = []) {
      const [text, values] = toSqliteQuery(sql, params);
      const stmt = db.prepare(text);
      // SQLite returns rows for RETURNING clauses too, so `all` covers both.
      if (/^\s*(select|with)/i.test(text) || /returning/i.test(text)) {
        return stmt.all(...values);
      }
      stmt.run(...values);
      return [];
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}

export async function getDb() {
  if (impl) return impl;
  const url = process.env.DATABASE_URL;
  impl = url
    ? await createPgDriver(url)
    : await createSqliteDriver(process.env.SQLITE_PATH || path.join(here, '../../data/braj.db'));
  return impl;
}

/** Run a parameterised query, returning rows. */
export async function query(sql, params = []) {
  const db = await getDb();
  return db.query(sql, params);
}

/** Run a query expecting at most one row. */
export async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/** Create all tables if they do not exist. */
export async function migrate() {
  const db = await getDb();
  const pgSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await db.exec(db.dialect === 'postgres' ? pgSql : toSqliteSchema(pgSql));
  if (db.dialect === 'postgres') await lockPublicTables(db);
  return db.dialect;
}

/**
 * Supabase publishes every table in `public` through its REST API to anyone
 * holding the project's publishable key, which ships to browsers. Row Level
 * Security with no policies denies that path entirely; this server connects
 * as the table owner, so its own queries are unaffected.
 */
async function lockPublicTables(db) {
  const tables = await db.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity`
  );
  for (const { tablename } of tables) {
    await db.exec(`ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY`);
  }
}

/**
 * jsonb columns come back parsed from Postgres but as strings from SQLite.
 * Normalise so route handlers never have to care which driver is active.
 */
export function json(value, fallback = []) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

/** Serialise a value for a jsonb/TEXT column on either driver. */
export function jsonParam(value) {
  return JSON.stringify(value ?? null);
}

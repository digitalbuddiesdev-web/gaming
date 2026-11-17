import { PGlite, type Transaction } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

// shortcut: embedded Postgres (PGlite) so the app runs with no server install.
// Swap for `pg` + DATABASE_URL before running more than a handful of concurrent
// admins — the SQL here is plain Postgres and ports unchanged.
// PG_DATA_DIR is overridden by scripts/check.mjs to run against in-memory Postgres.
const DATA_DIR = process.env.PG_DATA_DIR || path.join(process.cwd(), ".data", "pg");
const SCHEMA_FILE = path.join(process.cwd(), "db", "schema.sql");

type Handle = { db: PGlite; ready: Promise<unknown> };

const globalForDb = globalThis as unknown as { __pgHandle?: Handle };

function handle(): Handle {
  if (!globalForDb.__pgHandle) {
    if (!DATA_DIR.startsWith("memory://")) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new PGlite(DATA_DIR);
    globalForDb.__pgHandle = {
      db,
      ready: db.waitReady.then(() => db.exec(fs.readFileSync(SCHEMA_FILE, "utf8"))),
    };
  }
  return globalForDb.__pgHandle;
}

async function ready() {
  const h = handle();
  await h.ready;
  return h.db;
}

export async function sql<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await ready();
  const result = await db.query<T>(query, params);
  return result.rows;
}

export async function one<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await sql<T>(query, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (db: Transaction) => Promise<T>): Promise<T> {
  const db = await ready();
  return db.transaction(fn);
}

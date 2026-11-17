import { PGlite, type Transaction as PGliteTransaction } from "@electric-sql/pglite";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

// Backend-neutral client: both PGlite and node-postgres expose query<T>() -> { rows }.
// PGlite reports affectedRows; node-postgres reports rowCount. Keep both.
export type QueryResult<T> = { rows: T[]; affectedRows?: number; rowCount?: number | null };

export type Transaction = {
  query<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<QueryResult<T>>;
};

// DATABASE_URL selects Supabase Postgres; without it PGlite keeps local dev and
// scripts/check.mjs self-contained. The SQL is plain Postgres in both modes.
// PG_DATA_DIR is overridden by scripts/check.mjs to run against in-memory Postgres.
const DATA_DIR = process.env.PG_DATA_DIR || path.join(process.cwd(), ".data", "pg");
const SCHEMA_FILE = path.join(process.cwd(), "db", "schema.sql");

type Handle =
  | { mode: "pg"; pool: pg.Pool; ready: Promise<unknown> }
  | { mode: "pglite"; db: PGlite; ready: Promise<unknown> };

const globalForDb = globalThis as unknown as { __pgHandle?: Handle };

function positiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function handle(): Handle {
  if (!globalForDb.__pgHandle) {
    const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
    if (process.env.DATABASE_URL) {
      // shortcut: max × replicas must stay within the DB connection budget.
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: positiveInt("PGPOOL_MAX", 5),
        idleTimeoutMillis: positiveInt("PGPOOL_IDLE_TIMEOUT_MS", 30000),
        connectionTimeoutMillis: positiveInt("PGPOOL_CONNECTION_TIMEOUT_MS", 5000),
      });
      globalForDb.__pgHandle = { mode: "pg", pool, ready: pool.query(schema) };
    } else {
      if (!DATA_DIR.startsWith("memory://")) fs.mkdirSync(DATA_DIR, { recursive: true });
      const db = new PGlite(DATA_DIR);
      globalForDb.__pgHandle = {
        mode: "pglite",
        db,
        ready: db.waitReady.then(() => db.exec(schema)),
      };
    }
  }
  return globalForDb.__pgHandle;
}

async function ready(): Promise<Transaction> {
  const h = handle();
  await h.ready;
  return (h.mode === "pg" ? h.pool : h.db) as unknown as Transaction;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const db = await ready();
  return db.query<T>(text, params);
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await query<T>(text, params)).rows;
}

export async function one<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (db: Transaction) => Promise<T>): Promise<T> {
  const h = handle();
  await h.ready;
  if (h.mode === "pglite") {
    return h.db.transaction(fn as (tx: PGliteTransaction) => Promise<T>);
  }
  const client = await h.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client as unknown as Transaction);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function close(): Promise<void> {
  const h = globalForDb.__pgHandle;
  if (!h) return;
  if (h.mode === "pg") await h.pool.end();
  else await h.db.close();
  globalForDb.__pgHandle = undefined;
}

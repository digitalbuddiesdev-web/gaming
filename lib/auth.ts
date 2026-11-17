import crypto from "node:crypto";
import { cookies } from "next/headers";
import { one, sql } from "./db";

const COOKIE = "sid";
const TTL_SECONDS = 60 * 60 * 24 * 7;

export type Role = "super_admin" | "operator_admin" | "agent" | "client";

export type Account = {
  id: string;
  operator_id: string;
  parent_id: string | null;
  username: string;
  full_name: string | null;
  role: Role;
  mode: "real" | "demo";
  balance: string;
  credit_limit: string;
  default_pct: string;
  exposure_limit: string;
  user_status: "active" | "locked";
  bet_status: "open" | "locked";
  deposit_mobile: string | null;
  operator_slug?: string;
  operator_name?: string;
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export async function startSession(accountId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  await sql(
    `insert into sessions (account_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(secs => $3))`,
    [accountId, sha256(token), TTL_SECONDS],
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql(`delete from sessions where token_hash = $1`, [sha256(token)]);
  jar.delete(COOKIE);
}

export async function currentAccount(): Promise<Account | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return one<Account>(
    `select a.*, o.slug as operator_slug, o.name as operator_name
       from sessions s
       join accounts a on a.id = s.account_id
       join operators o on o.id = a.operator_id
      where s.token_hash = $1 and s.expires_at > now() and a.user_status = 'active'`,
    [sha256(token)],
  );
}

/** An operator admin reaches the whole operator; an agent reaches only their own subtree. */
export async function canAct(viewer: Account, accountId: string): Promise<boolean> {
  if (viewer.role === "client") return false;
  if (viewer.role === "super_admin" || viewer.role === "operator_admin") {
    return Boolean(
      await one(`select 1 from accounts where id = $1 and operator_id = $2`, [accountId, viewer.operator_id]),
    );
  }
  return Boolean(
    await one(
      `with recursive downline as (
         select id from accounts where id = $1
         union all
         select a.id from accounts a join downline d on a.parent_id = d.id
       )
       select 1 from downline where id = $2`,
      [viewer.id, accountId],
    ),
  );
}

export function money(value: string | number): string {
  return Number(value).toFixed(2);
}

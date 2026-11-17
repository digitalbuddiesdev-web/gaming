import { query } from "./db.ts";

async function clientIp(): Promise<string> {
  try {
    // Dynamic so the self-check can import this module outside Next's resolver.
    const { headers } = await import("next/headers");
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return requestHeaders.get("x-real-ip")?.trim() || "local";
  } catch {
    return "local"; // outside a request (scripts/check.mjs)
  }
}

/** One atomic upsert so concurrent callers cannot both spend the same token. */
export async function consume(
  bucket: string,
  capacity: number,
  refillPerSecond: number,
): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`;
  const result = await query<{ allowed: boolean }>(
    `insert into rate_limit_buckets (key, tokens, updated_at)
     values ($1, $2 - 1, now())
     on conflict (key) do update
       set tokens = case
             when least($2, greatest(rate_limit_buckets.tokens, 0)
                  + extract(epoch from (now() - rate_limit_buckets.updated_at)) * $3) >= 1
             then least($2, greatest(rate_limit_buckets.tokens, 0)
                  + extract(epoch from (now() - rate_limit_buckets.updated_at)) * $3) - 1
             else -1
           end,
           updated_at = now()
     returning tokens >= 0 as allowed`,
    [key, capacity, refillPerSecond],
  );
  return result.rows[0]?.allowed ?? false;
}

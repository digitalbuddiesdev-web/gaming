import type { Account } from "./auth.ts";
import { one } from "./db.ts";

/** Resolve a referral code to its account. Codes are uppercase handles. */
export async function findAccountByReferralCode(operatorId: string, code: string): Promise<Account | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  return one<Account>(`select * from accounts where operator_id = $1 and referral_code = $2`, [operatorId, clean]);
}

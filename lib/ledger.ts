import type { Transaction } from "@electric-sql/pglite";
import { tx } from "./db.ts";

export type Movement = {
  accountId: string;
  operatorId: string;
  kind: "credit" | "debit";
  amount: string | number;
  description?: string | null;
  counterpartyId?: string | null;
  actorId: string;
};

/**
 * Single write path for the ledger. Arithmetic happens in Postgres on numeric,
 * so no float rounding. The balance guard is part of the UPDATE, so two
 * concurrent debits cannot both pass.
 *
 * Takes the transaction so settlement can credit many winners atomically.
 */
export async function moveIn(db: Transaction, m: Movement): Promise<string> {
  const amount = Number(m.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero");

  const delta = (m.kind === "credit" ? amount : -amount).toFixed(2);

  const updated = await db.query<{ balance: string }>(
    `update accounts
        set balance = balance + $2::numeric
      where id = $1 and operator_id = $3 and balance + $2::numeric >= 0
      returning balance`,
    [m.accountId, delta, m.operatorId],
  );

  const row = updated.rows[0];
  if (!row) {
    throw new Error(m.kind === "debit" ? "Insufficient balance" : "Account not found");
  }

  await db.query(
    `insert into transactions
       (operator_id, account_id, kind, amount, closing, description, counterparty_id, created_by)
     values ($1, $2, $3, $4::numeric, $5::numeric, $6, $7, $8)`,
    [m.operatorId, m.accountId, m.kind, amount.toFixed(2), row.balance, m.description ?? null, m.counterpartyId ?? null, m.actorId],
  );

  return row.balance;
}

export async function move(m: Movement): Promise<string> {
  return tx((db) => moveIn(db, m));
}

import type { Account } from "./auth.ts";
import { tx, type Transaction } from "./db.ts";
import { moveIn } from "./ledger.ts";

export type SimulatedRoundRecord = {
  id: string;
  operator_id: string;
  account_id: string;
  game_type: string;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  stake: string;
  multiplier: string | null;
  payout: string | null;
  status: string;
  game_data: any;
  created_at: string;
  settled_at: string | null;
};

/** Lock a round row for the whole settlement so two callers cannot both pay out. */
export async function lockRound(
  db: Transaction,
  roundId: string,
  accountId: string,
): Promise<SimulatedRoundRecord> {
  const res = await db.query<SimulatedRoundRecord>(
    `select * from simulated_game_rounds where id = $1 and account_id = $2 for update`,
    [roundId, accountId],
  );
  const round = res.rows[0];
  if (!round) throw new Error("Round not found");
  return round;
}

/**
 * Atomic crash cashout. The round is locked, checked, credited and marked
 * settled inside one transaction, so a second caller sees a settled round
 * and cannot credit again. Takes an already-authenticated viewer — this module
 * is deliberately not a "use server" file so it cannot be invoked directly.
 */
export async function settleCrashCashout(
  viewer: Account,
  params: { roundId: string; targetMultiplier: number },
) {
  const targetMultiplier = Number(params.targetMultiplier);
  if (!Number.isFinite(targetMultiplier) || targetMultiplier < 1.01) {
    throw new Error("Invalid cashout multiplier");
  }

  return tx(async (client) => {
    const round = await lockRound(client, params.roundId, viewer.id);
    if (round.status !== "active") {
      return {
        alreadySettled: true,
        status: round.status,
        crashPoint: round.game_data?.crashPoint,
        serverSeed: round.server_seed,
      };
    }

    const actualCrashPoint = Number(round.game_data?.crashPoint || 1.0);
    const stake = Number(round.stake);

    if (targetMultiplier <= actualCrashPoint) {
      const payout = Number((stake * targetMultiplier).toFixed(2));

      await moveIn(client, {
        accountId: viewer.id,
        operatorId: viewer.operator_id,
        kind: "credit",
        amount: payout,
        description: `Crash cashout win @ ${targetMultiplier.toFixed(2)}x`,
        actorId: viewer.id,
      });

      await client.query(
        `update simulated_game_rounds
            set status = 'won',
                multiplier = $1::numeric,
                payout = $2::numeric,
                settled_at = now()
          where id = $3 and status = 'active'`,
        [targetMultiplier.toFixed(2), payout.toFixed(2), round.id],
      );

      return {
        won: true,
        payout,
        multiplier: targetMultiplier,
        actualCrashPoint,
        serverSeed: round.server_seed,
      };
    }

    await client.query(
      `update simulated_game_rounds
          set status = 'lost',
              multiplier = $1::numeric,
              payout = 0,
              settled_at = now()
        where id = $2 and status = 'active'`,
      [actualCrashPoint.toFixed(2), round.id],
    );

    return {
      won: false,
      payout: 0,
      actualCrashPoint,
      serverSeed: round.server_seed,
    };
  });
}

import { tx } from "./db.ts";
import { moveIn } from "./ledger.ts";

export type Selection = "a" | "b";

type MarketRow = {
  id: string;
  name: string;
  odds: string;
};

/**
 * Sports book settlement. Kept separate from lib/casino.ts on purpose: the two
 * share the ledger, not the table, and merging them would only add conditionals.
 * Stake is debited at placement; the winning side is credited stake x odds.
 */
export async function placeSportBet(input: {
  operatorId: string;
  accountId: string;
  marketId: string;
  selection: string;
  stake: string | number;
}): Promise<{ name: string; balance: string }> {
  const stake = Number(input.stake);
  if (!Number.isFinite(stake) || stake <= 0) throw new Error("Stake must be greater than zero");
  if (input.selection !== "a" && input.selection !== "b") throw new Error("Pick a side");

  return tx(async (db) => {
    const market = await db.query<MarketRow>(
      `select m.id, m.name, m.odds
         from sport_markets m
         join sport_events e on e.id = m.event_id
        where m.id = $1 and m.operator_id = $2 and m.status = 'open'`,
      [input.marketId, input.operatorId],
    );
    const row = market.rows[0];
    if (!row) throw new Error("This market is closed");

    const account = await db.query<{ bet_status: string }>(
      `select bet_status from accounts where id = $1 and operator_id = $2`,
      [input.accountId, input.operatorId],
    );
    const bettor = account.rows[0];
    if (!bettor) throw new Error("Account not found");
    if (bettor.bet_status !== "open") throw new Error("Betting is locked on this account");

    await db.query(
      `insert into bets (operator_id, account_id, sport_market_id, selection, stake, odds)
       values ($1, $2, $3, $4, $5::numeric, $6::numeric)`,
      [input.operatorId, input.accountId, input.marketId, input.selection, stake.toFixed(2), row.odds],
    );

    const balance = await moveIn(db, {
      accountId: input.accountId,
      operatorId: input.operatorId,
      kind: "debit",
      amount: stake.toFixed(2),
      description: `Sports bet: ${row.name}`,
      actorId: input.accountId,
    });

    return { name: row.name, balance };
  });
}

export async function declareSportResult(input: {
  operatorId: string;
  marketId: string;
  winner: Selection;
  actorId: string;
}): Promise<{ winners: number; losers: number; paid: string }> {
  if (input.winner !== "a" && input.winner !== "b") throw new Error("Pick a winner");

  return tx(async (db) => {
    const settled = await db.query<{ name: string }>(
      `update sport_markets
          set status = 'settled', winner = $3, settled_by = $4, settled_at = now()
        where id = $1 and operator_id = $2 and status = 'open'
        returning name`,
      [input.marketId, input.operatorId, input.winner, input.actorId],
    );
    const market = settled.rows[0];
    if (!market) throw new Error("Market not found or already settled");

    const losers = await db.query(
      `update bets set status = 'lost', payout = 0, settled_at = now()
        where sport_market_id = $1 and selection <> $2 and status = 'open'`,
      [input.marketId, input.winner],
    );

    const winners = await db.query<{ account_id: string; payout: string }>(
      `update bets
          set status = 'won', payout = round(stake * odds, 2), settled_at = now()
        where sport_market_id = $1 and selection = $2 and status = 'open'
        returning account_id, payout`,
      [input.marketId, input.winner],
    );

    let paid = 0;
    for (const bet of winners.rows) {
      await moveIn(db, {
        accountId: bet.account_id,
        operatorId: input.operatorId,
        kind: "credit",
        amount: bet.payout,
        description: `Sports win: ${market.name}`,
        actorId: input.actorId,
      });
      paid += Number(bet.payout);
    }

    return {
      winners: winners.rows.length,
      losers: losers.affectedRows ?? losers.rowCount ?? 0,
      paid: paid.toFixed(2),
    };
  });
}

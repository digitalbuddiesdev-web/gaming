"use server";

import type { Account } from "./auth.ts";
import { one, sql, tx, type Transaction } from "./db.ts";
import { consume } from "./rate-limit.ts";
import { moveIn } from "./ledger.ts";
import {
  calculateCrashPoint,
  calculateMinesPositions,
  calculateMinesMultiplier,
  calculatePlinkoDrop,
  calculateTowerFloors,
  calculateTowerMultiplier,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  type PlinkoRisk,
  type PlinkoRows,
  type TowerDifficulty,
  TOWER_CONFIGS,
} from "./provably-fair.ts";

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

async function getViewer() {
  const { currentAccount } = await import("./auth.ts");
  const viewer = await currentAccount();
  if (!viewer) throw new Error("Unauthorized: Please sign in");
  if (viewer.bet_status !== "open") throw new Error("Betting is locked on this account");
  return viewer;
}

/** Lock a round row for the whole settlement so two callers cannot both pay out. */
async function lockRound(
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
 * Settle crash rounds abandoned mid-flight so their debited stake reaches a
 * terminal state. No ledger movement: the stake was debited at round start.
 * Idempotent — only `active` rounds older than the cutoff are touched.
 */
export async function sweepStaleCrashRounds() {
  const { currentAccount } = await import("./auth.ts");
  const viewer = await currentAccount();
  if (!viewer) return 0;
  const res = await sql<{ id: string }>(
    `update simulated_game_rounds
        set status = 'lost',
            multiplier = coalesce((game_data->>'crashPoint')::numeric, 1),
            payout = 0,
            settled_at = now()
      where account_id = $1
        and game_type = 'crash'
        and status = 'active'
        and created_at < now() - interval '30 minutes'
      returning id`,
    [viewer.id],
  );
  return res.length;
}

/**
 * -------------------------------------------------------------
 * CRASH GAME ACTIONS
 * -------------------------------------------------------------
 */

export async function startCrashRound(params: {
  stake: number;
  clientSeed?: string;
}) {
  if (!(await consume("bet", 30, 0.5))) throw new Error("Too many requests. Please slow down.");
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error("Invalid stake amount");
  }

  // Get next nonce for player
  const lastRound = await one<{ count: string }>(
    `select count(*)::text as count from simulated_game_rounds where account_id = $1 and game_type = 'crash'`,
    [viewer.id],
  );
  const nonce = (Number(lastRound?.count) || 0) + 1;

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = params.clientSeed?.trim() || generateClientSeed();
  const crashPoint = calculateCrashPoint(serverSeed, clientSeed, nonce);

  // Atomic debit of stake through ledger transaction
  const round = await tx(async (client) => {
    // 1. Debit stake
    await moveIn(client, {
      accountId: viewer.id,
      operatorId: viewer.operator_id,
      kind: "debit",
      amount: stake,
      description: `Crash bet - Hash ${serverSeedHash.slice(0, 8)}...`,
      actorId: viewer.id,
    });

    // 2. Insert game round (crashPoint stored securely on server)
    const res = await client.query<SimulatedRoundRecord>(
      `insert into simulated_game_rounds
         (operator_id, account_id, game_type, server_seed, server_seed_hash,
          client_seed, nonce, stake, status, game_data)
       values ($1, $2, 'crash', $3, $4, $5, $6, $7::numeric, 'active', $8)
       returning *`,
      [
        viewer.operator_id,
        viewer.id,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        stake.toFixed(2),
        JSON.stringify({ crashPoint }),
      ],
    );
    return res.rows[0];
  });

  // Return public commitment to client without disclosing crashPoint or unhashed serverSeed
  return {
    roundId: round.id,
    serverSeedHash,
    clientSeed,
    nonce,
    stake,
  };
}

export async function cashoutCrashRound(params: {
  roundId: string;
  targetMultiplier: number;
}) {
  const viewer = await getViewer();
  return settleCrashCashout(viewer, params);
}

/**
 * Atomic crash cashout. The round is locked, checked, credited and marked
 * settled inside one transaction, so a second caller sees a settled round
 * and cannot credit again. Exported for the money-path regression check.
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

    // Validate if targetMultiplier cashed out before actual crashPoint
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

    // Cashed out too late - no credit, just settle as lost.
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

export async function finalizeCrashLoss(roundId: string) {
  const viewer = await getViewer();
  return tx(async (client) => {
    const round = await lockRound(client, roundId, viewer.id);
    if (round.status !== "active") {
      return {
        actualCrashPoint: round.game_data?.crashPoint,
        serverSeed: round.server_seed,
      };
    }

    const actualCrashPoint = Number(round.game_data?.crashPoint || 1.0);
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
      actualCrashPoint,
      serverSeed: round.server_seed,
    };
  });
}

/**
 * -------------------------------------------------------------
 * MINES GAME ACTIONS
 * -------------------------------------------------------------
 */

export async function startMinesRound(params: {
  stake: number;
  mineCount: number;
  clientSeed?: string;
}) {
  if (!(await consume("bet", 30, 0.5))) throw new Error("Too many requests. Please slow down.");
  const viewer = await getViewer();
  const stake = Number(params.stake);
  const mineCount = Math.min(Math.max(Number(params.mineCount) || 3, 1), 24);

  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error("Invalid stake amount");
  }

  const lastRound = await one<{ count: string }>(
    `select count(*)::text as count from simulated_game_rounds where account_id = $1 and game_type = 'mines'`,
    [viewer.id],
  );
  const nonce = (Number(lastRound?.count) || 0) + 1;

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = params.clientSeed?.trim() || generateClientSeed();
  const minePositions = calculateMinesPositions(serverSeed, clientSeed, nonce, mineCount);

  const round = await tx(async (client) => {
    // 1. Debit stake
    await moveIn(client, {
      accountId: viewer.id,
      operatorId: viewer.operator_id,
      kind: "debit",
      amount: stake,
      description: `Mines (${mineCount} mines) - Hash ${serverSeedHash.slice(0, 8)}...`,
      actorId: viewer.id,
    });

    // 2. Insert round with hidden minePositions
    const res = await client.query<SimulatedRoundRecord>(
      `insert into simulated_game_rounds
         (operator_id, account_id, game_type, server_seed, server_seed_hash,
          client_seed, nonce, stake, status, game_data)
       values ($1, $2, 'mines', $3, $4, $5, $6, $7::numeric, 'active', $8)
       returning *`,
      [
        viewer.operator_id,
        viewer.id,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        stake.toFixed(2),
        JSON.stringify({
          mineCount,
          minePositions,
          revealed: [],
        }),
      ],
    );
    return res.rows[0];
  });

  return {
    roundId: round.id,
    serverSeedHash,
    clientSeed,
    nonce,
    mineCount,
    stake,
  };
}

export async function revealMinesTile(params: {
  roundId: string;
  tileIndex: number;
}) {
  const viewer = await getViewer();
  const tileIndex = Number(params.tileIndex);
  if (tileIndex < 0 || tileIndex > 24) throw new Error("Invalid tile index");

  return tx(async (client) => {
    const round = await lockRound(client, params.roundId, viewer.id);
    if (round.status !== "active") throw new Error("Round already settled");

    const gameData = round.game_data;
    const minePositions: number[] = gameData.minePositions || [];
    const revealed: number[] = gameData.revealed || [];
    const mineCount: number = gameData.mineCount || 3;
    const stake = Number(round.stake);

    if (revealed.includes(tileIndex)) {
      throw new Error("Tile already revealed");
    }

    // Check if player hit a mine!
    if (minePositions.includes(tileIndex)) {
      await client.query(
        `update simulated_game_rounds
            set status = 'lost',
                payout = 0,
                multiplier = 0,
                settled_at = now()
          where id = $1 and status = 'active'`,
        [round.id],
      );

      return {
        hitMine: true,
        tileIndex,
        minePositions,
        serverSeed: round.server_seed,
      };
    }

    // Gem hit!
    const newRevealed = [...revealed, tileIndex];
    const newMultiplier = calculateMinesMultiplier(mineCount, newRevealed.length);
    const nextMultiplier = calculateMinesMultiplier(mineCount, newRevealed.length + 1);
    const profit = Number((stake * (newMultiplier - 1)).toFixed(2));
    const maxSafeTiles = 25 - mineCount;

    // If all non-mine tiles revealed, auto cash out!
    if (newRevealed.length >= maxSafeTiles) {
      const finalPayout = Number((stake * newMultiplier).toFixed(2));
      await moveIn(client, {
        accountId: viewer.id,
        operatorId: viewer.operator_id,
        kind: "credit",
        amount: finalPayout,
        description: `Mines ALL CLEAR win @ ${newMultiplier}x`,
        actorId: viewer.id,
      });

      await client.query(
        `update simulated_game_rounds
            set status = 'won',
                multiplier = $1::numeric,
                payout = $2::numeric,
                game_data = $3,
                settled_at = now()
          where id = $4 and status = 'active'`,
        [
          newMultiplier.toFixed(2),
          finalPayout.toFixed(2),
          JSON.stringify({ ...gameData, revealed: newRevealed }),
          round.id,
        ],
      );

      return {
        hitMine: false,
        autoWon: true,
        revealed: newRevealed,
        multiplier: newMultiplier,
        payout: finalPayout,
        minePositions,
        serverSeed: round.server_seed,
      };
    }

    // Intermediate reveal - no payout, just record progress.
    await client.query(
      `update simulated_game_rounds
          set game_data = $1
        where id = $2 and status = 'active'`,
      [JSON.stringify({ ...gameData, revealed: newRevealed }), round.id],
    );

    return {
      hitMine: false,
      autoWon: false,
      revealed: newRevealed,
      multiplier: newMultiplier,
      nextMultiplier,
      profit,
    };
  });
}

export async function cashoutMinesRound(roundId: string) {
  const viewer = await getViewer();
  return tx(async (client) => {
    const round = await lockRound(client, roundId, viewer.id);
    if (round.status !== "active") throw new Error("Round already settled");

    const gameData = round.game_data;
    const revealed: number[] = gameData.revealed || [];
    const mineCount: number = gameData.mineCount || 3;
    const minePositions: number[] = gameData.minePositions || [];
    const stake = Number(round.stake);

    if (revealed.length === 0) {
      throw new Error("Must reveal at least one tile before cashing out");
    }

    const multiplier = calculateMinesMultiplier(mineCount, revealed.length);
    const payout = Number((stake * multiplier).toFixed(2));

    await moveIn(client, {
      accountId: viewer.id,
      operatorId: viewer.operator_id,
      kind: "credit",
      amount: payout,
      description: `Mines cashout win @ ${multiplier}x`,
      actorId: viewer.id,
    });

    await client.query(
      `update simulated_game_rounds
          set status = 'won',
              multiplier = $1::numeric,
              payout = $2::numeric,
              settled_at = now()
        where id = $3 and status = 'active'`,
      [multiplier.toFixed(2), payout.toFixed(2), round.id],
    );

    return {
      won: true,
      multiplier,
      payout,
      minePositions,
      serverSeed: round.server_seed,
    };
  });
}

/**
 * -------------------------------------------------------------
 * PLINKO PHYSICS ACTIONS
 * -------------------------------------------------------------
 */

export async function playPlinkoDrop(params: {
  stake: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  clientSeed?: string;
}) {
  if (!(await consume("bet", 30, 0.5))) throw new Error("Too many requests. Please slow down.");
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error("Invalid stake amount");
  }

  const rows = params.rows || 10;
  const risk = params.risk || "medium";

  // Get next nonce for player
  const lastRound = await one<{ count: string }>(
    `select count(*)::text as count from simulated_game_rounds where account_id = $1 and game_type = 'plinko'`,
    [viewer.id],
  );
  const nonce = (Number(lastRound?.count) || 0) + 1;

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = params.clientSeed?.trim() || generateClientSeed();

  const { path, bucketIndex, multiplier } = calculatePlinkoDrop(
    serverSeed,
    clientSeed,
    nonce,
    rows,
    risk,
  );

  const payout = Number((stake * multiplier).toFixed(2));
  const status = multiplier >= 1.0 ? "won" : "lost";

  // Atomic ledger debit & credit
  const round = await tx(async (client) => {
    // 1. Debit stake
    await moveIn(client, {
      accountId: viewer.id,
      operatorId: viewer.operator_id,
      kind: "debit",
      amount: stake,
      description: `Plinko Drop (${rows}R/${risk}) - Hash ${serverSeedHash.slice(0, 8)}...`,
      actorId: viewer.id,
    });

    // 2. Credit payout if > 0
    if (payout > 0) {
      await moveIn(client, {
        accountId: viewer.id,
        operatorId: viewer.operator_id,
        kind: "credit",
        amount: payout,
        description: `Plinko Drop win @ ${multiplier}x`,
        actorId: viewer.id,
      });
    }

    // 3. Record round
    const res = await client.query<SimulatedRoundRecord>(
      `insert into simulated_game_rounds
         (operator_id, account_id, game_type, server_seed, server_seed_hash,
          client_seed, nonce, stake, multiplier, payout, status, game_data, settled_at)
       values ($1, $2, 'plinko', $3, $4, $5, $6, $7::numeric, $8::numeric, $9::numeric, $10, $11, now())
       returning *`,
      [
        viewer.operator_id,
        viewer.id,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        stake.toFixed(2),
        multiplier.toFixed(2),
        payout.toFixed(2),
        status,
        JSON.stringify({ rows, risk, path, bucketIndex }),
      ],
    );
    return res.rows[0];
  });

  return {
    roundId: round.id,
    path,
    bucketIndex,
    multiplier,
    payout,
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
  };
}

/**
 * -------------------------------------------------------------
 * TOWER / OLYMPUS ASCENT ACTIONS
 * -------------------------------------------------------------
 */

export async function startTowerRound(params: {
  stake: number;
  difficulty: TowerDifficulty;
  clientSeed?: string;
}) {
  if (!(await consume("bet", 30, 0.5))) throw new Error("Too many requests. Please slow down.");
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error("Invalid stake amount");
  }

  const difficulty = params.difficulty || "medium";

  // Check for any currently active tower round; forfeit abandoned round to allow starting fresh
  const existingActive = await one<SimulatedRoundRecord>(
    `select id from simulated_game_rounds
      where account_id = $1 and game_type = 'tower' and status = 'active'
      limit 1`,
    [viewer.id],
  );
  if (existingActive) {
    await sql(
      `update simulated_game_rounds
          set status = 'lost',
              multiplier = 0,
              payout = 0,
              settled_at = now()
        where id = $1`,
      [existingActive.id],
    );
  }

  // Next nonce
  const lastRound = await one<{ count: string }>(
    `select count(*)::text as count from simulated_game_rounds where account_id = $1 and game_type = 'tower'`,
    [viewer.id],
  );
  const nonce = (Number(lastRound?.count) || 0) + 1;

  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed = params.clientSeed?.trim() || generateClientSeed();

  // Pre-generate all floors deterministically
  const allFloorTraps = calculateTowerFloors(serverSeed, clientSeed, nonce, difficulty);

  const round = await tx(async (client) => {
    await moveIn(client, {
      accountId: viewer.id,
      operatorId: viewer.operator_id,
      kind: "debit",
      amount: stake,
      description: `Tower ascent (${difficulty}) - Hash ${serverSeedHash.slice(0, 8)}...`,
      actorId: viewer.id,
    });

    const res = await client.query<SimulatedRoundRecord>(
      `insert into simulated_game_rounds
         (operator_id, account_id, game_type, server_seed, server_seed_hash,
          client_seed, nonce, stake, status, game_data)
       values ($1, $2, 'tower', $3, $4, $5, $6, $7::numeric, 'active', $8)
       returning *`,
      [
        viewer.operator_id,
        viewer.id,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        stake.toFixed(2),
        JSON.stringify({
          difficulty,
          currentFloor: 0,
          allFloorTraps,
          steps: [],
        }),
      ],
    );
    return res.rows[0];
  });

  return {
    roundId: round.id,
    serverSeedHash,
    clientSeed,
    nonce,
    difficulty,
    currentFloor: 0,
    nextMultiplier: calculateTowerMultiplier(difficulty, 1),
    config: TOWER_CONFIGS[difficulty],
  };
}

export async function stepTowerTile(params: {
  roundId: string;
  tileIndex: number;
}) {
  const viewer = await getViewer();
  return tx(async (client) => {
    const round = await lockRound(client, params.roundId, viewer.id);
    if (round.status !== "active") throw new Error("Tower round has already ended");

    const gameData = round.game_data;
    const difficulty: TowerDifficulty = gameData.difficulty || "medium";
    const currentFloor: number = gameData.currentFloor ?? 0;
    const allFloorTraps: number[][] = gameData.allFloorTraps || [];
    const steps: { floor: number; tile: number; safe: boolean }[] = gameData.steps || [];
    const stake = Number(round.stake);
    const config = TOWER_CONFIGS[difficulty];

    if (currentFloor >= config.floors) {
      throw new Error("Top floor already reached");
    }

    const trapsOnThisFloor = allFloorTraps[currentFloor] || [];
    const isTrap = trapsOnThisFloor.includes(params.tileIndex);

    if (isTrap) {
      steps.push({ floor: currentFloor, tile: params.tileIndex, safe: false });
      await client.query(
        `update simulated_game_rounds
            set status = 'lost',
                multiplier = 0,
                payout = 0,
                game_data = $1,
                settled_at = now()
          where id = $2 and status = 'active'`,
        [JSON.stringify({ ...gameData, currentFloor, steps }), round.id],
      );

      return {
        hitTrap: true,
        autoWon: false,
        floorHit: currentFloor,
        trapsOnThisFloor,
        allFloorTraps,
        serverSeed: round.server_seed,
      };
    }

    // Safe step!
    const newFloor = currentFloor + 1;
    steps.push({ floor: currentFloor, tile: params.tileIndex, safe: true });
    const multiplier = calculateTowerMultiplier(difficulty, newFloor);

    if (newFloor === config.floors) {
      const payout = Number((stake * multiplier).toFixed(2));
      await moveIn(client, {
        accountId: viewer.id,
        operatorId: viewer.operator_id,
        kind: "credit",
        amount: payout,
        description: `Tower Summit Win (${difficulty}) @ ${multiplier}x`,
        actorId: viewer.id,
      });

      await client.query(
        `update simulated_game_rounds
            set status = 'won',
                multiplier = $1::numeric,
                payout = $2::numeric,
                game_data = $3,
                settled_at = now()
          where id = $4 and status = 'active'`,
        [multiplier.toFixed(2), payout.toFixed(2), JSON.stringify({ ...gameData, currentFloor: newFloor, steps }), round.id],
      );

      return {
        hitTrap: false,
        autoWon: true,
        clearedFloor: newFloor,
        multiplier,
        payout,
        allFloorTraps,
        serverSeed: round.server_seed,
      };
    }

    // Intermediate floor cleared - no payout, just record progress.
    const nextMultiplier = calculateTowerMultiplier(difficulty, newFloor + 1);
    await client.query(
      `update simulated_game_rounds
          set game_data = $1
        where id = $2 and status = 'active'`,
      [JSON.stringify({ ...gameData, currentFloor: newFloor, steps }), round.id],
    );

    return {
      hitTrap: false,
      autoWon: false,
      clearedFloor: newFloor,
      multiplier,
      nextMultiplier,
      currentProfit: Number((stake * multiplier - stake).toFixed(2)),
    };
  });
}

export async function cashoutTowerRound(roundId: string) {
  const viewer = await getViewer();
  return tx(async (client) => {
    const round = await lockRound(client, roundId, viewer.id);
    if (round.status !== "active") throw new Error("Round already settled");

    const gameData = round.game_data;
    const currentFloor: number = gameData.currentFloor ?? 0;
    const difficulty: TowerDifficulty = gameData.difficulty || "medium";
    const allFloorTraps: number[][] = gameData.allFloorTraps || [];
    const stake = Number(round.stake);

    if (currentFloor <= 0) {
      throw new Error("Must clear at least one floor before cashing out");
    }

    const multiplier = calculateTowerMultiplier(difficulty, currentFloor);
    const payout = Number((stake * multiplier).toFixed(2));

    await moveIn(client, {
      accountId: viewer.id,
      operatorId: viewer.operator_id,
      kind: "credit",
      amount: payout,
      description: `Tower cashout @ Floor ${currentFloor} (${multiplier}x)`,
      actorId: viewer.id,
    });

    await client.query(
      `update simulated_game_rounds
          set status = 'won',
              multiplier = $1::numeric,
              payout = $2::numeric,
              settled_at = now()
        where id = $3 and status = 'active'`,
      [multiplier.toFixed(2), payout.toFixed(2), round.id],
    );

    return {
      won: true,
      multiplier,
      payout,
      currentFloor,
      allFloorTraps,
      serverSeed: round.server_seed,
    };
  });
}

/**
 * Fetch player's recent simulated game rounds for history & auditing
 */
export async function getRecentSimulatedRounds(gameType?: string) {
  const { currentAccount } = await import("./auth.ts");
  const viewer = await currentAccount();
  if (!viewer) return [];

  let query = `select id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, multiplier, payout, status, created_at
                 from simulated_game_rounds
                where account_id = $1`;
  const params: any[] = [viewer.id];

  if (gameType) {
    query += ` and game_type = $2`;
    params.push(gameType);
  }

  query += ` order by created_at desc limit 15`;

  return sql<SimulatedRoundRecord>(query, params);
}

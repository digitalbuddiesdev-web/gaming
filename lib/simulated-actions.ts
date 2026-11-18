"use server";

import { one, sql, tx, type Transaction } from "./db.ts";
import { consume } from "./rate-limit.ts";
import { moveIn } from "./ledger.ts";
import {
  lockRound,
  settleCrashCashout,
  type SimulatedRoundRecord,
} from "./round-settlement.ts";
import {
  calculateCrashPoint,
  calculateMinesPositions,
  calculateMinesMultiplier,
  calculatePlinkoDrop,
  calculateTowerFloors,
  calculateTowerMultiplier,
  calculateSlotSpin,
  shuffleDeck,
  evaluateHand,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  type PlinkoRisk,
  type PlinkoRows,
  type TowerDifficulty,
  type PlayingCard,
  type SlotSpinResult,
  type RouletteBet,
  type RouletteSpinResult,
  type BaccaratResult,
  type BaccaratWinner,
  type DragonTigerResult,
  type DragonTigerWinner,
  calculateRouletteSpin,
  evaluateRouletteBets,
  validateRouletteBets,
  calculateBaccaratRound,
  calculateDragonTigerRound,
  TOWER_CONFIGS,
} from "./provably-fair.ts";

async function getViewer() {
  const { currentAccount } = await import("./auth.ts");
  const viewer = await currentAccount();
  if (!viewer) throw new Error("Unauthorized: Please sign in");
  if (viewer.bet_status !== "open") throw new Error("Betting is locked on this account");
  return viewer;
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

// ====================================================================
// Neon Reels (Slots) Server Actions
// ====================================================================

let schemaUpdated = false;
async function ensureGameConstraints(db: Transaction) {
  if (schemaUpdated) return;
  try {
    await db.query(`alter table simulated_game_rounds drop constraint if exists simulated_game_rounds_game_type_check`);
    await db.query(`alter table simulated_game_rounds add constraint simulated_game_rounds_game_type_check check (game_type in ('crash', 'mines', 'dice', 'plinko', 'tower', 'slot', 'cards', 'roulette', 'baccarat', 'dragon_tiger'))`);
    await db.query(`alter table simulated_game_rounds drop constraint if exists simulated_game_rounds_status_check`);
    await db.query(`alter table simulated_game_rounds add constraint simulated_game_rounds_status_check check (status in ('active', 'won', 'lost', 'cashed_out', 'push'))`);
    schemaUpdated = true;
  } catch {
    // schema might already have the constraints
  }
}

export async function startSlotSpin(params: {
  stake: number;
  clientSeed?: string;
}): Promise<{
  roundId: string;
  slotResult: SlotSpinResult;
  payout: number;
  newBalance: number;
}> {
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!stake || stake <= 0 || isNaN(stake)) {
    throw new Error("Invalid stake amount");
  }

  const allowed = await consume("slots:spin", 10, 2);
  if (!allowed) throw new Error("Rate limit exceeded: Please wait a moment before spinning again");

  return tx(async (db) => {
    await ensureGameConstraints(db);
    const acc = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1 for update`,
        [viewer.id],
      )
    ).rows[0];

    const currentBalance = Number(acc?.balance ?? 0);
    if (currentBalance < stake) {
      throw new Error(`Insufficient balance: Required ${stake.toFixed(2)}, available ${currentBalance.toFixed(2)}`);
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = params.clientSeed?.trim() || generateClientSeed();
    const nonce = Date.now() % 1000000;

    const slotResult = calculateSlotSpin(serverSeed, clientSeed, nonce);
    const payout = Number((stake * slotResult.totalMultiplier).toFixed(2));
    const isWin = slotResult.totalMultiplier > 0;
    const status = isWin ? "won" : "lost";

    // 1. Debit stake
    await moveIn(db, {
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      actorId: viewer.id,
      kind: "debit",
      amount: stake,
      description: `Apex Slots Spin (${stake.toFixed(2)} Pts)`,
    });

    // 2. Record round in simulated_game_rounds
    const round = (
      await db.query<{ id: string }>(
        `insert into simulated_game_rounds
          (operator_id, account_id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, multiplier, payout, status, game_data, settled_at)
         values ($1, $2, 'slot', $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         returning id`,
        [
          viewer.operator_id,
          viewer.id,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          stake.toFixed(2),
          slotResult.totalMultiplier.toFixed(2),
          payout.toFixed(2),
          status,
          JSON.stringify(slotResult),
        ],
      )
    ).rows[0];

    // 3. Credit payout if won
    if (payout > 0) {
      await moveIn(db, {
        operatorId: viewer.operator_id,
        accountId: viewer.id,
        actorId: viewer.id,
        kind: "credit",
        amount: payout,
        description: `Apex Slots Payout (${slotResult.totalMultiplier}x · +${payout.toFixed(2)} Pts)`,
      });
    }

    const updated = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1`,
        [viewer.id],
      )
    ).rows[0];

    return {
      roundId: round.id,
      slotResult,
      payout,
      newBalance: Number(updated.balance),
    };
  });
}

// ====================================================================
// Club Cards (Blackjack 21) Server Actions
// ====================================================================

export type BlackjackGameData = {
  deck: PlayingCard[];
  shoeIndex: number;
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  originalStake: number;
  currentStake: number;
  playerScore: number;
  dealerScore: number;
};

export async function startBlackjackRound(params: {
  stake: number;
  clientSeed?: string;
}): Promise<{
  roundId: string;
  playerCards: PlayingCard[];
  dealerUpCard: PlayingCard;
  playerScore: number;
  isBlackjack: boolean;
  status: "active" | "won" | "push" | "lost";
  payout: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  newBalance: number;
}> {
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!stake || stake <= 0 || isNaN(stake)) {
    throw new Error("Invalid stake amount");
  }

  const allowed = await consume("cards:deal", 10, 2);
  if (!allowed) throw new Error("Rate limit exceeded: Please wait a moment before dealing again");

  return tx(async (db) => {
    await ensureGameConstraints(db);
    const acc = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1 for update`,
        [viewer.id],
      )
    ).rows[0];

    const currentBalance = Number(acc?.balance ?? 0);
    if (currentBalance < stake) {
      throw new Error(`Insufficient balance: Required ${stake.toFixed(2)}, available ${currentBalance.toFixed(2)}`);
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = params.clientSeed?.trim() || generateClientSeed();
    const nonce = Date.now() % 1000000;

    // Shuffle 52-card deck
    const deck = shuffleDeck(serverSeed, clientSeed, nonce);

    // Initial deal: Player (0, 2), Dealer (1, 3)
    const playerCards = [deck[0], deck[2]];
    const dealerCards = [deck[1], deck[3]];
    let shoeIndex = 4;

    const playerHand = evaluateHand(playerCards);
    const dealerHand = evaluateHand(dealerCards);

    // Debit stake
    await moveIn(db, {
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      actorId: viewer.id,
      kind: "debit",
      amount: stake,
      description: `Blackjack Bet (${stake.toFixed(2)} Pts)`,
    });

    let status: "active" | "won" | "push" | "lost" = "active";
    let payout = 0;
    let multiplier = 0;

    // Check immediate Blackjack
    if (playerHand.isBlackjack) {
      if (dealerHand.isBlackjack) {
        // Push
        status = "push";
        multiplier = 1.0;
        payout = stake;
      } else {
        // Natural 21 pays 3:2 (2.5x total payout)
        status = "won";
        multiplier = 2.5;
        payout = Number((stake * 2.5).toFixed(2));
      }
    }

    const gameData: BlackjackGameData = {
      deck,
      shoeIndex,
      playerCards,
      dealerCards,
      originalStake: stake,
      currentStake: stake,
      playerScore: playerHand.score,
      dealerScore: dealerHand.score,
    };

    const round = (
      await db.query<{ id: string }>(
        `insert into simulated_game_rounds
          (operator_id, account_id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, multiplier, payout, status, game_data, settled_at)
         values ($1, $2, 'cards', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning id`,
        [
          viewer.operator_id,
          viewer.id,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          stake.toFixed(2),
          multiplier > 0 ? multiplier.toFixed(2) : null,
          payout > 0 ? payout.toFixed(2) : "0",
          status,
          JSON.stringify(gameData),
          status !== "active" ? new Date().toISOString() : null,
        ],
      )
    ).rows[0];

    if (payout > 0) {
      await moveIn(db, {
        operatorId: viewer.operator_id,
        accountId: viewer.id,
        actorId: viewer.id,
        kind: "credit",
        amount: payout,
        description: `Blackjack ${status === "push" ? "Push Refund" : "Natural Blackjack 3:2"} (+${payout.toFixed(2)} Pts)`,
      });
    }

    const updated = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1`,
        [viewer.id],
      )
    ).rows[0];

    return {
      roundId: round.id,
      playerCards,
      dealerUpCard: dealerCards[0],
      playerScore: playerHand.score,
      isBlackjack: playerHand.isBlackjack,
      status,
      payout,
      serverSeedHash,
      clientSeed,
      nonce,
      newBalance: Number(updated.balance),
    };
  });
}

export async function playerBlackjackAction(params: {
  roundId: string;
  action: "hit" | "stand" | "double";
}): Promise<{
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerScore: number;
  dealerScore: number;
  status: "active" | "won" | "push" | "lost";
  payout: number;
  multiplier: number;
  serverSeed?: string;
  newBalance: number;
}> {
  const viewer = await getViewer();

  return tx(async (db) => {
    const round = await lockRound(db, params.roundId, viewer.id);
    if (round.status !== "active") {
      throw new Error("This round is already settled");
    }

    const gameData: BlackjackGameData = round.game_data;
    let { deck, shoeIndex, playerCards, dealerCards, currentStake } = gameData;

    if (params.action === "double") {
      if (playerCards.length !== 2) {
        throw new Error("Double down is only permitted on the first 2 cards");
      }
      const acc = (
        await db.query<{ balance: string }>(
          `select balance from accounts where id = $1 for update`,
          [viewer.id],
        )
      ).rows[0];
      const bal = Number(acc?.balance ?? 0);
      if (bal < currentStake) {
        throw new Error("Insufficient balance to double down");
      }

      // Debit additional stake
      await moveIn(db, {
        operatorId: viewer.operator_id,
        accountId: viewer.id,
        actorId: viewer.id,
        kind: "debit",
        amount: currentStake,
        description: `Blackjack Double Down (+${currentStake.toFixed(2)} Pts)`,
      });

      currentStake *= 2;
      gameData.currentStake = currentStake;

      // Draw exactly one card
      playerCards.push(deck[shoeIndex++]);
    } else if (params.action === "hit") {
      playerCards.push(deck[shoeIndex++]);
    }

    let playerHand = evaluateHand(playerCards);
    let dealerHand = evaluateHand(dealerCards);

    let status: "active" | "won" | "push" | "lost" = "active";
    let multiplier = 0;
    let payout = 0;

    // Check player bust
    if (playerHand.isBusted) {
      status = "lost";
      multiplier = 0;
      payout = 0;
    } else if (params.action === "stand" || params.action === "double") {
      // Dealer draws until 17+
      while (dealerHand.score < 17) {
        dealerCards.push(deck[shoeIndex++]);
        dealerHand = evaluateHand(dealerCards);
      }

      if (dealerHand.isBusted) {
        status = "won";
        multiplier = 2.0;
        payout = currentStake * 2;
      } else if (playerHand.score > dealerHand.score) {
        status = "won";
        multiplier = 2.0;
        payout = currentStake * 2;
      } else if (playerHand.score === dealerHand.score) {
        status = "push";
        multiplier = 1.0;
        payout = currentStake;
      } else {
        status = "lost";
        multiplier = 0;
        payout = 0;
      }
    }

    gameData.playerCards = playerCards;
    gameData.dealerCards = dealerCards;
    gameData.shoeIndex = shoeIndex;
    gameData.playerScore = playerHand.score;
    gameData.dealerScore = dealerHand.score;

    if (status !== "active") {
      await db.query(
        `update simulated_game_rounds
            set status = $1,
                multiplier = $2::numeric,
                payout = $3::numeric,
                game_data = $4,
                settled_at = now()
          where id = $5`,
        [
          status,
          multiplier.toFixed(2),
          payout.toFixed(2),
          JSON.stringify(gameData),
          round.id,
        ],
      );

      if (payout > 0) {
        await moveIn(db, {
          operatorId: viewer.operator_id,
          accountId: viewer.id,
          actorId: viewer.id,
          kind: "credit",
          amount: payout,
          description: `Blackjack ${status === "push" ? "Push Refund" : "Win"} (+${payout.toFixed(2)} Pts)`,
        });
      }
    } else {
      await db.query(
        `update simulated_game_rounds
            set game_data = $1
          where id = $2`,
        [JSON.stringify(gameData), round.id],
      );
    }

    const updated = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1`,
        [viewer.id],
      )
    ).rows[0];

    return {
      playerCards,
      dealerCards: status !== "active" ? dealerCards : [dealerCards[0]],
      playerScore: playerHand.score,
      dealerScore: status !== "active" ? dealerHand.score : evaluateHand([dealerCards[0]]).score,
      status,
      payout,
      multiplier,
      serverSeed: status !== "active" ? round.server_seed : undefined,
      newBalance: Number(updated.balance),
    };
  });
}

// ====================================================================
// European Roulette Server Actions
// ====================================================================

export async function startRouletteSpin(params: {
  bets: RouletteBet[];
  clientSeed?: string;
}): Promise<{
  roundId: string;
  spinResult: RouletteSpinResult;
  evaluation: {
    totalStake: number;
    totalPayout: number;
    netProfit: number;
    winningBets: { bet: RouletteBet; payout: number }[];
  };
  serverSeed: string;
  newBalance: number;
}> {
  const viewer = await getViewer();
  const bets = params.bets ?? [];
  if (!bets.length) throw new Error("No bets placed on the table");
  validateRouletteBets(bets);

  const totalStake = Number(
    bets.reduce((sum, b) => sum + (Number(b.stake) || 0), 0).toFixed(2),
  );
  if (totalStake <= 0 || isNaN(totalStake)) {
    throw new Error("Invalid stake amount");
  }

  const allowed = await consume("roulette:spin", 10, 2);
  if (!allowed) throw new Error("Rate limit exceeded: Please wait before spinning again");

  return tx(async (db) => {
    await ensureGameConstraints(db);
    const acc = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1 for update`,
        [viewer.id],
      )
    ).rows[0];

    const currentBalance = Number(acc?.balance ?? 0);
    if (currentBalance < totalStake) {
      throw new Error(
        `Insufficient balance: Required ${totalStake.toFixed(2)}, available ${currentBalance.toFixed(2)}`,
      );
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = params.clientSeed?.trim() || generateClientSeed();
    const nonce = Date.now() % 1000000;

    const spinResult = calculateRouletteSpin(serverSeed, clientSeed, nonce);
    const evaluation = evaluateRouletteBets(spinResult.winningNumber, bets);

    const isWin = evaluation.totalPayout > 0;
    const status = isWin ? "won" : "lost";
    const multiplier = totalStake > 0 ? evaluation.totalPayout / totalStake : 0;

    // 1. Debit total stake
    await moveIn(db, {
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      actorId: viewer.id,
      kind: "debit",
      amount: totalStake,
      description: `Roulette Bet (${totalStake.toFixed(2)} Pts on ${bets.length} spots)`,
    });

    // 2. Insert round
    const round = (
      await db.query<{ id: string }>(
        `insert into simulated_game_rounds
          (operator_id, account_id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, multiplier, payout, status, game_data, settled_at)
         values ($1, $2, 'roulette', $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         returning id`,
        [
          viewer.operator_id,
          viewer.id,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          totalStake.toFixed(2),
          multiplier.toFixed(2),
          evaluation.totalPayout.toFixed(2),
          status,
          JSON.stringify({ spinResult, bets, evaluation }),
        ],
      )
    ).rows[0];

    // 3. Credit payout if won
    if (evaluation.totalPayout > 0) {
      await moveIn(db, {
        operatorId: viewer.operator_id,
        accountId: viewer.id,
        actorId: viewer.id,
        kind: "credit",
        amount: evaluation.totalPayout,
        description: `Roulette Payout (Winning #${spinResult.winningNumber} ${spinResult.pocket.color.toUpperCase()} · +${evaluation.totalPayout.toFixed(2)} Pts)`,
      });
    }

    const updated = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1`,
        [viewer.id],
      )
    ).rows[0];

    return {
      roundId: round.id,
      spinResult,
      evaluation,
      serverSeed,
      newBalance: Number(updated.balance),
    };
  });
}

// ====================================================================
// Baccarat (Punto Banco) Server Actions
// ====================================================================

export async function playBaccaratRound(params: {
  betType: "player" | "banker" | "tie";
  stake: number;
  clientSeed?: string;
}): Promise<{
  roundId: string;
  result: BaccaratResult;
  payout: number;
  multiplier: number;
  status: "won" | "push" | "lost";
  serverSeed: string;
  newBalance: number;
}> {
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!stake || stake <= 0 || isNaN(stake)) {
    throw new Error("Invalid stake amount");
  }

  const allowed = await consume("baccarat:play", 10, 2);
  if (!allowed) throw new Error("Rate limit exceeded: Please wait before placing next bet");

  return tx(async (db) => {
    await ensureGameConstraints(db);
    const acc = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1 for update`,
        [viewer.id],
      )
    ).rows[0];

    const currentBalance = Number(acc?.balance ?? 0);
    if (currentBalance < stake) {
      throw new Error(
        `Insufficient balance: Required ${stake.toFixed(2)}, available ${currentBalance.toFixed(2)}`,
      );
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = params.clientSeed?.trim() || generateClientSeed();
    const nonce = Date.now() % 1000000;

    const result = calculateBaccaratRound(serverSeed, clientSeed, nonce);

    let status: "won" | "push" | "lost" = "lost";
    let payout = 0;
    let multiplier = 0;

    if (result.winner === "tie") {
      if (params.betType === "tie") {
        status = "won";
        multiplier = 9; // 8:1 payout + stake returned
        payout = Number((stake * multiplier).toFixed(2));
      } else {
        // Player or Banker bet pushes on Tie
        status = "push";
        multiplier = 1;
        payout = stake;
      }
    } else if (result.winner === params.betType) {
      status = "won";
      if (params.betType === "banker") {
        multiplier = 1.95; // 0.95:1 payout (5% commission) + stake returned
      } else {
        multiplier = 2.0; // 1:1 payout + stake returned
      }
      payout = Number((stake * multiplier).toFixed(2));
    }

    // Debit stake
    await moveIn(db, {
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      actorId: viewer.id,
      kind: "debit",
      amount: stake,
      description: `Baccarat Bet on ${params.betType.toUpperCase()} (${stake.toFixed(2)} Pts)`,
    });

    // Record round
    const round = (
      await db.query<{ id: string }>(
        `insert into simulated_game_rounds
          (operator_id, account_id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, multiplier, payout, status, game_data, settled_at)
         values ($1, $2, 'baccarat', $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         returning id`,
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
          JSON.stringify({ result, betType: params.betType }),
        ],
      )
    ).rows[0];

    // Credit payout if won or push
    if (payout > 0) {
      await moveIn(db, {
        operatorId: viewer.operator_id,
        accountId: viewer.id,
        actorId: viewer.id,
        kind: "credit",
        amount: payout,
        description: `Baccarat ${status === "push" ? "Push Refund" : "Win"} (+${payout.toFixed(2)} Pts)`,
      });
    }

    const updated = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1`,
        [viewer.id],
      )
    ).rows[0];

    return {
      roundId: round.id,
      result,
      payout,
      multiplier,
      status,
      serverSeed,
      newBalance: Number(updated.balance),
    };
  });
}

// ====================================================================
// Dragon Tiger Server Actions
// ====================================================================

export async function playDragonTigerRound(params: {
  betType: "dragon" | "tiger" | "tie";
  stake: number;
  clientSeed?: string;
}): Promise<{
  roundId: string;
  result: DragonTigerResult;
  payout: number;
  multiplier: number;
  status: "won" | "push" | "lost";
  serverSeed: string;
  newBalance: number;
}> {
  const viewer = await getViewer();
  const stake = Number(params.stake);
  if (!stake || stake <= 0 || isNaN(stake)) {
    throw new Error("Invalid stake amount");
  }

  const allowed = await consume("dragontiger:play", 10, 2);
  if (!allowed) throw new Error("Rate limit exceeded: Please wait before placing next bet");

  return tx(async (db) => {
    await ensureGameConstraints(db);
    const acc = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1 for update`,
        [viewer.id],
      )
    ).rows[0];

    const currentBalance = Number(acc?.balance ?? 0);
    if (currentBalance < stake) {
      throw new Error(
        `Insufficient balance: Required ${stake.toFixed(2)}, available ${currentBalance.toFixed(2)}`,
      );
    }

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = params.clientSeed?.trim() || generateClientSeed();
    const nonce = Date.now() % 1000000;

    const result = calculateDragonTigerRound(serverSeed, clientSeed, nonce);

    let status: "won" | "push" | "lost" = "lost";
    let payout = 0;
    let multiplier = 0;

    if (result.winner === "tie") {
      if (params.betType === "tie") {
        status = "won";
        multiplier = 12; // 11:1 payout + stake returned
        payout = Number((stake * multiplier).toFixed(2));
      } else {
        // Standard casino rule: on Tie, Dragon/Tiger bets lose 50%, 50% returned
        status = "push";
        multiplier = 0.5;
        payout = Number((stake * 0.5).toFixed(2));
      }
    } else if (result.winner === params.betType) {
      status = "won";
      multiplier = 2.0; // 1:1 payout + stake returned
      payout = Number((stake * multiplier).toFixed(2));
    }

    // Debit stake
    await moveIn(db, {
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      actorId: viewer.id,
      kind: "debit",
      amount: stake,
      description: `Dragon Tiger Bet on ${params.betType.toUpperCase()} (${stake.toFixed(2)} Pts)`,
    });

    // Record round
    const round = (
      await db.query<{ id: string }>(
        `insert into simulated_game_rounds
          (operator_id, account_id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, multiplier, payout, status, game_data, settled_at)
         values ($1, $2, 'dragon_tiger', $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         returning id`,
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
          JSON.stringify({ result, betType: params.betType }),
        ],
      )
    ).rows[0];

    // Credit payout if won or refund
    if (payout > 0) {
      await moveIn(db, {
        operatorId: viewer.operator_id,
        accountId: viewer.id,
        actorId: viewer.id,
        kind: "credit",
        amount: payout,
        description: `Dragon Tiger ${status === "push" ? "Tie 50% Refund" : "Win"} (+${payout.toFixed(2)} Pts)`,
      });
    }

    const updated = (
      await db.query<{ balance: string }>(
        `select balance from accounts where id = $1`,
        [viewer.id],
      )
    ).rows[0];

    return {
      roundId: round.id,
      result,
      payout,
      multiplier,
      status,
      serverSeed,
      newBalance: Number(updated.balance),
    };
  });
}

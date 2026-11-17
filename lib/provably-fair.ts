import crypto from "node:crypto";

export type CrashResult = {
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

export type MinesLayout = {
  minePositions: number[];
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

export type PlinkoRisk = "low" | "medium" | "high";
export type PlinkoRows = 8 | 10 | 12 | 14 | 16;

export type PlinkoDropResult = {
  path: number[]; // 0 for left bounce, 1 for right bounce
  bucketIndex: number; // 0 to rows
  multiplier: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

export type TowerDifficulty = "easy" | "medium" | "hard" | "nightmare";

export type TowerConfig = {
  tilesPerFloor: number;
  trapsPerFloor: number;
  floors: number;
};

export const TOWER_CONFIGS: Record<TowerDifficulty, TowerConfig> = {
  easy: { tilesPerFloor: 4, trapsPerFloor: 1, floors: 8 },
  medium: { tilesPerFloor: 3, trapsPerFloor: 1, floors: 8 },
  hard: { tilesPerFloor: 2, trapsPerFloor: 1, floors: 8 },
  nightmare: { tilesPerFloor: 4, trapsPerFloor: 3, floors: 8 },
};

export const PLINKO_PAYOUTS: Record<PlinkoRows, Record<PlinkoRisk, number[]>> = {
  8: {
    low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    medium: [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0],
    high: [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0],
  },
  10: {
    low: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    medium: [22.0, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22.0],
    high: [76.0, 10.0, 3.0, 1.4, 0.3, 0.2, 0.3, 1.4, 3.0, 10.0, 76.0],
  },
  12: {
    low: [10.0, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10.0],
    medium: [33.0, 11.0, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11.0, 33.0],
    high: [170.0, 24.0, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24.0, 170.0],
  },
  14: {
    low: [13.0, 5.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 5.0, 13.0],
    medium: [58.0, 15.0, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15.0, 58.0],
    high: [420.0, 56.0, 18.0, 5.0, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5.0, 18.0, 56.0, 420.0],
  },
  16: {
    low: [16.0, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16.0],
    medium: [110.0, 41.0, 10.0, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10.0, 41.0, 110.0],
    high: [1000.0, 130.0, 26.0, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26.0, 130.0, 1000.0],
  },
};

/**
 * Generate a cryptographically secure 256-bit random server seed.
 */
export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * SHA-256 hash of the server seed that is committed to the player before the round.
 */
export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

/**
 * Generate a random client seed if player does not provide their own.
 */
export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Unbreakable Crash Multiplier Generator:
 * Uses HMAC-SHA256 with 52-bit float entropy.
 * Mathematically verifiable, deterministic, and immune to client manipulation or server biasing.
 */
export function calculateCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number {
  const hmac = crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");

  // Take 52 bits of entropy from the first 13 hex characters
  const slice = hmac.slice(0, 13);
  const hs = parseInt(slice, 16);
  const e = Math.pow(2, 52);

  // House edge condition: 1 in 33 games crashes immediately at 1.00x (~3% house edge)
  if (hs % 33 === 0) {
    return 1.0;
  }

  // Provably fair exponential multiplier formula
  const rawMultiplier = (100 * e - hs) / (e - hs);
  const crashPoint = Math.floor(rawMultiplier) / 100;

  // Clamp within realistic exchange bounds [1.01x, 2500.00x]
  return Math.min(Math.max(crashPoint, 1.01), 2500.0);
}

/**
 * Mines Grid Generator:
 * Uses HMAC-SHA512 to seed a deterministic Fisher-Yates shuffle across the 25 tiles [0..24].
 * Returns the exact mine indices.
 */
export function calculateMinesPositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mineCount: number,
): number[] {
  const clampedMines = Math.min(Math.max(mineCount, 1), 24);
  const hmac = crypto
    .createHmac("sha512", serverSeed)
    .update(`${clientSeed}:${nonce}:mines`)
    .digest("hex");

  const tiles = Array.from({ length: 25 }, (_, i) => i);

  // Fisher-Yates shuffle using 4-byte chunks of the HMAC hash
  for (let i = tiles.length - 1; i > 0; i--) {
    const offset = (tiles.length - 1 - i) * 8;
    const chunk = hmac.slice(offset % 120, (offset % 120) + 8);
    const rand = parseInt(chunk, 16);
    const j = rand % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  // The first `mineCount` shuffled elements are the mine locations
  const mines = tiles.slice(0, clampedMines);
  mines.sort((a, b) => a - b);
  return mines;
}

/**
 * Theoretical multiplier for Mines given the total mines and revealed gems.
 * Multiplier(k) = 0.98 * (25/ (25-M)) * (24/(24-M)) * ...
 */
export function calculateMinesMultiplier(mineCount: number, gemsRevealed: number): number {
  if (gemsRevealed <= 0) return 1.0;
  const safeTiles = 25 - mineCount;
  if (gemsRevealed > safeTiles) return 1.0;

  let prob = 1.0;
  for (let i = 0; i < gemsRevealed; i++) {
    prob *= (safeTiles - i) / (25 - i);
  }

  // 98% Return To Player (2% house margin)
  const mult = (1.0 / prob) * 0.98;
  return Number(Math.max(1.01, mult).toFixed(2));
}

/**
 * Plinko Drop Calculation:
 * Uses HMAC-SHA512 with progressive byte slicing for each row bounce.
 * Produces an exact sequence of left (0) or right (1) choices.
 * Deterministic and provably fair based on serverSeed, clientSeed, and nonce.
 */
export function calculatePlinkoDrop(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: PlinkoRows,
  risk: PlinkoRisk,
): {
  path: number[];
  bucketIndex: number;
  multiplier: number;
} {
  const hmac = crypto
    .createHmac("sha512", serverSeed)
    .update(`${clientSeed}:${nonce}:plinko`)
    .digest("hex");

  const path: number[] = [];
  let rightsCount = 0;

  for (let i = 0; i < rows; i++) {
    // 4 hex chars = 16 bits of entropy per pin
    const slice = hmac.slice(i * 4, (i + 1) * 4);
    const val = parseInt(slice, 16);
    // 0 = bounce left, 1 = bounce right
    const dir = val % 2;
    path.push(dir);
    if (dir === 1) rightsCount++;
  }

  const bucketIndex = rightsCount;
  const payouts = PLINKO_PAYOUTS[rows][risk];
  const multiplier = payouts[bucketIndex] ?? 1.0;

  return { path, bucketIndex, multiplier };
}

/**
 * Tower Floor Trap Layout:
 * For each floor, generates deterministic traps using HMAC-SHA256 with floor entropy.
 * Returns array of arrays: traps for each floor [floor0Traps, floor1Traps, ...].
 */
export function calculateTowerFloors(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  difficulty: TowerDifficulty,
): number[][] {
  const config = TOWER_CONFIGS[difficulty];
  const allFloorTraps: number[][] = [];

  for (let f = 0; f < config.floors; f++) {
    const hmac = crypto
      .createHmac("sha256", serverSeed)
      .update(`${clientSeed}:${nonce}:tower:${f}`)
      .digest("hex");

    const tiles = Array.from({ length: config.tilesPerFloor }, (_, i) => i);
    // Fisher-Yates shuffle with HMAC chunks
    for (let i = tiles.length - 1; i > 0; i--) {
      const chunk = hmac.slice((tiles.length - 1 - i) * 6, (tiles.length - 1 - i) * 6 + 6);
      const rand = parseInt(chunk, 16);
      const j = rand % (i + 1);
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const traps = tiles.slice(0, config.trapsPerFloor).sort((a, b) => a - b);
    allFloorTraps.push(traps);
  }

  return allFloorTraps;
}

/**
 * Calculate Tower Multiplier for a given cleared floor (1-indexed).
 * House edge: ~2% (0.98 RTP).
 */
export function calculateTowerMultiplier(difficulty: TowerDifficulty, clearedFloor: number): number {
  if (clearedFloor <= 0) return 1.0;
  const config = TOWER_CONFIGS[difficulty];
  if (clearedFloor > config.floors) clearedFloor = config.floors;

  const safeTiles = config.tilesPerFloor - config.trapsPerFloor;
  const pSafe = safeTiles / config.tilesPerFloor;

  // Cumulative survival probability
  const cumulativeP = Math.pow(pSafe, clearedFloor);
  const fairMult = 1.0 / cumulativeP;
  const mult = fairMult * 0.98;

  return Number(Math.max(1.05, mult).toFixed(2));
}

/**
 * Public Provably Fair Verifier:
 * Allows user to verify past rounds independently across any game type.
 */
export function verifyProvablyFair(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  gameType: "crash" | "mines" | "plinko" | "tower";
  mineCount?: number;
  plinkoRows?: PlinkoRows;
  plinkoRisk?: PlinkoRisk;
  towerDifficulty?: TowerDifficulty;
}): {
  verifiedHash: string;
  crashPoint?: number;
  minePositions?: number[];
  plinkoResult?: { path: number[]; bucketIndex: number; multiplier: number };
  towerTraps?: number[][];
} {
  const hash = hashServerSeed(params.serverSeed);
  if (params.gameType === "crash") {
    const crashPoint = calculateCrashPoint(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
    );
    return { verifiedHash: hash, crashPoint };
  } else if (params.gameType === "mines") {
    const minePositions = calculateMinesPositions(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
      params.mineCount || 3,
    );
    return { verifiedHash: hash, minePositions };
  } else if (params.gameType === "plinko") {
    const plinkoResult = calculatePlinkoDrop(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
      params.plinkoRows || 8,
      params.plinkoRisk || "medium",
    );
    return { verifiedHash: hash, plinkoResult };
  } else {
    const towerTraps = calculateTowerFloors(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
      params.towerDifficulty || "medium",
    );
    return { verifiedHash: hash, towerTraps };
  }
}

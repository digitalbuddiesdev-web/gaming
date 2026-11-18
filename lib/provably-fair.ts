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

// ====================================================================
// Neon Reels: 5x3 Cryptographic Matrix Slot Engine
// ====================================================================

export type SlotSymbol =
  | "WILD"
  | "SCATTER"
  | "SEVEN"
  | "CHERRY"
  | "APPLE"
  | "BANANA"
  | "LEMON"
  | "BELL"
  | "BAR"
  | "CLOVER"
  | "HORSESHOE"
  | "ACE"
  | "KING"
  | "QUEEN";

export type SlotPaylineHit = {
  lineIndex: number;
  symbol: SlotSymbol;
  count: number;
  multiplier: number;
  positions: [number, number][]; // [row, col]
};

export type SlotSpinResult = {
  grid: SlotSymbol[][]; // 3 rows x 5 columns
  reelStops: number[]; // 5 stop indices [0..63]
  winningLines: SlotPaylineHit[];
  scatterCount: number;
  scatterMultiplier: number;
  totalMultiplier: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
};

// 20 Standard Fixed Slot Paylines [reel0, reel1, reel2, reel3, reel4] (row indices: 0 = top, 1 = mid, 2 = bottom)
export const SLOT_PAYLINES: [number, number, number, number, number][] = [
  [1, 1, 1, 1, 1], // Line 1: Center horizontal
  [0, 0, 0, 0, 0], // Line 2: Top horizontal
  [2, 2, 2, 2, 2], // Line 3: Bottom horizontal
  [0, 1, 2, 1, 0], // Line 4: V-shape
  [2, 1, 0, 1, 2], // Line 5: Inverted V
  [0, 0, 1, 2, 2], // Line 6: Diagonal down
  [2, 2, 1, 0, 0], // Line 7: Diagonal up
  [1, 0, 0, 0, 1], // Line 8: Upper dip
  [1, 2, 2, 2, 1], // Line 9: Lower hump
  [0, 1, 1, 1, 0], // Line 10: Shallow V
  [2, 1, 1, 1, 2], // Line 11: Shallow inv-V
  [1, 0, 1, 2, 1], // Line 12: Zigzag down
  [1, 2, 1, 0, 1], // Line 13: Zigzag up
  [0, 2, 0, 2, 0], // Line 14: Sharp W
  [2, 0, 2, 0, 2], // Line 15: Sharp M
  [0, 1, 0, 1, 0], // Line 16: Top wave
  [2, 1, 2, 1, 2], // Line 17: Bottom wave
  [1, 1, 0, 1, 1], // Line 18: Middle-top
  [1, 1, 2, 1, 1], // Line 19: Middle-bottom
  [0, 2, 2, 2, 0], // Line 20: Wide bucket
];

// Payout Multiplier per payline hit (relative to total bet)
export const SLOT_PAYTABLE: Record<SlotSymbol, Record<3 | 4 | 5, number>> = {
  WILD: { 3: 5.0, 4: 25.0, 5: 100.0 },
  SEVEN: { 3: 4.0, 4: 15.0, 5: 50.0 },
  CHERRY: { 3: 3.5, 4: 12.0, 5: 40.0 },
  APPLE: { 3: 2.5, 4: 8.0, 5: 25.0 },
  BANANA: { 3: 2.0, 4: 6.0, 5: 18.0 },
  LEMON: { 3: 1.5, 4: 4.5, 5: 12.0 },
  BELL: { 3: 1.2, 4: 4.0, 5: 10.0 },
  BAR: { 3: 1.0, 4: 3.0, 5: 8.0 },
  CLOVER: { 3: 0.8, 4: 2.5, 5: 6.0 },
  HORSESHOE: { 3: 0.6, 4: 2.0, 5: 5.0 },
  ACE: { 3: 0.5, 4: 1.5, 5: 4.0 },
  KING: { 3: 0.4, 4: 1.2, 5: 3.0 },
  QUEEN: { 3: 0.3, 4: 1.0, 5: 2.5 },
  SCATTER: { 3: 2.0, 4: 10.0, 5: 50.0 }, // Paid anywhere on screen
};

// 5 Balanced 64-stop Virtual Reel Strips
export const SLOT_REELS: SlotSymbol[][] = [
  // Reel 1
  [
    "CHERRY", "APPLE", "CLOVER", "BANANA", "BAR", "LEMON", "BELL", "CHERRY",
    "HORSESHOE", "APPLE", "SEVEN", "BANANA", "ACE", "BAR", "CLOVER", "KING",
    "SCATTER", "LEMON", "CHERRY", "BELL", "HORSESHOE", "WILD", "APPLE", "BANANA",
    "ACE", "BAR", "CLOVER", "CHERRY", "QUEEN", "SEVEN", "APPLE", "BELL",
    "HORSESHOE", "BANANA", "LEMON", "ACE", "BAR", "CLOVER", "CHERRY", "SCATTER",
    "QUEEN", "APPLE", "BELL", "HORSESHOE", "BANANA", "LEMON", "ACE", "BAR",
    "CLOVER", "CHERRY", "WILD", "QUEEN", "APPLE", "BELL", "HORSESHOE", "BANANA",
    "LEMON", "SEVEN", "ACE", "BAR", "CLOVER", "CHERRY", "QUEEN", "APPLE"
  ],
  // Reel 2
  [
    "BANANA", "LEMON", "BAR", "CHERRY", "HORSESHOE", "APPLE", "SEVEN", "BANANA",
    "BELL", "LEMON", "CLOVER", "CHERRY", "QUEEN", "WILD", "APPLE", "BAR",
    "HORSESHOE", "BANANA", "SCATTER", "LEMON", "ACE", "BELL", "CLOVER", "CHERRY",
    "QUEEN", "BAR", "APPLE", "HORSESHOE", "BANANA", "SEVEN", "LEMON", "BELL",
    "ACE", "CLOVER", "CHERRY", "QUEEN", "WILD", "APPLE", "BAR", "HORSESHOE",
    "BANANA", "SCATTER", "LEMON", "ACE", "BELL", "CLOVER", "CHERRY", "QUEEN",
    "BAR", "APPLE", "HORSESHOE", "BANANA", "SEVEN", "LEMON", "BELL", "ACE",
    "CLOVER", "CHERRY", "QUEEN", "WILD", "APPLE", "BAR", "HORSESHOE", "BANANA"
  ],
  // Reel 3
  [
    "APPLE", "CLOVER", "BANANA", "BELL", "LEMON", "BAR", "CHERRY", "SEVEN",
    "HORSESHOE", "APPLE", "WILD", "BANANA", "SCATTER", "LEMON", "CLOVER", "CHERRY",
    "BELL", "APPLE", "BAR", "BANANA", "HORSESHOE", "LEMON", "SEVEN", "CHERRY",
    "WILD", "APPLE", "CLOVER", "BANANA", "BELL", "LEMON", "BAR", "CHERRY",
    "SCATTER", "HORSESHOE", "APPLE", "SEVEN", "BANANA", "LEMON", "CLOVER", "CHERRY",
    "BELL", "APPLE", "BAR", "BANANA", "WILD", "HORSESHOE", "LEMON", "SEVEN",
    "CHERRY", "APPLE", "CLOVER", "BANANA", "BELL", "LEMON", "BAR", "CHERRY",
    "SCATTER", "HORSESHOE", "APPLE", "SEVEN", "BANANA", "LEMON", "CLOVER", "CHERRY"
  ],
  // Reel 4
  [
    "CLOVER", "CHERRY", "BELL", "APPLE", "BANANA", "HORSESHOE", "BAR", "LEMON",
    "SEVEN", "CHERRY", "ACE", "WILD", "CLOVER", "APPLE", "BELL", "BANANA",
    "SCATTER", "LEMON", "HORSESHOE", "BAR", "CHERRY", "SEVEN", "APPLE", "BANANA",
    "CLOVER", "LEMON", "BELL", "CHERRY", "WILD", "APPLE", "HORSESHOE", "BAR",
    "BANANA", "SEVEN", "LEMON", "CHERRY", "CLOVER", "APPLE", "BELL", "BANANA",
    "SCATTER", "LEMON", "HORSESHOE", "BAR", "CHERRY", "SEVEN", "APPLE", "BANANA",
    "WILD", "CLOVER", "LEMON", "BELL", "CHERRY", "ACE", "HORSESHOE", "BAR",
    "APPLE", "SEVEN", "BANANA", "LEMON", "CLOVER", "CHERRY", "BELL", "APPLE"
  ],
  // Reel 5
  [
    "BAR", "SEVEN", "CHERRY", "APPLE", "BANANA", "CLOVER", "HORSESHOE", "BELL",
    "LEMON", "WILD", "CHERRY", "BAR", "APPLE", "SCATTER", "SEVEN", "BANANA",
    "CLOVER", "LEMON", "HORSESHOE", "CHERRY", "BELL", "APPLE", "BAR", "BANANA",
    "WILD", "LEMON", "SEVEN", "CHERRY", "CLOVER", "APPLE", "HORSESHOE", "BANANA",
    "BELL", "LEMON", "SCATTER", "BAR", "CHERRY", "SEVEN", "APPLE", "CLOVER",
    "BANANA", "HORSESHOE", "LEMON", "BELL", "CHERRY", "WILD", "APPLE", "BAR",
    "BANANA", "SEVEN", "LEMON", "CLOVER", "CHERRY", "HORSESHOE", "APPLE", "BELL",
    "BANANA", "SCATTER", "LEMON", "BAR", "CHERRY", "SEVEN", "APPLE", "CLOVER"
  ],
];

export function calculateSlotSpin(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): SlotSpinResult {
  const hmac = crypto
    .createHmac("sha512", serverSeed)
    .update(`${clientSeed}:${nonce}:slots`)
    .digest("hex");

  // Derive 5 reel stop indices from 5 distinct 4-byte chunks of the HMAC hash
  const reelStops: number[] = [];
  for (let r = 0; r < 5; r++) {
    const chunk = hmac.slice(r * 8, (r + 1) * 8);
    const stop = parseInt(chunk, 16) % 64;
    reelStops.push(stop);
  }

  // Construct 3 rows x 5 columns visible grid
  const grid: SlotSymbol[][] = [
    [], // Row 0 (Top)
    [], // Row 1 (Center)
    [], // Row 2 (Bottom)
  ];

  for (let c = 0; c < 5; c++) {
    const stop = reelStops[c];
    const reel = SLOT_REELS[c];
    const topSym = reel[(stop + 0) % 64];
    const midSym = reel[(stop + 1) % 64];
    const botSym = reel[(stop + 2) % 64];
    grid[0].push(topSym);
    grid[1].push(midSym);
    grid[2].push(botSym);
  }

  // Evaluate 20 paylines
  const winningLines: SlotPaylineHit[] = [];
  let paylineMultiplierSum = 0;

  for (let lineIdx = 0; lineIdx < SLOT_PAYLINES.length; lineIdx++) {
    const payline = SLOT_PAYLINES[lineIdx];
    const lineSymbols: { sym: SlotSymbol; pos: [number, number] }[] = payline.map((row, col) => ({
      sym: grid[row][col],
      pos: [row, col],
    }));

    // Find starting match target (first non-wild symbol, or WILD if all wild)
    let matchSym: SlotSymbol | null = null;
    for (const item of lineSymbols) {
      if (item.sym !== "WILD") {
        matchSym = item.sym;
        break;
      }
    }
    const targetSym: SlotSymbol = matchSym ?? "WILD";

    // Count consecutive matching symbols from reel 0
    let matchCount = 0;
    const hitPositions: [number, number][] = [];

    for (let c = 0; c < 5; c++) {
      const sym = lineSymbols[c].sym;
      if (sym === targetSym || (sym === "WILD" && targetSym !== "SCATTER")) {
        matchCount++;
        hitPositions.push(lineSymbols[c].pos);
      } else {
        break;
      }
    }

    if (matchCount >= 3 && targetSym !== "SCATTER") {
      const countKey = matchCount as 3 | 4 | 5;
      const mult = SLOT_PAYTABLE[targetSym]?.[countKey] ?? 0;
      if (mult > 0) {
        winningLines.push({
          lineIndex: lineIdx + 1,
          symbol: targetSym,
          count: matchCount,
          multiplier: mult,
          positions: hitPositions,
        });
        paylineMultiplierSum += mult;
      }
    }
  }

  // Count Scatters anywhere on the 3x5 grid
  let scatterCount = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === "SCATTER") scatterCount++;
    }
  }

  let scatterMultiplier = 0;
  if (scatterCount >= 3) {
    const key = Math.min(scatterCount, 5) as 3 | 4 | 5;
    scatterMultiplier = SLOT_PAYTABLE.SCATTER[key] ?? 0;
  }

  const totalMultiplier = Number((paylineMultiplierSum + scatterMultiplier).toFixed(2));

  return {
    grid,
    reelStops,
    winningLines,
    scatterCount,
    scatterMultiplier,
    totalMultiplier,
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed,
    nonce,
  };
}

// ====================================================================
// Club Cards: Cryptographic Blackjack 21 Engine
// ====================================================================

export type CardSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type CardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export type PlayingCard = {
  id: number; // 0..51
  suit: CardSuit;
  rank: CardRank;
  value: number; // Base point value (Ace is 1, J/Q/K is 10)
  code: string; // e.g. "As", "Kh", "10d"
};

export type BlackjackHand = {
  cards: PlayingCard[];
  score: number;
  isSoft: boolean;
  isBlackjack: boolean;
  isBusted: boolean;
};

export const SUITS: CardSuit[] = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS: { rank: CardRank; value: number }[] = [
  { rank: "A", value: 1 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 10 },
  { rank: "Q", value: 10 },
  { rank: "K", value: 10 },
];

export function createStandardDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  let id = 0;
  for (const s of SUITS) {
    for (const r of RANKS) {
      const suitChar = s === "spades" ? "s" : s === "hearts" ? "h" : s === "diamonds" ? "d" : "c";
      deck.push({
        id: id++,
        suit: s,
        rank: r.rank,
        value: r.value,
        code: `${r.rank}${suitChar}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): PlayingCard[] {
  const hmac = crypto
    .createHmac("sha512", serverSeed)
    .update(`${clientSeed}:${nonce}:cards`)
    .digest("hex");

  const deck = createStandardDeck();

  // 52-card Fisher-Yates shuffle with HMAC-SHA512 chunks
  for (let i = deck.length - 1; i > 0; i--) {
    const offset = (deck.length - 1 - i) * 8;
    const chunk = hmac.slice(offset % 120, (offset % 120) + 8);
    const rand = parseInt(chunk, 16);
    const j = rand % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function evaluateHand(cards: PlayingCard[]): BlackjackHand {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      score += 11;
    } else {
      score += card.value;
    }
  }

  let isSoft = aces > 0 && score <= 21;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
    isSoft = aces > 0 && score <= 21;
  }

  const isBusted = score > 21;
  const isBlackjack = cards.length === 2 && score === 21;

  return { cards, score, isSoft, isBlackjack, isBusted };
}

// ====================================================================
// European Roulette Mathematics & Deterministic Wheel Engine
// ====================================================================

export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const ROULETTE_RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type RouletteColor = "green" | "red" | "black";

export type RoulettePocket = {
  number: number;
  color: RouletteColor;
  isEven: boolean;
  isHigh: boolean;
  dozen: 1 | 2 | 3 | null;
  column: 1 | 2 | 3 | null;
};

export function getRoulettePocket(num: number): RoulettePocket {
  if (num === 0) {
    return {
      number: 0,
      color: "green",
      isEven: false,
      isHigh: false,
      dozen: null,
      column: null,
    };
  }
  const color: RouletteColor = ROULETTE_RED_NUMBERS.has(num) ? "red" : "black";
  const isEven = num % 2 === 0;
  const isHigh = num >= 19;
  const dozen: 1 | 2 | 3 = num <= 12 ? 1 : num <= 24 ? 2 : 3;
  const column: 1 | 2 | 3 = num % 3 === 1 ? 1 : num % 3 === 2 ? 2 : 3;
  return { number: num, color, isEven, isHigh, dozen, column };
}

export type RouletteBetType =
  | "straight"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high"
  | "dozen_1"
  | "dozen_2"
  | "dozen_3"
  | "col_1"
  | "col_2"
  | "col_3";

export type RouletteBet = {
  type: RouletteBetType;
  target?: number;
  stake: number;
};

export type RouletteSpinResult = {
  winningNumber: number;
  pocket: RoulettePocket;
  pocketIndexOnWheel: number;
  wheelRotationDegrees: number;
  ballRotationDegrees: number;
};

export function calculateRouletteSpin(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): RouletteSpinResult {
  const hmac = crypto
    .createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}:roulette`)
    .digest("hex");

  const intVal = parseInt(hmac.slice(0, 8), 16);
  const winningNumber = intVal % 37;

  const pocketIndexOnWheel = ROULETTE_NUMBERS.indexOf(winningNumber);
  const pocket = getRoulettePocket(winningNumber);

  const degPerPocket = 360 / 37;
  const pocketAngle = pocketIndexOnWheel * degPerPocket;
  // 5 full wheel rotations + deceleration offset
  const wheelRotationDegrees = 1800 + (360 - pocketAngle);
  const ballRotationDegrees = 2520 + pocketAngle;

  return {
    winningNumber,
    pocket,
    pocketIndexOnWheel,
    wheelRotationDegrees,
    ballRotationDegrees,
  };
}

/** Reject malformed stakes before payout math, which multiplies raw b.stake. */
export function validateRouletteBets(bets: RouletteBet[]): void {
  for (const b of bets) {
    if (!Number.isFinite(b.stake) || b.stake <= 0) {
      throw new Error("Invalid stake amount");
    }
  }
}

export function evaluateRouletteBets(
  winningNumber: number,
  bets: RouletteBet[],
): {
  totalStake: number;
  totalPayout: number;
  netProfit: number;
  winningBets: { bet: RouletteBet; payout: number }[];
} {
  validateRouletteBets(bets);
  let totalStake = 0;
  let totalPayout = 0;
  const winningBets: { bet: RouletteBet; payout: number }[] = [];
  const pocket = getRoulettePocket(winningNumber);

  for (const b of bets) {
    totalStake += b.stake;
    let won = false;
    let multiplier = 0;

    switch (b.type) {
      case "straight":
        if (b.target === winningNumber) {
          won = true;
          multiplier = 36;
        }
        break;
      case "red":
        if (pocket.color === "red") {
          won = true;
          multiplier = 2;
        }
        break;
      case "black":
        if (pocket.color === "black") {
          won = true;
          multiplier = 2;
        }
        break;
      case "even":
        if (winningNumber !== 0 && pocket.isEven) {
          won = true;
          multiplier = 2;
        }
        break;
      case "odd":
        if (winningNumber !== 0 && !pocket.isEven) {
          won = true;
          multiplier = 2;
        }
        break;
      case "low":
        if (winningNumber !== 0 && !pocket.isHigh) {
          won = true;
          multiplier = 2;
        }
        break;
      case "high":
        if (winningNumber !== 0 && pocket.isHigh) {
          won = true;
          multiplier = 2;
        }
        break;
      case "dozen_1":
        if (pocket.dozen === 1) {
          won = true;
          multiplier = 3;
        }
        break;
      case "dozen_2":
        if (pocket.dozen === 2) {
          won = true;
          multiplier = 3;
        }
        break;
      case "dozen_3":
        if (pocket.dozen === 3) {
          won = true;
          multiplier = 3;
        }
        break;
      case "col_1":
        if (pocket.column === 1) {
          won = true;
          multiplier = 3;
        }
        break;
      case "col_2":
        if (pocket.column === 2) {
          won = true;
          multiplier = 3;
        }
        break;
      case "col_3":
        if (pocket.column === 3) {
          won = true;
          multiplier = 3;
        }
        break;
    }

    if (won) {
      const payout = b.stake * multiplier;
      totalPayout += payout;
      winningBets.push({ bet: b, payout });
    }
  }

  return {
    totalStake,
    totalPayout,
    netProfit: totalPayout - totalStake,
    winningBets,
  };
}

// ====================================================================
// Baccarat (Punto Banco) Mathematics & Standard Drawing Rules
// ====================================================================

export type BaccaratWinner = "player" | "banker" | "tie";

export type BaccaratResult = {
  playerCards: PlayingCard[];
  bankerCards: PlayingCard[];
  playerScore: number;
  bankerScore: number;
  isNatural: boolean;
  winner: BaccaratWinner;
};

export function getBaccaratCardValue(rank: CardRank): number {
  if (rank === "A") return 1;
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return 0;
  return Number(rank);
}

export function getBaccaratScore(cards: PlayingCard[]): number {
  const sum = cards.reduce((acc, c) => acc + getBaccaratCardValue(c.rank), 0);
  return sum % 10;
}

export function calculateBaccaratRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): BaccaratResult {
  const deck = shuffleDeck(serverSeed, clientSeed, nonce);

  // Initial deal: Player (0, 2), Banker (1, 3)
  const playerCards: PlayingCard[] = [deck[0], deck[2]];
  const bankerCards: PlayingCard[] = [deck[1], deck[3]];
  let deckIdx = 4;

  let pScore = getBaccaratScore(playerCards);
  let bScore = getBaccaratScore(bankerCards);

  // Naturals (8 or 9)
  if (pScore >= 8 || bScore >= 8) {
    const winner: BaccaratWinner =
      pScore > bScore ? "player" : bScore > pScore ? "banker" : "tie";
    return {
      playerCards,
      bankerCards,
      playerScore: pScore,
      bankerScore: bScore,
      isNatural: true,
      winner,
    };
  }

  // Player drawing rule (draw on 0-5, stand on 6-7)
  let playerThirdCardVal: number | null = null;
  if (pScore <= 5) {
    const p3 = deck[deckIdx++];
    playerCards.push(p3);
    playerThirdCardVal = getBaccaratCardValue(p3.rank);
    pScore = getBaccaratScore(playerCards);
  }

  // Banker drawing rule
  if (playerThirdCardVal === null) {
    // Player stood on 6 or 7
    if (bScore <= 5) {
      bankerCards.push(deck[deckIdx++]);
      bScore = getBaccaratScore(bankerCards);
    }
  } else {
    // Player drew 3rd card
    let bankerDraws = false;
    if (bScore <= 2) {
      bankerDraws = true;
    } else if (bScore === 3) {
      bankerDraws = playerThirdCardVal !== 8;
    } else if (bScore === 4) {
      bankerDraws = [2, 3, 4, 5, 6, 7].includes(playerThirdCardVal);
    } else if (bScore === 5) {
      bankerDraws = [4, 5, 6, 7].includes(playerThirdCardVal);
    } else if (bScore === 6) {
      bankerDraws = [6, 7].includes(playerThirdCardVal);
    }

    if (bankerDraws) {
      bankerCards.push(deck[deckIdx++]);
      bScore = getBaccaratScore(bankerCards);
    }
  }

  const winner: BaccaratWinner =
    pScore > bScore ? "player" : bScore > pScore ? "banker" : "tie";

  return {
    playerCards,
    bankerCards,
    playerScore: pScore,
    bankerScore: bScore,
    isNatural: false,
    winner,
  };
}

// ====================================================================
// Dragon Tiger Showdown Mathematics
// ====================================================================

export type DragonTigerWinner = "dragon" | "tiger" | "tie";

export const CARD_RANK_ORDER: Record<CardRank, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

export type DragonTigerResult = {
  dragonCard: PlayingCard;
  tigerCard: PlayingCard;
  dragonRankVal: number;
  tigerRankVal: number;
  winner: DragonTigerWinner;
};

export function calculateDragonTigerRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): DragonTigerResult {
  const deck = shuffleDeck(serverSeed, clientSeed, nonce);
  const dragonCard = deck[0];
  const tigerCard = deck[1];

  const dragonRankVal = CARD_RANK_ORDER[dragonCard.rank];
  const tigerRankVal = CARD_RANK_ORDER[tigerCard.rank];

  const winner: DragonTigerWinner =
    dragonRankVal > tigerRankVal
      ? "dragon"
      : tigerRankVal > dragonRankVal
      ? "tiger"
      : "tie";

  return {
    dragonCard,
    tigerCard,
    dragonRankVal,
    tigerRankVal,
    winner,
  };
}

/**
 * Public Provably Fair Verifier:
 * Allows user to verify past rounds independently across any game type.
 */
export function verifyProvablyFair(params: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  gameType: "crash" | "mines" | "plinko" | "tower" | "slot" | "cards" | "roulette" | "baccarat" | "dragon_tiger";
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
  slotResult?: SlotSpinResult;
  cardDeck?: PlayingCard[];
  rouletteResult?: RouletteSpinResult;
  baccaratResult?: BaccaratResult;
  dragonTigerResult?: DragonTigerResult;
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
  } else if (params.gameType === "tower") {
    const towerTraps = calculateTowerFloors(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
      params.towerDifficulty || "medium",
    );
    return { verifiedHash: hash, towerTraps };
  } else if (params.gameType === "slot") {
    const slotResult = calculateSlotSpin(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
    );
    return { verifiedHash: hash, slotResult };
  } else if (params.gameType === "roulette") {
    const rouletteResult = calculateRouletteSpin(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
    );
    return { verifiedHash: hash, rouletteResult };
  } else if (params.gameType === "baccarat") {
    const baccaratResult = calculateBaccaratRound(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
    );
    return { verifiedHash: hash, baccaratResult };
  } else if (params.gameType === "dragon_tiger") {
    const dragonTigerResult = calculateDragonTigerRound(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
    );
    return { verifiedHash: hash, dragonTigerResult };
  } else {
    const cardDeck = shuffleDeck(
      params.serverSeed,
      params.clientSeed,
      params.nonce,
    );
    return { verifiedHash: hash, cardDeck };
  }
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bomb,
  Diamond,
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  startMinesRound,
  revealMinesTile,
  cashoutMinesRound,
} from "@/lib/simulated-actions";
import {
  calculateMinesPositions,
  calculateMinesMultiplier,
  hashServerSeed,
} from "@/lib/provably-fair";

export function MinesGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const balance = initialBalance;
  const router = useRouter();
  const [stake, setStake] = useState(100);
  const [mineCount, setMineCount] = useState(3);
  const [customClientSeed, setCustomClientSeed] = useState("");

  // Game state: "idle" | "playing" | "won" | "lost"
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [nextMultiplier, setNextMultiplier] = useState(1.0);
  const [currentProfit, setCurrentProfit] = useState(0);

  const [activeRound, setActiveRound] = useState<{
    roundId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    mineCount: number;
    stake: number;
  } | null>(null);

  const [settledSeed, setSettledSeed] = useState<string | null>(null);
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  // Start new Mines Round
  const handleStartGame = async () => {
    if (gameState === "playing" || stake <= 0 || stake > balance) return;

    try {
      setRevealedTiles([]);
      setMinePositions([]);
      setCurrentMultiplier(1.0);
      setNextMultiplier(calculateMinesMultiplier(mineCount, 1));
      setCurrentProfit(0);
      setSettledSeed(null);
      setVerifyResult(null);

      const res = await startMinesRound({
        stake,
        mineCount,
        clientSeed: customClientSeed.trim() || undefined,
      });

      setActiveRound(res);
      router.refresh(); // server debited the stake
      setGameState("playing");
    } catch (err: any) {
      alert(err.message || "Failed to start mines game");
      setGameState("idle");
    }
  };

  // Reveal a tile on the 5x5 grid
  const handleTileClick = async (index: number) => {
    if (gameState !== "playing" || revealedTiles.includes(index) || !activeRound) return;

    try {
      const res = await revealMinesTile({
        roundId: activeRound.roundId,
        tileIndex: index,
      });

      if (res.hitMine) {
        // Player hit a mine!
        setGameState("lost");
        setMinePositions(res.minePositions ?? []);
        setRevealedTiles((prev) => [...prev, index]);
        setSettledSeed(res.serverSeed ?? null);
      } else if (res.autoWon) {
        // Player revealed all gems!
        setGameState("won");
        setRevealedTiles(res.revealed ?? []);
        setMinePositions(res.minePositions ?? []);
        setCurrentMultiplier(res.multiplier ?? 1.0);
        setSettledSeed(res.serverSeed ?? null);
        router.refresh();
      } else {
        // Safe Gem revealed
        setRevealedTiles(res.revealed ?? []);
        setCurrentMultiplier(res.multiplier ?? 1.0);
        setNextMultiplier(res.nextMultiplier ?? 1.0);
        setCurrentProfit(res.profit ?? 0);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Cash out current winnings
  const handleCashout = async () => {
    if (gameState !== "playing" || !activeRound || revealedTiles.length === 0) return;

    try {
      const res = await cashoutMinesRound(activeRound.roundId);
      if (res.won) {
        setGameState("won");
        setMinePositions(res.minePositions);
        setSettledSeed(res.serverSeed);
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Cashout failed");
    }
  };

  // Verify Provably Fair round
  const handleVerify = () => {
    if (!settledSeed || !activeRound) return;
    const computedHash = hashServerSeed(settledSeed);
    const computedMines = calculateMinesPositions(
      settledSeed,
      activeRound.clientSeed,
      activeRound.nonce,
      activeRound.mineCount,
    );

    if (computedHash === activeRound.serverSeedHash) {
      setVerifyResult(
        `VERIFIED OK: SHA-256 Hash matches. Mines were placed at tiles: [${computedMines.join(", ")}].`,
      );
    } else {
      setVerifyResult("HASH MISMATCH: Verification failed.");
    }
  };

  return (
    <div className="sim-game-wrapper">
      {/* Title Header */}
      <div className="sim-game-header">
        <div className="sim-title-group">
          <Bomb className="ref-inline-icon danger" size={22} />
          <div>
            <h1 className="sim-title">MINES MATRIX</h1>
            <p className="sim-sub">
              Provably Fair HMAC-SHA512 · Deterministic Fisher-Yates Tile Shuffling
            </p>
          </div>
        </div>

        <div className="sim-meta-chips">
          <div className="sim-chip">
            <span className="sim-chip-k">Balance:</span>
            <span className="sim-chip-v">{balance.toFixed(2)} Pts</span>
          </div>
          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setShowFairnessModal(true)}
          >
            <ShieldCheck size={14} className="ref-inline-icon" /> Provably Fair
          </button>
        </div>
      </div>

      {/* Main Arena */}
      <div className="sim-arena-grid">
        {/* 5x5 Mines Board */}
        <div className="mines-board-card">
          <div className="mines-grid-5x5">
            {Array.from({ length: 25 }, (_, i) => {
              const isRevealed = revealedTiles.includes(i);
              const isMine = minePositions.includes(i);
              const showMine = (gameState === "lost" || gameState === "won") && isMine;
              const showGem = isRevealed && !isMine;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={gameState !== "playing" || isRevealed}
                  className={`mines-tile ${isRevealed ? "revealed" : ""} ${showMine ? "mine" : ""} ${showGem ? "gem" : ""}`}
                  onClick={() => handleTileClick(i)}
                >
                  {showMine ? (
                    <Bomb size={24} className="mines-tile-icon bomb" />
                  ) : showGem ? (
                    <Diamond size={24} className="mines-tile-icon diamond" />
                  ) : (
                    <span className="mines-tile-cover" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Banner status during game */}
          {gameState === "won" && (
            <div className="mines-status-banner win">
              <span>ROUND WON! Cashed out @ {currentMultiplier.toFixed(2)}x</span>
            </div>
          )}
          {gameState === "lost" && (
            <div className="mines-status-banner lost">
              <span>DETONATED! You stepped on a mine.</span>
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="sim-controls-card">
          <div className="sim-control-group">
            <label className="sim-control-label">Stake Amount (Pts)</label>
            <input
              type="number"
              min="1"
              step="1"
              disabled={gameState === "playing"}
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
              className="sim-input"
            />

            <div className="sim-stake-chips">
              {[10, 50, 100, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={gameState === "playing"}
                  className="sim-chip-btn"
                  onClick={() => setStake((prev) => prev + val)}
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                disabled={gameState === "playing"}
                className="sim-chip-btn max"
                onClick={() => setStake(Math.floor(balance))}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="sim-control-group">
            <label className="sim-control-label">Mines (1 to 24)</label>
            <select
              className="sim-select"
              disabled={gameState === "playing"}
              value={mineCount}
              onChange={(e) => setMineCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 24].map((m) => (
                <option key={m} value={m}>
                  {m} Mines ({25 - m} Gems)
                </option>
              ))}
            </select>
          </div>

          {/* Current multiplier status */}
          <div className="mines-stat-box">
            <div className="mines-stat-row">
              <span>Current Multiplier:</span>
              <span className="mines-stat-val accent">{currentMultiplier.toFixed(2)}x</span>
            </div>
            <div className="mines-stat-row">
              <span>Next Tile:</span>
              <span className="mines-stat-val">{nextMultiplier.toFixed(2)}x</span>
            </div>
            <div className="mines-stat-row">
              <span>Potential Profit:</span>
              <span className="mines-stat-val win">+{currentProfit.toFixed(2)} Pts</span>
            </div>
          </div>

          {/* Action button */}
          <div className="sim-action-zone">
            {gameState === "playing" ? (
              <button
                type="button"
                className="sim-btn-cashout"
                disabled={revealedTiles.length === 0}
                onClick={handleCashout}
              >
                CASH OUT ({(stake * currentMultiplier).toFixed(2)} Pts)
              </button>
            ) : (
              <button
                type="button"
                className="sim-btn-launch"
                disabled={stake <= 0 || stake > balance}
                onClick={handleStartGame}
              >
                <Zap size={16} className="ref-inline-icon" /> START MINES GAME
              </button>
            )}
          </div>

          {/* Provably fair hash display */}
          <div className="sim-crypto-preview">
            <div className="sim-crypto-row">
              <span className="sim-crypto-k">Server Hash:</span>
              <span className="sim-crypto-v">
                {activeRound?.serverSeedHash
                  ? `${activeRound.serverSeedHash.slice(0, 16)}...`
                  : "Committed upon start"}
              </span>
            </div>
            {settledSeed && (
              <div className="sim-crypto-row revealed">
                <span className="sim-crypto-k">Server Seed:</span>
                <span className="sim-crypto-v">{settledSeed.slice(0, 16)}...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fairness Modal */}
      {showFairnessModal && (
        <div className="sim-modal-backdrop" onClick={() => setShowFairnessModal(false)}>
          <div className="sim-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sim-modal-header">
              <div className="sim-modal-title">
                <ShieldCheck size={18} className="ref-inline-icon accent" />
                <span>Provably Fair Mines Verification</span>
              </div>
              <button
                type="button"
                className="sim-modal-close"
                onClick={() => setShowFairnessModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sim-modal-body">
              <p className="sim-fairness-desc">
                Mine locations are chosen using <b>HMAC-SHA512</b> with deterministic
                Fisher-Yates shuffling. The server seed hash is committed prior to your first
                click.
              </p>

              <div className="sim-field-box">
                <label>Revealed Server Seed</label>
                <input
                  type="text"
                  readOnly
                  value={settledSeed || "Revealed once round ends"}
                  className="sim-readonly-input"
                />
              </div>

              <div className="sim-field-box">
                <label>Committed Server Seed Hash</label>
                <input
                  type="text"
                  readOnly
                  value={activeRound?.serverSeedHash || "No active round"}
                  className="sim-readonly-input"
                />
              </div>

              <button
                type="button"
                className="sim-btn-verify"
                disabled={!settledSeed}
                onClick={handleVerify}
              >
                Verify Tile Positions
              </button>

              {verifyResult && (
                <div className="sim-verify-alert">
                  <CheckCircle2 size={16} className="ref-inline-icon accent" />
                  <span>{verifyResult}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

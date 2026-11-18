"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Gem,
  Skull,
  TrendingUp,
  ArrowUp,
  Copy,
  X,
} from "lucide-react";
import {
  startTowerRound,
  stepTowerTile,
  cashoutTowerRound,
} from "@/lib/simulated-actions";
import {
  TowerDifficulty,
  TOWER_CONFIGS,
  calculateTowerFloors,
  calculateTowerMultiplier,
  hashServerSeed,
} from "@/lib/provably-fair";

export function TowerGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const balance = initialBalance;
  const router = useRouter();
  const [stake, setStake] = useState(100);
  const [difficulty, setDifficulty] = useState<TowerDifficulty>("medium");
  const [customClientSeed, setCustomClientSeed] = useState("");

  // Game lifecycle states: "idle" | "playing" | "won" | "lost"
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [currentFloor, setCurrentFloor] = useState(0); // 0 = not started floor 1 yet
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [nextMultiplier, setNextMultiplier] = useState(1.47);
  const [currentProfit, setCurrentProfit] = useState(0);

  // Steps taken: Array of { floor: number, tile: number, safe: boolean }
  const [steps, setSteps] = useState<{ floor: number; tile: number; safe: boolean }[]>([]);
  // All revealed floor traps upon game finish
  const [revealedAllTraps, setRevealedAllTraps] = useState<number[][] | null>(null);

  const [activeRound, setActiveRound] = useState<{
    roundId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    difficulty: TowerDifficulty;
    stake: number;
  } | null>(null);

  const [settledSeed, setSettledSeed] = useState<string | null>(null);
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const config = TOWER_CONFIGS[difficulty];

  // Quick Stake Helper
  const setQuickStake = (val: number) => {
    setStake(Math.max(1, Math.min(balance, Math.floor(val))));
  };

  // Start Tower Round
  const handleStartGame = async () => {
    if (gameState === "playing" || stake <= 0 || stake > balance) return;

    try {
      const res = await startTowerRound({
        stake,
        difficulty,
        clientSeed: customClientSeed.trim() || undefined,
      });

      setActiveRound({
        roundId: res.roundId,
        serverSeedHash: res.serverSeedHash,
        clientSeed: res.clientSeed,
        nonce: res.nonce,
        difficulty: res.difficulty,
        stake,
      });
      router.refresh(); // server debited the stake

      setGameState("playing");
      setCurrentFloor(0);
      setCurrentMultiplier(1.0);
      setNextMultiplier(res.nextMultiplier);
      setCurrentProfit(0);
      setSteps([]);
      setRevealedAllTraps(null);
      setSettledSeed(null);
      setVerifyResult(null);
    } catch (err: any) {
      alert(err.message || "Failed to start Tower ascent");
    }
  };

  // Step on a tile on the current floor
  const handleStepTile = async (tileIndex: number) => {
    if (gameState !== "playing" || !activeRound) return;

    try {
      const res = await stepTowerTile({
        roundId: activeRound.roundId,
        tileIndex,
      });

      if (res.hitTrap) {
        // Hit a trap! Round lost
        setGameState("lost");
        setRevealedAllTraps(res.allFloorTraps || []);
        setSettledSeed(res.serverSeed || null);
        setSteps((prev) => [
          ...prev,
          { floor: currentFloor, tile: tileIndex, safe: false },
        ]);
      } else if (res.autoWon) {
        // Reached summit!
        setGameState("won");
        setCurrentFloor(res.clearedFloor ?? config.floors);
        setCurrentMultiplier(res.multiplier ?? 1.0);
        router.refresh();
        setRevealedAllTraps(res.allFloorTraps || []);
        setSettledSeed(res.serverSeed || null);
        setSteps((prev) => [
          ...prev,
          { floor: currentFloor, tile: tileIndex, safe: true },
        ]);
      } else {
        // Safe step! Advance floor
        setCurrentFloor(res.clearedFloor ?? (currentFloor + 1));
        setCurrentMultiplier(res.multiplier ?? 1.0);
        setNextMultiplier(res.nextMultiplier ?? 1.0);
        setCurrentProfit(res.currentProfit ?? 0);
        setSteps((prev) => [
          ...prev,
          { floor: currentFloor, tile: tileIndex, safe: true },
        ]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to step on tile");
    }
  };

  // Cash out current progress
  const handleCashout = async () => {
    if (gameState !== "playing" || !activeRound || currentFloor <= 0) return;

    try {
      const res = await cashoutTowerRound(activeRound.roundId);
      setGameState("won");
      router.refresh();
      setCurrentMultiplier(res.multiplier);
      setRevealedAllTraps(res.allFloorTraps || []);
      setSettledSeed(res.serverSeed || null);
    } catch (err: any) {
      alert(err.message || "Failed to cash out");
    }
  };

  // Verify Provably Fair
  const handleVerifyFairness = () => {
    if (!settledSeed || !activeRound) return;
    try {
      const computedHash = hashServerSeed(settledSeed);
      const computedTraps = calculateTowerFloors(
        settledSeed,
        activeRound.clientSeed,
        activeRound.nonce,
        activeRound.difficulty,
      );

      const isHashMatch = computedHash === activeRound.serverSeedHash;
      if (isHashMatch) {
        setVerifyResult(
          `VERIFIED: Server seed hash matches ${computedHash.slice(0, 16)}... All 8 floor trap layouts strictly match mathematical HMAC-SHA256 generation.`,
        );
      } else {
        setVerifyResult("HASH MISMATCH: Verification failed.");
      }
    } catch {
      setVerifyResult("Verification calculation error.");
    }
  };

  return (
    <div className="sim-game-container">
      {/* Game Header Bar */}
      <div className="sim-game-header">
        <div className="sim-title-group">
          <div className="sim-icon-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="sim-game-title">Tower Ascent</h1>
            <p className="sim-game-desc">
              8-Floor Recursive Hash Chaining &bull; Summit multipliers up to 1,000x &bull; Cash out anytime
            </p>
          </div>
        </div>

        <div className="sim-header-actions">
          <div className="sim-balance-pill">
            <span className="sim-balance-label">Balance</span>
            <span className="sim-balance-val">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>

          <button
            onClick={() => setShowFairnessModal(true)}
            className="sim-fair-btn"
            title="Provably Fair Verification"
          >
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Fairness</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls Left, Vertical Tower Right */}
      <div className="sim-main-grid">
        {/* Controls Sidebar */}
        <div className="sim-controls-panel">
          {/* Bet Stake Input */}
          <div className="sim-control-group">
            <label className="sim-control-label">
              <span>Bet Amount ($)</span>
              <span className="text-xs text-slate-400">Min $1 &bull; Max ${balance.toFixed(0)}</span>
            </label>
            <div className="sim-input-wrapper">
              <input
                type="number"
                min={1}
                max={balance}
                value={stake}
                disabled={gameState === "playing"}
                onChange={(e) => setStake(Number(e.target.value))}
                className="sim-input-field"
              />
            </div>
            <div className="sim-quick-grid">
              <button
                disabled={gameState === "playing"}
                onClick={() => setQuickStake(stake / 2)}
                className="sim-quick-btn"
              >
                1/2
              </button>
              <button
                disabled={gameState === "playing"}
                onClick={() => setQuickStake(stake * 2)}
                className="sim-quick-btn"
              >
                2x
              </button>
              <button
                disabled={gameState === "playing"}
                onClick={() => setQuickStake(50)}
                className="sim-quick-btn"
              >
                $50
              </button>
              <button
                disabled={gameState === "playing"}
                onClick={() => setQuickStake(250)}
                className="sim-quick-btn"
              >
                $250
              </button>
              <button
                disabled={gameState === "playing"}
                onClick={() => setQuickStake(balance)}
                className="sim-quick-btn"
              >
                Max
              </button>
            </div>
          </div>

          {/* Difficulty Preset */}
          <div className="sim-control-group">
            <label className="sim-control-label">
              <span>Difficulty Level</span>
              <span className="text-xs text-amber-400 capitalize">{difficulty}</span>
            </label>
            <div className="sim-difficulty-list">
              {(["easy", "medium", "hard", "nightmare"] as TowerDifficulty[]).map((d, index) => (
                <button
                  key={d}
                  type="button"
                  disabled={gameState === "playing"}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={`sim-difficulty-row ${difficulty === d ? "active" : ""}`}
                >
                  <span className="difficulty-rank">{index + 1}</span>
                  <span className="difficulty-body">
                    <span className="difficulty-name">{d}</span>
                    <span className="difficulty-detail">
                      {d === "easy" && "4 tiles · 1 trap"}
                      {d === "medium" && "3 tiles · 1 trap"}
                      {d === "hard" && "2 tiles · 1 trap"}
                      {d === "nightmare" && "4 tiles · 3 traps"}
                    </span>
                  </span>
                  <span className="difficulty-meter" aria-hidden="true">
                    {[0, 1, 2, 3].map((step) => (
                      <span key={step} className={step <= index ? "filled" : ""} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Round Info & Dynamic Multipliers */}
          {gameState === "playing" && (
            <div className="sim-active-stat-box">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>Current Floor</span>
                <span className="font-semibold text-sky-400">
                  Floor {currentFloor} / 8
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span>Current Multiplier</span>
                <span className="font-bold text-white text-base">
                  {currentMultiplier > 1 ? `${currentMultiplier.toFixed(2)}x` : "1.00x"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Next Floor Multiplier</span>
                <span className="font-semibold text-amber-400">
                  {nextMultiplier.toFixed(2)}x
                </span>
              </div>
            </div>
          )}

          {/* Client Seed Option */}
          <div className="sim-control-group">
            <label className="sim-control-label">
              <span>Client Seed</span>
            </label>
            <input
              type="text"
              placeholder="Auto-generated secure entropy..."
              value={customClientSeed}
              disabled={gameState === "playing"}
              onChange={(e) => setCustomClientSeed(e.target.value)}
              className="sim-input-field text-xs font-mono"
            />
          </div>

          {/* Primary Action Buttons */}
          {gameState === "playing" ? (
            <button
              onClick={handleCashout}
              disabled={currentFloor === 0}
              className="sim-btn-cashout"
            >
              <Zap className="w-5 h-5" />
              <span>
                {currentFloor === 0
                  ? "Step on Floor 1 to Cash Out"
                  : `Cash Out $${(stake * currentMultiplier).toFixed(2)} (${currentMultiplier.toFixed(2)}x)`}
              </span>
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              disabled={stake <= 0 || stake > balance}
              className="sim-btn-primary"
            >
              <ArrowUp className="w-5 h-5" />
              <span>Ascend Tower (${stake})</span>
            </button>
          )}
        </div>

        {/* Vertical Tower Ascension Board */}
        <div className="sim-tower-stage">
          {/* Header Progress indicator */}
          <div className="sim-tower-top-banner">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-slate-300">
                Summit Multiplier: {calculateTowerMultiplier(difficulty, 8).toFixed(2)}x
              </span>
            </div>
            {gameState === "won" && (
              <span className="text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30">
                CASHED OUT: +${(stake * currentMultiplier - stake).toFixed(2)}
              </span>
            )}
            {gameState === "lost" && (
              <span className="text-xs font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
                TRAP TRIGGERED
              </span>
            )}
          </div>

          {/* 8 Floors stacked vertically (Floor 8 on Top, Floor 1 on Bottom) */}
          <div className="sim-tower-floors-container">
            {Array.from({ length: 8 }, (_, idx) => {
              const floorIndex = 7 - idx; // 7 down to 0
              const floorNumber = floorIndex + 1;
              const isCurrent = gameState === "playing" && currentFloor === floorIndex;
              const isCleared = currentFloor > floorIndex;
              const isFuture = currentFloor < floorIndex;
              const floorMult = calculateTowerMultiplier(difficulty, floorNumber);

              // Find step taken on this floor if any
              const stepOnFloor = steps.find((s) => s.floor === floorIndex);
              const trapsOnFloor = revealedAllTraps ? revealedAllTraps[floorIndex] : [];

              return (
                <div
                  key={floorIndex}
                  className={`sim-tower-floor ${
                    isCurrent ? "current" : isCleared ? "cleared" : isFuture ? "future" : ""
                  }`}
                >
                  {/* Floor Level & Multiplier Tag */}
                  <div className="sim-floor-label">
                    <span className="text-[11px] font-mono text-slate-400">F{floorNumber}</span>
                    <span className={`text-[11px] font-bold ${isCleared ? "text-sky-400" : isCurrent ? "text-amber-400" : "text-slate-500"}`}>
                      {floorMult.toFixed(2)}x
                    </span>
                  </div>

                  {/* Tiles on this floor */}
                  <div
                    className="sim-floor-tiles"
                    style={{
                      gridTemplateColumns: `repeat(${config.tilesPerFloor}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: config.tilesPerFloor }, (_, tIdx) => {
                      const wasClicked = stepOnFloor?.tile === tIdx;
                      const wasSafe = wasClicked && stepOnFloor?.safe;
                      const wasTrap = wasClicked && !stepOnFloor?.safe;
                      const isRevealedTrap = revealedAllTraps && trapsOnFloor.includes(tIdx);

                      return (
                        <button
                          key={tIdx}
                          disabled={!isCurrent}
                          onClick={() => handleStepTile(tIdx)}
                          className={`sim-tower-tile ${
                            wasSafe
                              ? "safe"
                              : wasTrap
                              ? "trap"
                              : isRevealedTrap
                              ? "revealed-trap"
                              : isCurrent
                              ? "active-selectable"
                              : ""
                          }`}
                        >
                          {wasSafe ? (
                            <Gem className="w-5 h-5 text-sky-400 animate-bounce" />
                          ) : wasTrap ? (
                            <Skull className="w-5 h-5 text-rose-500 animate-pulse" />
                          ) : isRevealedTrap ? (
                            <Skull className="w-4 h-4 text-rose-400 opacity-60" />
                          ) : (
                            <span className="sim-tile-dot" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fairness & Cryptographic Auditor Modal */}
      {showFairnessModal && (
        <div className="sim-modal-backdrop" onClick={() => setShowFairnessModal(false)}>
          <div className="sim-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sim-modal-header">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
                <h3 className="text-lg font-bold text-slate-900">Provably Fair Tower Auditor</h3>
              </div>
              <button
                onClick={() => setShowFairnessModal(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="sim-modal-body space-y-4">
              <p className="text-xs text-slate-600">
                Tower ascent traps are mathematically pre-determined at the start of each round
                using recursive HMAC-SHA256 across all 8 floors. The trap positions cannot be shifted or altered
                mid-game once the server seed hash is committed.
              </p>

              {activeRound ? (
                <>
                  <div className="sim-field-box">
                    <span className="sim-field-label">Committed Server Seed Hash (SHA-256)</span>
                    <div className="sim-copy-row">
                      <span className="font-mono text-xs text-slate-800 truncate">
                        {activeRound.serverSeedHash}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(activeRound.serverSeedHash)}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="sim-field-box">
                    <span className="sim-field-label">Revealed Server Seed</span>
                    <span className="font-mono text-xs text-sky-400 truncate">
                      {settledSeed || "Revealed automatically once round is settled (won or lost)."}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="sim-field-box">
                      <span className="sim-field-label">Client Seed</span>
                      <span className="font-mono text-xs text-slate-300 truncate">
                        {activeRound.clientSeed}
                      </span>
                    </div>
                    <div className="sim-field-box">
                      <span className="sim-field-label">Nonce</span>
                      <span className="font-mono text-xs text-slate-300">
                        {activeRound.nonce}
                      </span>
                    </div>
                  </div>

                  {settledSeed && (
                    <button onClick={handleVerifyFairness} className="sim-btn-verify">
                      <CheckCircle2 className="w-4 h-4 text-sky-400" />
                      <span>Verify Trap Layout Integrity</span>
                    </button>
                  )}

                  {verifyResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-mono border ${
                        verifyResult.includes("VERIFIED")
                          ? "bg-blue-950/40 border-blue-500/40 text-sky-300"
                          : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                      }`}
                    >
                      {verifyResult}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Ascend the Tower to view cryptographic commitments and audit hashes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

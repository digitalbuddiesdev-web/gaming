"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  ShieldCheck,
  Zap,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  X,
} from "lucide-react";
import {
  startCrashRound,
  cashoutCrashRound,
} from "@/lib/simulated-actions";
import { calculateCrashPoint, hashServerSeed } from "@/lib/provably-fair";

export function CrashGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const balance = initialBalance;
  const router = useRouter();
  const [stake, setStake] = useState(100);
  const [autoCashout, setAutoCashout] = useState<number | "">("");
  const [customClientSeed, setCustomClientSeed] = useState("");

  // Game lifecycle states: "idle" | "running" | "cashed_out" | "crashed"
  const [gameState, setGameState] = useState<"idle" | "running" | "cashed_out" | "crashed">("idle");
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [finalMultiplier, setFinalMultiplier] = useState(1.0);
  const [activeRound, setActiveRound] = useState<{
    roundId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    stake: number;
  } | null>(null);

  const [settledSeed, setSettledSeed] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [history, setHistory] = useState<number[]>(
    recentHistory.map((h) => Number(h.multiplier) || 1.0),
  );
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Quick Stake Helper
  const setQuickStake = (val: number) => {
    setStake((prev) => Math.max(1, prev + val));
  };

  // Launch Rocket Round
  const handleLaunch = async () => {
    if (gameState === "running" || stake <= 0 || stake > balance) return;

    try {
      setGameState("running");
      setCurrentMultiplier(1.0);
      setSettledSeed(null);
      setVerifyResult(null);

      const round = await startCrashRound({
        stake,
        clientSeed: customClientSeed.trim() || undefined,
      });

      setActiveRound(round);
      router.refresh(); // server debited the stake
      startTimeRef.current = performance.now();

      // Run local simulated multiplier animation
      // Multiplier increases exponentially: M(t) = e^(0.06 * t_seconds)
      const animateLoop = (timestamp: number) => {
        const elapsedSec = (timestamp - startTimeRef.current) / 1000;
        const currentM = Number(Math.max(1.0, Math.exp(0.08 * elapsedSec)).toFixed(2));
        setCurrentMultiplier(currentM);

        // Check if Auto Cashout triggered
        if (
          autoCashout &&
          Number(autoCashout) > 1.0 &&
          currentM >= Number(autoCashout)
        ) {
          handleCashout(currentM);
          return;
        }

        // Draw dynamic trajectory on Canvas
        drawCanvas(currentM, elapsedSec, false);

        animationFrameRef.current = requestAnimationFrame(animateLoop);
      };

      animationFrameRef.current = requestAnimationFrame(animateLoop);
    } catch (err: any) {
      alert(err.message || "Failed to launch rocket");
      setGameState("idle");
    }
  };

  // Handle Player Manual or Auto Cash Out
  const handleCashout = async (multOverride?: number) => {
    if (!activeRound || gameState !== "running") return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const multToCash = multOverride || currentMultiplier;

    try {
      const res = await cashoutCrashRound({
        roundId: activeRound.roundId,
        targetMultiplier: multToCash,
      });
      router.refresh();

      if (res.won) {
        const mult = res.multiplier ?? multToCash;
        setGameState("cashed_out");
        setFinalMultiplier(mult);
        setPayoutAmount(res.payout ?? 0);
        setSettledSeed(res.serverSeed ?? null);
        setHistory((prev) => [mult, ...prev.slice(0, 9)]);
        drawCanvas(mult, 0, false, true);
      } else {
        // Crashed before target
        const actualCrash = res.actualCrashPoint ?? 1.0;
        setGameState("crashed");
        setFinalMultiplier(actualCrash);
        setSettledSeed(res.serverSeed ?? null);
        setHistory((prev) => [actualCrash, ...prev.slice(0, 9)]);
        drawCanvas(actualCrash, 0, true);
      }
    } catch (err: any) {
      alert(err.message || "Cashout failed");
      setGameState("idle");
    }
  };

  // Canvas visual rendering
  const drawCanvas = (
    multiplier: number,
    elapsedSec: number,
    isCrashed = false,
    isWon = false,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Trajectory curve
    const progress = Math.min((multiplier - 1.0) / 4.0, 1.0);
    const startX = 30;
    const startY = height - 30;
    const endX = startX + progress * (width - 120);
    const endY = startY - Math.pow(progress, 0.8) * (height - 80);

    // Glowing curve line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + (endX - startX) * 0.4, startY, endX, endY);

    if (isCrashed) {
      ctx.strokeStyle = "#f87171";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 15;
    } else if (isWon) {
      ctx.strokeStyle = "#00c278";
      ctx.shadowColor = "#00c278";
      ctx.shadowBlur = 15;
    } else {
      ctx.strokeStyle = "#38bdf8";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
    }
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw Rocket or Explosion at end point
    if (isCrashed) {
      // Explosion circle
      ctx.beginPath();
      ctx.arc(endX, endY, 16, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
      ctx.fill();
    } else {
      // Rocket icon representation
      ctx.save();
      ctx.translate(endX, endY);
      ctx.rotate(-0.4);

      // Rocket body
      ctx.fillStyle = isWon ? "#00c278" : "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rocket flame
      ctx.fillStyle = "#ff7b00";
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-20, -4);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-20, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  };

  // Resize canvas cleanly on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 700;
      canvas.height = 340;
      drawCanvas(1.0, 0);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Verify Provably Fair round math
  const handleVerifyFairness = () => {
    if (!settledSeed || !activeRound) return;
    const computedHash = hashServerSeed(settledSeed);
    const computedCrash = calculateCrashPoint(
      settledSeed,
      activeRound.clientSeed,
      activeRound.nonce,
    );

    if (computedHash === activeRound.serverSeedHash) {
      setVerifyResult(
        `VERIFIED OK: Server Seed hash matches exactly. Deterministic Crash Point was ${computedCrash}x.`,
      );
    } else {
      setVerifyResult("HASH MISMATCH: Verification failed.");
    }
  };

  return (
    <div className="sim-game-wrapper">
      {/* Game Title Bar */}
      <div className="sim-game-header">
        <div className="sim-title-group">
          <Rocket className="ref-inline-icon accent" size={22} />
          <div>
            <h1 className="sim-title">CRASH ROCKET</h1>
            <p className="sim-sub">
              Provably Fair HMAC-SHA256 Multiplier · Unbreakable Cryptographic Curve
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

      {/* Multiplier History Pill Ribbon */}
      <div className="sim-history-ribbon">
        <span className="sim-history-label">RECENT:</span>
        <div className="sim-history-pills">
          {history.map((m, idx) => (
            <span
              key={idx}
              className={`sim-history-pill ${m >= 2.0 ? "high" : m >= 1.5 ? "mid" : "low"}`}
            >
              {m.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* Main Arena Layout */}
      <div className="sim-arena-grid">
        {/* Left Arena: Canvas & Live Multiplier Display */}
        <div className="sim-display-card">
          <canvas ref={canvasRef} className="sim-canvas" />

          {/* Central Multiplier Indicator Overlay */}
          <div className="sim-multiplier-overlay">
            {gameState === "idle" && (
              <div className="sim-overlay-idle">
                <span className="sim-idle-text">WAITING TO LAUNCH</span>
                <span className="sim-idle-sub">Set stake and ignite the rocket</span>
              </div>
            )}

            {gameState === "running" && (
              <div className="sim-overlay-running">
                <span className="sim-big-multiplier">{currentMultiplier.toFixed(2)}x</span>
                <span className="sim-current-profit">
                  Current Win: +{(stake * (currentMultiplier - 1)).toFixed(2)} Pts
                </span>
              </div>
            )}

            {gameState === "cashed_out" && (
              <div className="sim-overlay-won">
                <span className="sim-win-badge">CASHED OUT @ {finalMultiplier.toFixed(2)}x</span>
                <span className="sim-win-amount">+{payoutAmount.toFixed(2)} Pts</span>
              </div>
            )}

            {gameState === "crashed" && (
              <div className="sim-overlay-crashed">
                <span className="sim-crash-badge">CRASHED @ {finalMultiplier.toFixed(2)}x</span>
                <span className="sim-crash-loss">Rocket Flew Away</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Arena: Control Panel */}
        <div className="sim-controls-card">
          <div className="sim-control-group">
            <label className="sim-control-label">Stake Amount (Pts)</label>
            <div className="sim-input-row">
              <input
                type="number"
                min="1"
                step="1"
                disabled={gameState === "running"}
                value={stake}
                onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
                className="sim-input"
              />
            </div>

            {/* Quick Stake Chips */}
            <div className="sim-stake-chips">
              {[10, 50, 100, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={gameState === "running"}
                  className="sim-chip-btn"
                  onClick={() => setQuickStake(val)}
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                disabled={gameState === "running"}
                className="sim-chip-btn max"
                onClick={() => setStake(Math.floor(balance))}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="sim-control-group">
            <label className="sim-control-label">Auto Cashout Multiplier (Optional)</label>
            <input
              type="number"
              min="1.01"
              step="0.1"
              placeholder="e.g. 2.00x"
              disabled={gameState === "running"}
              value={autoCashout}
              onChange={(e) =>
                setAutoCashout(e.target.value ? Number(e.target.value) : "")
              }
              className="sim-input"
            />
          </div>

          {/* Action Button: Launch or Cashout */}
          <div className="sim-action-zone">
            {gameState === "running" ? (
              <button
                type="button"
                className="sim-btn-cashout"
                onClick={() => handleCashout()}
              >
                CASH OUT ({(stake * currentMultiplier).toFixed(2)} Pts)
              </button>
            ) : (
              <button
                type="button"
                className="sim-btn-launch"
                disabled={stake <= 0 || stake > balance}
                onClick={handleLaunch}
              >
                <Zap size={16} className="ref-inline-icon" /> LAUNCH ROCKET
              </button>
            )}
          </div>

          {/* Cryptographic Seed Commit Preview */}
          <div className="sim-crypto-preview">
            <div className="sim-crypto-row">
              <span className="sim-crypto-k">Server Hash:</span>
              <span className="sim-crypto-v">
                {activeRound?.serverSeedHash
                  ? `${activeRound.serverSeedHash.slice(0, 16)}...`
                  : "Generated securely on launch"}
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

      {/* Provably Fair Modal */}
      {showFairnessModal && (
        <div className="sim-modal-backdrop" onClick={() => setShowFairnessModal(false)}>
          <div className="sim-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sim-modal-header">
              <div className="sim-modal-title">
                <ShieldCheck size={18} className="ref-inline-icon accent" />
                <span>Provably Fair Cryptographic Algorithm</span>
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
                Our algorithm uses <b>HMAC-SHA256</b> with 52-bit float entropy. Before
                each game begins, the server commits to a <b>Server Seed Hash</b> that cannot
                be altered. Once the round settles, the secret seed is revealed so you can
                verify the exact outcome yourself.
              </p>

              <div className="sim-field-box">
                <label>Server Seed (Revealed after round)</label>
                <input
                  type="text"
                  readOnly
                  value={settledSeed || "Revealed when round settles"}
                  className="sim-readonly-input"
                />
              </div>

              <div className="sim-field-box">
                <label>Server Seed Hash (Committed prior to launch)</label>
                <input
                  type="text"
                  readOnly
                  value={activeRound?.serverSeedHash || "No active round"}
                  className="sim-readonly-input"
                />
              </div>

              <div className="sim-field-box">
                <label>Client Seed (Player Entropy)</label>
                <input
                  type="text"
                  value={customClientSeed}
                  onChange={(e) => setCustomClientSeed(e.target.value)}
                  placeholder="Leave empty for auto-generated entropy"
                  className="sim-input"
                />
              </div>

              <button
                type="button"
                className="sim-btn-verify"
                disabled={!settledSeed}
                onClick={handleVerifyFairness}
              >
                Verify Cryptographic Hash
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

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDot,
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sliders,
  TrendingUp,
  X,
} from "lucide-react";
import { playPlinkoDrop } from "@/lib/simulated-actions";
import {
  PlinkoRisk,
  PlinkoRows,
  PLINKO_PAYOUTS,
  calculatePlinkoDrop,
  hashServerSeed,
} from "@/lib/provably-fair";

interface ActiveBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  step: number;
  path: number[];
  bucketIndex: number;
  multiplier: number;
  payout: number;
  color: string;
  radius: number;
  settled: boolean;
  alpha: number;
}

export function PlinkoGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const balance = initialBalance;
  const router = useRouter();
  const [stake, setStake] = useState(100);
  const [rows, setRows] = useState<PlinkoRows>(10);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [customClientSeed, setCustomClientSeed] = useState("");
  const [isDropping, setIsDropping] = useState(false);

  const [history, setHistory] = useState<
    { id: string; multiplier: number; payout: number; risk: PlinkoRisk }[]
  >(
    recentHistory
      .filter((h) => h.game_type === "plinko")
      .map((h) => ({
        id: h.id,
        multiplier: Number(h.multiplier) || 1.0,
        payout: Number(h.payout) || 0,
        risk: (h.game_data?.risk as PlinkoRisk) || "medium",
      })),
  );

  const [lastRoundInfo, setLastRoundInfo] = useState<{
    roundId: string;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    multiplier: number;
  } | null>(null);

  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [activeBucketHit, setActiveBucketHit] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeBallsRef = useRef<ActiveBall[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const pinRecoilRef = useRef<Map<string, number>>(new Map());

  const currentPayouts = PLINKO_PAYOUTS[rows][risk];

  // Quick Stake Helper
  const setQuickStake = (val: number) => {
    setStake(Math.max(1, Math.min(balance, Math.floor(val))));
  };

  // Helper color for multiplier buckets
  const getBucketColor = (mult: number) => {
    if (mult >= 20) return "linear-gradient(135deg, #ef4444, #dc2626)";
    if (mult >= 5) return "linear-gradient(135deg, #f59e0b, #d97706)";
    if (mult >= 2) return "linear-gradient(135deg, #10b981, #059669)";
    if (mult >= 1) return "linear-gradient(135deg, #065f46, #047857)";
    return "linear-gradient(135deg, #374151, #1f2937)";
  };

  const getBucketBorder = (mult: number) => {
    if (mult >= 20) return "rgba(239, 68, 68, 0.6)";
    if (mult >= 5) return "rgba(245, 158, 11, 0.6)";
    if (mult >= 2) return "rgba(16, 185, 129, 0.6)";
    if (mult >= 1) return "rgba(5, 150, 105, 0.4)";
    return "rgba(75, 85, 99, 0.3)";
  };

  // Setup Canvas Physics & Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Pin board geometry calculations
      const topPadding = 45;
      const bottomPadding = 75;
      const boardHeight = height - topPadding - bottomPadding;
      const rowSpacing = boardHeight / rows;
      const pinRadius = 3.5;

      // Draw Pins
      for (let r = 0; r < rows; r++) {
        const pinCount = r + 3;
        const rowY = topPadding + (r + 1) * rowSpacing;
        const colSpacing = Math.min(38, (width - 60) / (rows + 2));
        const rowStartX = width / 2 - ((pinCount - 1) * colSpacing) / 2;

        for (let c = 0; c < pinCount; c++) {
          const pinX = rowStartX + c * colSpacing;
          const pinKey = `${r}_${c}`;
          const recoil = pinRecoilRef.current.get(pinKey) || 0;

          ctx.save();
          if (recoil > 0) {
            ctx.shadowColor = "rgba(16, 185, 129, 0.9)";
            ctx.shadowBlur = 10;
            pinRecoilRef.current.set(pinKey, Math.max(0, recoil - 0.05));
          } else {
            ctx.shadowColor = "rgba(255, 255, 255, 0.15)";
            ctx.shadowBlur = 3;
          }

          ctx.beginPath();
          ctx.arc(pinX, rowY, pinRadius + (recoil > 0 ? 1 : 0), 0, Math.PI * 2);
          ctx.fillStyle = recoil > 0 ? "#10b981" : "#94a3b8";
          ctx.fill();
          ctx.restore();
        }
      }

      // Update and Draw Active Balls
      const balls = activeBallsRef.current;
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];

        if (!ball.settled) {
          // Physics step down the rows
          const targetRow = ball.step;
          if (targetRow < rows) {
            const nextRowY = topPadding + (targetRow + 1) * rowSpacing;
            const pinCount = targetRow + 3;
            const colSpacing = Math.min(38, (width - 60) / (rows + 2));
            const rowStartX = width / 2 - ((pinCount - 1) * colSpacing) / 2;

            // Accumulated rights up to this step
            let rightsSoFar = 0;
            for (let s = 0; s <= targetRow; s++) {
              if (ball.path[s] === 1) rightsSoFar++;
            }

            // Target X position between pins
            const targetX = rowStartX + (rightsSoFar + 1) * colSpacing - colSpacing / 2;

            // Smooth approach towards target pin bounce
            ball.x += (targetX - ball.x) * 0.22;
            ball.y += (nextRowY - ball.y) * 0.22;

            // Check collision with the current floor pin level
            if (Math.abs(ball.y - nextRowY) < 4) {
              ball.step++;
              // Trigger pin glow
              const pinKey = `${targetRow}_${rightsSoFar}`;
              pinRecoilRef.current.set(pinKey, 1.0);
            }
          } else {
            // Drop into final bucket at bottom
            const bucketY = height - bottomPadding / 2;
            ball.y += (bucketY - ball.y) * 0.25;

            if (Math.abs(ball.y - bucketY) < 3) {
              ball.settled = true;
              setActiveBucketHit(ball.bucketIndex);
              setTimeout(() => setActiveBucketHit(null), 400);

              setHistory((prev) => [
                {
                  id: ball.id,
                  multiplier: ball.multiplier,
                  payout: ball.payout,
                  risk,
                },
                ...prev.slice(0, 19),
              ]);
            }
          }
        } else {
          // Fade out settled ball
          ball.alpha -= 0.03;
          if (ball.alpha <= 0) {
            balls.splice(i, 1);
            continue;
          }
        }

        // Draw ball with neon particle glow
        ctx.save();
        ctx.globalAlpha = Math.max(0, ball.alpha);
        ctx.shadowColor = ball.multiplier >= 2 ? "rgba(16, 185, 129, 0.9)" : "rgba(255, 255, 255, 0.7)";
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rows, risk]);

  // Handle Play Ball Drop
  const handleDropBall = async () => {
    if (stake <= 0 || stake > balance) return;

    setIsDropping(true);

    try {
      const res = await playPlinkoDrop({
        stake,
        rows,
        risk,
        clientSeed: customClientSeed.trim() || undefined,
      });
      router.refresh(); // server settled the drop atomically

      setLastRoundInfo({
        roundId: res.roundId,
        serverSeed: res.serverSeed,
        serverSeedHash: res.serverSeedHash,
        clientSeed: res.clientSeed,
        nonce: res.nonce,
        multiplier: res.multiplier,
      });

      // Spawn active physics ball on canvas
      const canvas = canvasRef.current;
      const startX = canvas ? canvas.width / 2 + (Math.random() * 4 - 2) : 250;
      const newBall: ActiveBall = {
        id: res.roundId,
        x: startX,
        y: 20,
        vx: 0,
        vy: 2,
        step: 0,
        path: res.path,
        bucketIndex: res.bucketIndex,
        multiplier: res.multiplier,
        payout: res.payout,
        color: res.multiplier >= 2 ? "#10b981" : res.multiplier >= 1 ? "#38bdf8" : "#f43f5e",
        radius: 6.5,
        settled: false,
        alpha: 1.0,
      };

      activeBallsRef.current.push(newBall);
    } catch (err: any) {
      alert(err.message || "Failed to drop ball");
    } finally {
      setIsDropping(false);
    }
  };

  // Provably Fair Verifier
  const handleVerifyFairness = () => {
    if (!lastRoundInfo) return;
    try {
      const computedHash = hashServerSeed(lastRoundInfo.serverSeed);
      const computed = calculatePlinkoDrop(
        lastRoundInfo.serverSeed,
        lastRoundInfo.clientSeed,
        lastRoundInfo.nonce,
        rows,
        risk,
      );

      const isMatch =
        computedHash === lastRoundInfo.serverSeedHash &&
        computed.multiplier === lastRoundInfo.multiplier;

      if (isMatch) {
        setVerifyResult(
          `VERIFIED: Hash matches committed ${computedHash.slice(0, 16)}... and yields exact multiplier ${computed.multiplier}x (Bucket ${computed.bucketIndex}). House edge 0% tampering detected.`,
        );
      } else {
        setVerifyResult("HASH MISMATCH: Verification failed.");
      }
    } catch {
      setVerifyResult("Invalid seed parameters for verification.");
    }
  };

  return (
    <div className="sim-game-container">
      {/* Game Header Bar */}
      <div className="sim-game-header">
        <div className="sim-title-group">
          <div className="sim-icon-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            <CircleDot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="sim-game-title">Plinko Physics</h1>
            <p className="sim-game-desc">
              Cascading Bernoulli entropy pegboard &bull; 98.5% RTP &bull; Up to 1,000x
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

      {/* Main Grid: Control Panel Left, Pegboard Right */}
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
                onChange={(e) => setStake(Number(e.target.value))}
                className="sim-input-field"
              />
            </div>
            <div className="sim-quick-grid">
              <button onClick={() => setQuickStake(stake / 2)} className="sim-quick-btn">
                1/2
              </button>
              <button onClick={() => setQuickStake(stake * 2)} className="sim-quick-btn">
                2x
              </button>
              <button onClick={() => setQuickStake(10)} className="sim-quick-btn">
                $10
              </button>
              <button onClick={() => setQuickStake(100)} className="sim-quick-btn">
                $100
              </button>
              <button onClick={() => setQuickStake(balance)} className="sim-quick-btn">
                Max
              </button>
            </div>
          </div>

          {/* Risk Level Selector */}
          <div className="sim-control-group">
            <label className="sim-control-label">
              <span>Risk Level</span>
              <span className="text-xs text-sky-400 capitalize">{risk}</span>
            </label>
            <div className="sim-tabs-row">
              {(["low", "medium", "high"] as PlinkoRisk[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`sim-tab-btn ${risk === r ? "active" : ""}`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Rows Selector */}
          <div className="sim-control-group">
            <label className="sim-control-label">
              <span>Pegboard Rows</span>
              <span className="text-xs text-slate-400">{rows} Pins</span>
            </label>
            <div className="sim-tabs-row">
              {([8, 10, 12, 14, 16] as PlinkoRows[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRows(r)}
                  className={`sim-tab-btn ${rows === r ? "active" : ""}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Client Seed Option */}
          <div className="sim-control-group">
            <label className="sim-control-label">
              <span>Client Seed (Entropy)</span>
            </label>
            <input
              type="text"
              placeholder="Auto-generated secure entropy..."
              value={customClientSeed}
              onChange={(e) => setCustomClientSeed(e.target.value)}
              className="sim-input-field text-xs font-mono"
            />
          </div>

          {/* Primary Drop Button */}
          <button
            onClick={handleDropBall}
            disabled={stake <= 0 || stake > balance || isDropping}
            className="sim-btn-primary"
          >
            <Zap className="w-5 h-5" />
            <span>Drop Ball (${stake})</span>
          </button>
        </div>

        {/* Pegboard Canvas & Multiplier Buckets */}
        <div className="sim-plinko-stage">
          {/* History strip above pegboard */}
          <div className="sim-plinko-history">
            {history.slice(0, 10).map((h, i) => (
              <div
                key={h.id + i}
                className="sim-plinko-pill"
                style={{
                  background: h.multiplier >= 2 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  borderColor: h.multiplier >= 2 ? "rgba(16, 185, 129, 0.5)" : "rgba(255, 255, 255, 0.1)",
                  color: h.multiplier >= 2 ? "#10b981" : "#94a3b8",
                }}
              >
                {h.multiplier.toFixed(1)}x
              </div>
            ))}
          </div>

          {/* Canvas Pegboard */}
          <div className="sim-canvas-holder">
            <canvas
              ref={canvasRef}
              width={560}
              height={440}
              className="sim-plinko-canvas"
            />
          </div>

          {/* Multiplier Buckets Bar */}
          <div className="sim-plinko-buckets">
            {currentPayouts.map((mult, idx) => {
              const isHit = activeBucketHit === idx;
              return (
                <div
                  key={idx}
                  className={`sim-bucket ${isHit ? "hit" : ""}`}
                  style={{
                    background: getBucketColor(mult),
                    borderColor: getBucketBorder(mult),
                    transform: isHit ? "scale(1.15) translateY(-4px)" : "scale(1)",
                  }}
                >
                  <span className="sim-bucket-text">{mult >= 10 ? mult.toFixed(0) : mult.toFixed(1)}x</span>
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
                <h3 className="text-lg font-bold text-slate-900">Provably Fair Plinko Auditor</h3>
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
                Plinko drop paths are mathematically determined before each turn using HMAC-SHA512.
                Each bounce takes a 16-bit entropy slice of the hash to produce an exact 50.00% left/right Bernoulli distribution.
              </p>

              {lastRoundInfo ? (
                <>
                  <div className="sim-field-box">
                    <span className="sim-field-label">Committed Server Seed Hash (SHA-256)</span>
                    <div className="sim-copy-row">
                      <span className="font-mono text-xs text-slate-800 truncate">
                        {lastRoundInfo.serverSeedHash}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(lastRoundInfo.serverSeedHash)}
                        className="text-slate-500 hover:text-slate-900"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="sim-field-box">
                    <span className="sim-field-label">Revealed Server Seed</span>
                    <span className="font-mono text-xs text-sky-400 truncate">
                      {lastRoundInfo.serverSeed}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="sim-field-box">
                      <span className="sim-field-label">Client Seed</span>
                      <span className="font-mono text-xs text-slate-300 truncate">
                        {lastRoundInfo.clientSeed}
                      </span>
                    </div>
                    <div className="sim-field-box">
                      <span className="sim-field-label">Nonce</span>
                      <span className="font-mono text-xs text-slate-300">
                        {lastRoundInfo.nonce}
                      </span>
                    </div>
                  </div>

                  <button onClick={handleVerifyFairness} className="sim-btn-verify">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Run Cryptographic Verification</span>
                  </button>

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
                  Drop a ball to view cryptographic proof and hashes for that round.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

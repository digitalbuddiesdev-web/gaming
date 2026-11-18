"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  RotateCw,
  X,
  HelpCircle,
  Trophy,
  Coins,
  Crown,
  Volume2,
  VolumeX,
  Minus,
  Plus,
  LayoutGrid,
} from "lucide-react";
import { startSlotSpin } from "@/lib/simulated-actions";
import {
  calculateSlotSpin,
  hashServerSeed,
  SLOT_PAYTABLE,
  SLOT_PAYLINES,
  SLOT_REELS,
  type SlotSymbol,
  type SlotSpinResult,
} from "@/lib/provably-fair";

// Visual metadata for slot symbols (featuring Cherry Charm fruits & casino classics)
const SYMBOL_META: Record<
  SlotSymbol,
  { label: string; color: string; bg: string; border: string; emoji: string }
> = {
  CHERRY: {
    label: "CHERRY",
    color: "#f43f5e",
    bg: "radial-gradient(circle at 35% 35%, #ffe4e6 0%, #fecdd3 60%, #fda4af 100%)",
    border: "#f43f5e",
    emoji: "🍒",
  },
  APPLE: {
    label: "APPLE",
    color: "#65a30d",
    bg: "radial-gradient(circle at 35% 35%, #ecfccb 0%, #d9f99d 60%, #bef264 100%)",
    border: "#65a30d",
    emoji: "🍏",
  },
  BANANA: {
    label: "BANANA",
    color: "#eab308",
    bg: "radial-gradient(circle at 35% 35%, #fef9c3 0%, #fef08a 60%, #fde047 100%)",
    border: "#eab308",
    emoji: "🍌",
  },
  LEMON: {
    label: "LEMON",
    color: "#ca8a04",
    bg: "radial-gradient(circle at 35% 35%, #fef08a 0%, #fde047 60%, #facc15 100%)",
    border: "#ca8a04",
    emoji: "🍋",
  },
  WILD: {
    label: "WILD",
    color: "#b45309",
    bg: "radial-gradient(circle at 35% 35%, #fef3c7 0%, #fde68a 60%, #fcd34d 100%)",
    border: "#f59e0b",
    emoji: "👑",
  },
  SCATTER: {
    label: "SCATTER",
    color: "#7e22ce",
    bg: "radial-gradient(circle at 35% 35%, #f3e8ff 0%, #e9d5ff 60%, #d8b4fe 100%)",
    border: "#9333ea",
    emoji: "💎",
  },
  SEVEN: {
    label: "777",
    color: "#b91c1c",
    bg: "radial-gradient(circle at 35% 35%, #fee2e2 0%, #fecaca 60%, #fca5a5 100%)",
    border: "#dc2626",
    emoji: "🔥",
  },
  BELL: {
    label: "BELL",
    color: "#c2410c",
    bg: "radial-gradient(circle at 35% 35%, #ffedd5 0%, #fed7aa 60%, #fdba74 100%)",
    border: "#ea580c",
    emoji: "🔔",
  },
  BAR: {
    label: "BAR",
    color: "#1d4ed8",
    bg: "radial-gradient(circle at 35% 35%, #dbeafe 0%, #bfdbfe 60%, #93c5fd 100%)",
    border: "#2563eb",
    emoji: "🍫",
  },
  CLOVER: {
    label: "CLOVER",
    color: "#047857",
    bg: "radial-gradient(circle at 35% 35%, #d1fae5 0%, #a7f3d0 60%, #6ee7b7 100%)",
    border: "#059669",
    emoji: "🍀",
  },
  HORSESHOE: {
    label: "SHOE",
    color: "#0e7490",
    bg: "radial-gradient(circle at 35% 35%, #cffafe 0%, #a5f3fc 60%, #67e8f9 100%)",
    border: "#0891b2",
    emoji: "🧲",
  },
  ACE: {
    label: "ACE",
    color: "#334155",
    bg: "radial-gradient(circle at 35% 35%, #f1f5f9 0%, #e2e8f0 60%, #cbd5e1 100%)",
    border: "#64748b",
    emoji: "A",
  },
  KING: {
    label: "KING",
    color: "#334155",
    bg: "radial-gradient(circle at 35% 35%, #f1f5f9 0%, #e2e8f0 60%, #cbd5e1 100%)",
    border: "#64748b",
    emoji: "K",
  },
  QUEEN: {
    label: "QUEEN",
    color: "#334155",
    bg: "radial-gradient(circle at 35% 35%, #f1f5f9 0%, #e2e8f0 60%, #cbd5e1 100%)",
    border: "#64748b",
    emoji: "Q",
  },
};

const INITIAL_GRID: SlotSymbol[][] = [
  ["CHERRY", "APPLE", "BANANA", "LEMON", "CHERRY"],
  ["WILD", "SEVEN", "CHERRY", "WILD", "BELL"],
  ["APPLE", "BANANA", "SCATTER", "CHERRY", "LEMON"],
];

const ALL_SYMBOLS: SlotSymbol[] = [
  "CHERRY",
  "APPLE",
  "BANANA",
  "LEMON",
  "WILD",
  "SEVEN",
  "BELL",
  "BAR",
  "CLOVER",
  "SCATTER",
];

// Helper to generate dynamic intermediate symbols for the rolling strip
function getIntermediateSymbols(col: number, count: number): SlotSymbol[] {
  const reel = SLOT_REELS[col] || ALL_SYMBOLS;
  const start = Math.floor(Math.random() * reel.length);
  const result: SlotSymbol[] = [];
  for (let i = 0; i < count; i++) {
    result.push(reel[(start + i) % reel.length]);
  }
  return result;
}

// 20 Paylines SVG Path generator (unitless coordinate space matching viewBox="0 0 100 100")
function getPaylinePath(lineIndices: [number, number, number, number, number]): string {
  const xCoords = [10, 30, 50, 70, 90];
  const yCoords = [16.6, 50, 83.3];
  return lineIndices
    .map((row, col) => `${col === 0 ? "M" : "L"} ${xCoords[col]} ${yCoords[row]}`)
    .join(" ");
}

export function SlotGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [stake, setStake] = useState(50);
  const [customClientSeed, setCustomClientSeed] = useState("");

  // Sound Engine
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback(
    (type: "spin" | "stop" | "win" | "bigwin" | "coin") => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        if (type === "spin") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === "stop") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === "coin") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(987.77, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
        } else if (type === "win") {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
          });
        } else if (type === "bigwin") {
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.18, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.09);
            osc.stop(now + i * 0.09 + 0.4);
          });
        }
      } catch {
        // Audio non-fatal
      }
    },
    [soundEnabled, getAudioContext]
  );

  // Grid and Rolling Reel Strips state
  const [grid, setGrid] = useState<SlotSymbol[][]>(INITIAL_GRID);

  // Each reel column maintains a dynamic vertical strip of symbols
  const [reelStrips, setReelStrips] = useState<SlotSymbol[][]>([
    [INITIAL_GRID[0][0], INITIAL_GRID[1][0], INITIAL_GRID[2][0]],
    [INITIAL_GRID[0][1], INITIAL_GRID[1][1], INITIAL_GRID[2][1]],
    [INITIAL_GRID[0][2], INITIAL_GRID[1][2], INITIAL_GRID[2][2]],
    [INITIAL_GRID[0][3], INITIAL_GRID[1][3], INITIAL_GRID[2][3]],
    [INITIAL_GRID[0][4], INITIAL_GRID[1][4], INITIAL_GRID[2][4]],
  ]);

  // Transform offsets (in px) and transition styles for each of the 5 reels
  const [reelOffsets, setReelOffsets] = useState<number[]>([0, 0, 0, 0, 0]);
  const [reelTransitions, setReelTransitions] = useState<string[]>([
    "none",
    "none",
    "none",
    "none",
    "none",
  ]);

  // DOM ref to calculate exact rendered cell height on any device
  const drumStageRef = useRef<HTMLDivElement>(null);

  // Spinning states
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [highlightPositions, setHighlightPositions] = useState<[number, number][]>([]);

  // Cherry Charm Lines Bars Toggle
  const [showBars, setShowBars] = useState(false);

  // Auto-spin
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const autoSpinRef = useRef(false);

  // Modals
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFairnessModal, setShowFairnessModal] = useState(false);

  // Fairness audit tool state
  const [auditServerSeed, setAuditServerSeed] = useState("");
  const [auditClientSeed, setAuditClientSeed] = useState("");
  const [auditNonce, setAuditNonce] = useState(1);
  const [auditResult, setAuditResult] = useState<any>(null);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  // Measure rendered cell height dynamically
  const getCellHeight = useCallback(() => {
    if (drumStageRef.current) {
      const firstCell = drumStageRef.current.querySelector(".slot-symbol-cell");
      if (firstCell && firstCell.clientHeight > 0) {
        return firstCell.clientHeight;
      }
    }
    // Fallback: 76px on desktop, 60px on mobile
    return typeof window !== "undefined" && window.innerWidth <= 600 ? 60 : 76;
  }, []);

  // Execute a single spin with continuous, realistic rolling wheel motion
  const handleSpin = useCallback(async () => {
    if (isSpinning || stake <= 0 || stake > balance) return;

    try {
      setIsSpinning(true);
      setHighlightPositions([]);
      setLastPayout(null);

      // 1. Play initial spin sound
      playSound("spin");
      const spinAudioInterval = setInterval(() => {
        playSound("spin");
      }, 110);

      // 2. Call cryptographic server action
      const res = await startSlotSpin({
        stake,
        clientSeed: customClientSeed.trim() || undefined,
      });

      // Debit stake from client balance immediately
      setBalance(res.newBalance - res.payout);

      const targetGrid = res.slotResult.grid;
      const cellHeight = getCellHeight();

      // 3. Construct 5 rolling strips with escalating lengths for staggered stops
      // Reel 0: 18 rolls | Reel 1: 24 rolls | Reel 2: 30 rolls | Reel 3: 36 rolls | Reel 4: 42 rolls
      const rollCounts = [18, 24, 30, 36, 42];
      const durations = [1100, 1400, 1700, 2000, 2300];

      const newStrips: SlotSymbol[][] = [];
      const targetOffsets: number[] = [];

      for (let c = 0; c < 5; c++) {
        const current3 = [grid[0][c], grid[1][c], grid[2][c]];
        const intermediates = getIntermediateSymbols(c, rollCounts[c]);
        const target3 = [targetGrid[0][c], targetGrid[1][c], targetGrid[2][c]];

        const strip = [...current3, ...intermediates, ...target3];
        newStrips.push(strip);

        // Target offset to display the final 3 symbols: (totalSymbols - 3) * cellHeight
        const offsetPx = (strip.length - 3) * cellHeight;
        targetOffsets.push(offsetPx);
      }

      // Step A: Load the new long strip into DOM at offset 0 (no transition)
      setReelStrips(newStrips);
      setReelOffsets([0, 0, 0, 0, 0]);
      setReelTransitions(["none", "none", "none", "none", "none"]);

      // Step B: Trigger the rolling motion in next tick with cubic-bezier brake recoil
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const transitions = durations.map(
            (ms) => `transform ${ms}ms cubic-bezier(0.12, 0.8, 0.32, 1.12)`
          );
          setReelTransitions(transitions);
          setReelOffsets(targetOffsets);
        });
      });

      // Step C: Play stop sound for each reel as it locks in
      durations.forEach((ms, reelIdx) => {
        setTimeout(() => {
          playSound("stop");
        }, ms);
      });

      // Step D: When the final reel finishes rolling
      const finalDuration = durations[4] + 120;
      setTimeout(() => {
        clearInterval(spinAudioInterval);
        setIsSpinning(false);
        setGrid(targetGrid);

        // Snap reel strips back to clean 3-symbol arrays at offset 0 without transition
        setReelStrips([
          [targetGrid[0][0], targetGrid[1][0], targetGrid[2][0]],
          [targetGrid[0][1], targetGrid[1][1], targetGrid[2][1]],
          [targetGrid[0][2], targetGrid[1][2], targetGrid[2][2]],
          [targetGrid[0][3], targetGrid[1][3], targetGrid[2][3]],
          [targetGrid[0][4], targetGrid[1][4], targetGrid[2][4]],
        ]);
        setReelTransitions(["none", "none", "none", "none", "none"]);
        setReelOffsets([0, 0, 0, 0, 0]);

        setLastResult(res.slotResult);
        setLastPayout(res.payout);
        setBalance(res.newBalance);

        // Compute winning symbol positions to highlight
        const winPositions: [number, number][] = [];
        res.slotResult.winningLines.forEach((hit) => {
          hit.positions.forEach((pos) => {
            if (!winPositions.some(([r, c]) => r === pos[0] && c === pos[1])) {
              winPositions.push(pos);
            }
          });
        });

        // Scatter win highlights
        if (res.slotResult.scatterCount >= 3) {
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 5; c++) {
              if (targetGrid[r][c] === "SCATTER") {
                if (!winPositions.some(([pr, pc]) => pr === r && pc === c)) {
                  winPositions.push([r, c]);
                }
              }
            }
          }
        }

        setHighlightPositions(winPositions);

        // Victory audio fanfares
        if (res.slotResult.totalMultiplier >= 10) {
          playSound("bigwin");
        } else if (res.slotResult.totalMultiplier > 0) {
          playSound("win");
        }

        // Seed audit fields for transparency
        setAuditServerSeed(res.slotResult.serverSeed);
        setAuditClientSeed(res.slotResult.clientSeed);
        setAuditNonce(res.slotResult.nonce);

        // Auto spin continuation
        if (autoSpinRef.current) {
          setAutoSpinCount((prev) => {
            const next = prev - 1;
            if (next > 0) {
              setTimeout(handleSpin, 700);
            } else {
              autoSpinRef.current = false;
            }
            return Math.max(0, next);
          });
        }

        router.refresh();
      }, finalDuration);
    } catch (err: any) {
      setIsSpinning(false);
      autoSpinRef.current = false;
      setAutoSpinCount(0);
      alert(err.message || "Failed to spin slots");
    }
  }, [
    isSpinning,
    stake,
    balance,
    customClientSeed,
    grid,
    getCellHeight,
    playSound,
    router,
  ]);

  // Spacebar Hotkey Listener (inspired by Cherry Charm)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !showHelpModal &&
        !showFairnessModal &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSpin, showHelpModal, showFairnessModal]);

  const startAutoSpin = (count: number) => {
    if (isSpinning) return;
    autoSpinRef.current = true;
    setAutoSpinCount(count);
    handleSpin();
  };

  const stopAutoSpin = () => {
    autoSpinRef.current = false;
    setAutoSpinCount(0);
  };

  const adjustStake = (delta: number) => {
    if (isSpinning || autoSpinCount > 0) return;
    setStake((prev) => Math.max(1, Math.min(Math.floor(balance), prev + delta)));
  };

  const verifyAudit = () => {
    try {
      if (!auditServerSeed || !auditClientSeed || auditNonce <= 0) return;
      const hash = hashServerSeed(auditServerSeed);
      const res = calculateSlotSpin(auditServerSeed, auditClientSeed, auditNonce);
      setAuditResult({
        serverSeedHash: hash,
        spinResult: res,
      });
    } catch (err: any) {
      alert(err.message || "Verification failed");
    }
  };

  return (
    <div className="sim-game-wrapper">
      {/* Header Banner */}
      <div className="sim-game-header">
        <div className="sim-header-titles">
          <div className="sim-game-badge">
            <Sparkles size={16} className="text-sky-400 inline mr-1" />
            3D CYLINDRICAL DRUM WHEELS · MOTION PHYSICS
          </div>
          <h1 className="sim-game-name">Cherry Charm · Apex Slots</h1>
          <p className="sim-game-sub">
            20 Fixed Paylines · 🍒 Cherries, 🍏 Apples, 🍌 Bananas, 🍋 Lemons · Provably Fair HMAC-SHA512
          </p>
        </div>

        <div className="sim-meta-chips">
          <div className="sim-chip">
            <span className="sim-chip-k">Balance:</span>
            <span className="sim-chip-v">{balance.toFixed(2)} Pts</span>
          </div>

          {/* Sound Toggle (inspired by Cherry Charm) */}
          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Game Audio" : "Enable Game Audio"}
          >
            {soundEnabled ? (
              <>
                <Volume2 size={14} className="text-sky-400 inline mr-1" /> Audio On
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-slate-400 inline mr-1" /> Audio Muted
              </>
            )}
          </button>

          {/* Lines Bars Toggle */}
          <button
            type="button"
            className={`sim-fair-btn ${showBars ? "active-chip" : ""}`}
            onClick={() => setShowBars(!showBars)}
            title="Toggle Payline Indicator Ribbons"
          >
            <LayoutGrid size={14} className="ref-inline-icon" /> {showBars ? "Hide" : "Show"} Bars
          </button>

          {/* Help Modal Button */}
          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setShowHelpModal(true)}
          >
            <HelpCircle size={14} className="ref-inline-icon" /> Rules &amp; Paytable
          </button>

          {/* Provably Fair Modal */}
          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setShowFairnessModal(true)}
          >
            <ShieldCheck size={14} className="ref-inline-icon" /> Provably Fair
          </button>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="sim-arena-grid">
        {/* Left: 3D Cylindrical Drum Slot Cabinet */}
        <div className="slot-machine-cabinet">
          {/* Top Marquee / Win Banner */}
          <div className="slot-marquee-bar">
            {lastResult && lastPayout !== null && lastPayout > 0 ? (
              <div className="slot-win-marquee">
                <Trophy size={20} className="text-amber-400" />
                <span className="slot-win-amount">
                  WIN: +{lastPayout.toFixed(2)} Pts ({lastResult.totalMultiplier.toFixed(2)}x)
                </span>
                {lastResult.totalMultiplier >= 20 ? (
                  <span className="slot-big-win-tag mega">MEGA WIN!</span>
                ) : lastResult.totalMultiplier >= 5 ? (
                  <span className="slot-big-win-tag">BIG WIN!</span>
                ) : null}
              </div>
            ) : (
              <div className="slot-standby-marquee">
                <Coins size={16} className="text-sky-400" />
                <span>20 FIXED PAYLINES · MATCH 3+ IDENTICAL SYMBOLS FROM LEFT TO RIGHT</span>
              </div>
            )}
          </div>

          {/* 3D Cylindrical Drum Reels Viewport */}
          <div className="slot-reels-viewport cylindrical-3d">
            {/* Top and Bottom Cylindrical Vignette Shadows for 3D depth */}
            <div className="drum-cylindrical-vignette" />

            {/* SVG Payline Overlay Ribbons */}
            {(showBars || (lastResult && lastResult.winningLines.length > 0 && !isSpinning)) && (
              <svg className="slot-paylines-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                {showBars &&
                  SLOT_PAYLINES.map((line, idx) => (
                    <path
                      key={idx}
                      d={getPaylinePath(line)}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="0.8"
                      strokeDasharray="2, 2"
                    />
                  ))}
                {lastResult &&
                  !isSpinning &&
                  lastResult.winningLines.map((hit) => {
                    const lineIndices = SLOT_PAYLINES[hit.lineIndex - 1];
                    if (!lineIndices) return null;
                    return (
                      <path
                        key={`win-${hit.lineIndex}`}
                        d={getPaylinePath(lineIndices)}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="2.4"
                        className="winning-payline-glow"
                      />
                    );
                  })}
              </svg>
            )}

            {/* 5 Spinning Cylindrical Drum Wheels */}
            <div ref={drumStageRef} className="slot-reels-stage drums-stage">
              {Array.from({ length: 5 }, (_, colIdx) => {
                const strip = reelStrips[colIdx] || [];
                const offset = reelOffsets[colIdx] || 0;
                const transition = reelTransitions[colIdx] || "none";

                return (
                  <div key={colIdx} className="slot-reel-drum">
                    {/* Chrome Top & Bottom Rim Lids */}
                    <div className="drum-rim-top" />
                    <div className="drum-rim-bot" />

                    {/* Continuous Moving Tape Track */}
                    <div
                      className="slot-reel-track"
                      style={{
                        transform: `translateY(-${offset}px)`,
                        transition,
                      }}
                    >
                      {strip.map((symbol, itemIdx) => {
                        const meta = SYMBOL_META[symbol] || SYMBOL_META.ACE;

                        // Check if this symbol in the final 3 rows is a winner
                        const isFinalThree = itemIdx >= strip.length - 3;
                        const rowIdxInGrid = itemIdx - (strip.length - 3);
                        const isWinning =
                          !isSpinning &&
                          isFinalThree &&
                          highlightPositions.some(
                            ([r, c]) => r === rowIdxInGrid && c === colIdx
                          );

                        return (
                          <div
                            key={itemIdx}
                            className={`slot-symbol-cell ${isWinning ? "cell-winning" : ""}`}
                            style={{
                              borderColor: isWinning ? meta.border : undefined,
                            }}
                          >
                            <div
                              className="slot-symbol-inner symbol-3d"
                              style={{
                                background: meta.bg,
                                border: `1.5px solid ${meta.border}`,
                                color: meta.color,
                              }}
                            >
                              <span className="slot-symbol-emoji">{meta.emoji}</span>
                              <span className="slot-symbol-text">{meta.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payline Hit Tags below grid */}
            {lastResult && lastResult.winningLines.length > 0 && !isSpinning && (
              <div className="slot-winning-lines-list">
                {lastResult.winningLines.map((hit, idx) => (
                  <span key={idx} className="slot-line-tag">
                    Line {hit.lineIndex}: {hit.count}x {hit.symbol} ({hit.multiplier}x)
                  </span>
                ))}
                {lastResult.scatterMultiplier > 0 && (
                  <span className="slot-line-tag scatter">
                    {lastResult.scatterCount}x SCATTER ({lastResult.scatterMultiplier}x)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls Panel (Cherry Charm arcade controls) */}
        <div className="sim-controls-card">
          <div className="sim-control-group">
            <div className="flex items-center justify-between">
              <label className="sim-control-label">Bet Size (Pts)</label>
              <span className="text-xs text-slate-500 font-mono">
                Min 1 · Max {Math.floor(balance)}
              </span>
            </div>

            {/* Stepper Input with - and + buttons */}
            <div className="slot-bet-stepper">
              <button
                type="button"
                disabled={isSpinning || autoSpinCount > 0 || stake <= 1}
                className="slot-stepper-btn"
                onClick={() => adjustStake(-10)}
                title="Decrease Bet by 10"
              >
                <Minus size={16} />
              </button>

              <input
                type="number"
                min="1"
                step="1"
                disabled={isSpinning || autoSpinCount > 0}
                value={stake}
                onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
                className="sim-input text-center font-bold text-base"
              />

              <button
                type="button"
                disabled={isSpinning || autoSpinCount > 0 || stake >= balance}
                className="slot-stepper-btn"
                onClick={() => adjustStake(10)}
                title="Increase Bet by 10"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="sim-stake-chips">
              {[10, 50, 100, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={isSpinning || autoSpinCount > 0}
                  className="sim-chip-btn"
                  onClick={() => setStake(val)}
                >
                  {val}
                </button>
              ))}
              <button
                type="button"
                disabled={isSpinning || autoSpinCount > 0}
                className="sim-chip-btn"
                onClick={() => setStake(Math.max(1, Math.floor(stake / 2)))}
              >
                1/2
              </button>
              <button
                type="button"
                disabled={isSpinning || autoSpinCount > 0}
                className="sim-chip-btn"
                onClick={() => setStake(Math.min(Math.floor(balance), stake * 2))}
              >
                2x
              </button>
              <button
                type="button"
                disabled={isSpinning || autoSpinCount > 0}
                className="sim-chip-btn"
                onClick={() => setStake(Math.floor(balance))}
              >
                Max
              </button>
            </div>
          </div>

          {/* Action Buttons with 3D Beveled Cherry Charm Pushbutton */}
          <div className="sim-actions-stack">
            {autoSpinCount > 0 ? (
              <button
                type="button"
                onClick={stopAutoSpin}
                className="cherry-arcade-btn stop"
              >
                STOP AUTO SPIN ({autoSpinCount} left)
              </button>
            ) : (
              <button
                type="button"
                disabled={isSpinning || stake > balance}
                onClick={handleSpin}
                className="cherry-arcade-btn sim-play-btn spin"
              >
                {isSpinning ? (
                  <>
                    <RotateCw className="animate-spin inline mr-2" size={20} />
                    SPINNING...
                  </>
                ) : (
                  <>
                    <span className="cherry-btn-text">SPIN</span>
                    <span className="cherry-space-badge">SPACE</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Auto-Spin chips */}
            {autoSpinCount === 0 && (
              <div className="slot-auto-spin-row">
                <span className="slot-auto-spin-label">Auto Spin:</span>
                {[5, 10, 25, 50].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    disabled={isSpinning}
                    className="slot-auto-chip"
                    onClick={() => startAutoSpin(cnt)}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client Seed Customizer */}
          <div className="sim-control-group" style={{ marginTop: 16 }}>
            <label className="sim-control-label">Client Seed (Optional)</label>
            <input
              type="text"
              placeholder="Custom entropy for HMAC-SHA512"
              disabled={isSpinning || autoSpinCount > 0}
              value={customClientSeed}
              onChange={(e) => setCustomClientSeed(e.target.value)}
              className="sim-input"
            />
          </div>
        </div>
      </div>

      {/* Cherry Charm Instructions & Paytable Modal */}
      {showHelpModal && (
        <div className="sim-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div
            className="sim-modal-dialog"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sim-modal-head">
              <div className="sim-modal-title">
                <HelpCircle size={18} className="text-sky-400" />
                Cherry Charm · Rules &amp; Paytable
              </div>
              <button
                type="button"
                className="sim-modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sim-modal-body">
              <div className="cherry-instructions-box">
                <p>• Click on the <strong>SPIN</strong> button or press <strong>SPACE</strong> to spin.</p>
                <p>• Matches count consecutively from left to right along 20 fixed paylines.</p>
                <p>• Toggle <strong>Show/Hide Bars</strong> to view active payline path ribbons across the reels.</p>
                <p>• <strong>WILD (👑)</strong> substitutes for all symbols on paylines except SCATTER.</p>
                <p>• <strong>SCATTER (💎)</strong> pays anywhere on the screen (3+ awards up to 50x total stake).</p>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, margin: "14px 0 8px 0" }}>
                Winning Combinations &amp; Multipliers
              </h4>
              <div className="slot-paytable-grid">
                {Object.entries(SLOT_PAYTABLE).map(([sym, payouts]) => {
                  const meta = SYMBOL_META[sym as SlotSymbol] || SYMBOL_META.ACE;
                  return (
                    <div key={sym} className="slot-paytable-card">
                      <div className="slot-paytable-sym-badge" style={{ color: meta.color }}>
                        <span className="mr-1">{meta.emoji}</span>
                        {meta.label}
                      </div>
                      <div className="slot-paytable-payouts">
                        <div>3 in a row: <strong>{payouts[3]}x</strong></div>
                        <div>4 in a row: <strong>{payouts[4]}x</strong></div>
                        <div>5 in a row: <strong>{payouts[5]}x</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fairness Modal */}
      {showFairnessModal && (
        <div className="sim-modal-overlay" onClick={() => setShowFairnessModal(false)}>
          <div
            className="sim-modal-dialog"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sim-modal-head">
              <div className="sim-modal-title">
                <ShieldCheck size={18} className="text-sky-400" />
                Apex Slots Provably Fair Auditor
              </div>
              <button
                type="button"
                className="sim-modal-close"
                onClick={() => setShowFairnessModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sim-modal-body">
              <p className="sim-fair-explainer">
                Every spin is deterministically generated using an HMAC-SHA512 hash computed from the
                operator's secret Server Seed, the Player's Client Seed, and the incremental Nonce.
                Reel stops are derived via 4-byte chunk modulo arithmetic across 5 balanced 64-stop
                virtual strips.
              </p>

              <div className="sim-audit-form">
                <div className="sim-control-group">
                  <label className="sim-control-label">Server Seed (Revealed post-round)</label>
                  <input
                    type="text"
                    className="sim-input"
                    value={auditServerSeed}
                    onChange={(e) => setAuditServerSeed(e.target.value)}
                    placeholder="Enter revealed 64-char hex server seed"
                  />
                </div>

                <div className="sim-control-group">
                  <label className="sim-control-label">Client Seed</label>
                  <input
                    type="text"
                    className="sim-input"
                    value={auditClientSeed}
                    onChange={(e) => setAuditClientSeed(e.target.value)}
                    placeholder="Enter client seed"
                  />
                </div>

                <div className="sim-control-group">
                  <label className="sim-control-label">Nonce</label>
                  <input
                    type="number"
                    min="1"
                    className="sim-input"
                    value={auditNonce}
                    onChange={(e) => setAuditNonce(Number(e.target.value) || 1)}
                  />
                </div>

                <button
                  type="button"
                  className="sim-play-btn"
                  onClick={verifyAudit}
                  style={{ marginTop: 8 }}
                >
                  Verify Spin Cryptography
                </button>
              </div>

              {auditResult && (
                <div className="sim-audit-result" style={{ marginTop: 16 }}>
                  <div className="sim-audit-row">
                    <span className="sim-audit-k">SHA-256 Hash of Server Seed:</span>
                    <span className="sim-audit-v">{auditResult.serverSeedHash}</span>
                  </div>
                  <div className="sim-audit-row">
                    <span className="sim-audit-k">Computed Reel Stops:</span>
                    <span className="sim-audit-v">
                      [{auditResult.spinResult.reelStops.join(", ")}]
                    </span>
                  </div>
                  <div className="sim-audit-row">
                    <span className="sim-audit-k">Total Multiplier:</span>
                    <span className="sim-audit-v font-bold text-sky-400">
                      {auditResult.spinResult.totalMultiplier}x
                    </span>
                  </div>
                  <div className="sim-audit-row">
                    <span className="sim-audit-k">Winning Paylines:</span>
                    <span className="sim-audit-v">
                      {auditResult.spinResult.winningLines.length > 0
                        ? auditResult.spinResult.winningLines
                            .map((l: any) => `Line ${l.lineIndex} (${l.count}x ${l.symbol})`)
                            .join("; ")
                        : "No winning paylines"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent History Table */}
      <div className="sim-history-section">
        <h3 className="sim-history-title">Recent Matrix Spins</h3>
        <div className="sim-history-table-wrapper">
          <table className="sim-history-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Stake</th>
                <th>Multiplier</th>
                <th>Payout</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-slate-400">
                    No recent slot spins recorded yet. Spin the reels to start!
                  </td>
                </tr>
              ) : (
                recentHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.created_at).toLocaleTimeString()}</td>
                    <td>{Number(item.stake).toFixed(2)} Pts</td>
                    <td className="font-semibold text-sky-400">
                      {Number(item.multiplier).toFixed(2)}x
                    </td>
                    <td>{Number(item.payout).toFixed(2)} Pts</td>
                    <td>
                      <span
                        className={`sim-history-badge ${
                          item.status === "won" ? "won" : "lost"
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

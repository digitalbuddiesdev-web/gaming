"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  Trophy,
  Coins,
  RotateCcw,
  Volume2,
  VolumeX,
  Trash2,
  Copy,
  Flame,
  Snowflake,
  Undo2,
  BarChart3,
  Layers,
} from "lucide-react";
import { startRouletteSpin } from "@/lib/simulated-actions";
import {
  ROULETTE_NUMBERS,
  ROULETTE_RED_NUMBERS,
  getRoulettePocket,
  calculateRouletteSpin,
  type RouletteBet,
  type RouletteBetType,
  type RouletteColor,
  type RoulettePocket,
} from "@/lib/provably-fair";

// Casino Chip definitions with realistic 3D styling
const CHIP_VALUES = [
  { val: 10, label: "10", bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" },
  { val: 50, label: "50", bg: "#dc2626", border: "#b91c1c", text: "#ffffff" },
  { val: 100, label: "100", bg: "#059669", border: "#047857", text: "#ffffff" },
  { val: 500, label: "500", bg: "#0f172a", border: "#fbbf24", text: "#fbbf24" },
  { val: 1000, label: "1K", bg: "#d97706", border: "#f59e0b", text: "#ffffff" },
];

// French Call Bet Number Groups
const FRENCH_CALL_BETS = {
  voisins: {
    name: "Voisins du Zéro",
    numbers: [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25],
    count: 17,
  },
  tiers: {
    name: "Tiers du Cylindre",
    numbers: [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
    count: 12,
  },
  orphelins: {
    name: "Orphelins",
    numbers: [1, 20, 14, 31, 9, 17, 34, 6],
    count: 8,
  },
  zeroSpiel: {
    name: "Jeu Zéro",
    numbers: [12, 35, 3, 26, 0, 32, 15],
    count: 7,
  },
};

// Pre-computed mathematical SVG sectors for 37 pockets
function useRouletteSectors() {
  return useMemo(() => {
    const cx = 200;
    const cy = 200;
    const rOut = 158;
    const rIn = 104;
    const degPerPocket = 360 / 37;
    const halfDeg = degPerPocket / 2;

    return ROULETTE_NUMBERS.map((num, i) => {
      const midDeg = i * degPerPocket;
      const a1 = (midDeg - halfDeg - 90) * (Math.PI / 180);
      const a2 = (midDeg + halfDeg - 90) * (Math.PI / 180);

      const x1 = (cx + rOut * Math.cos(a1)).toFixed(2);
      const y1 = (cy + rOut * Math.sin(a1)).toFixed(2);
      const x2 = (cx + rOut * Math.cos(a2)).toFixed(2);
      const y2 = (cy + rOut * Math.sin(a2)).toFixed(2);
      const x3 = (cx + rIn * Math.cos(a2)).toFixed(2);
      const y3 = (cy + rIn * Math.sin(a2)).toFixed(2);
      const x4 = (cx + rIn * Math.cos(a1)).toFixed(2);
      const y4 = (cy + rIn * Math.sin(a1)).toFixed(2);

      const d = `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
      const isRed = ROULETTE_RED_NUMBERS.has(num);
      const color = num === 0 ? "#059669" : isRed ? "#dc2626" : "#0f172a";

      const textR = 131;
      const textAngle = (midDeg - 90) * (Math.PI / 180);
      const tx = (cx + textR * Math.cos(textAngle)).toFixed(2);
      const ty = (cy + textR * Math.sin(textAngle)).toFixed(2);

      return { num, d, color, tx, ty, midDeg, x1, y1, x4, y4 };
    });
  }, []);
}

// 3D Placed Chip Component
function PlacedChipBadge({ amount }: { amount: number }) {
  if (amount <= 0) return null;

  // Determine chip style based on value
  const chipStyle =
    amount >= 1000
      ? { bg: "#d97706", border: "#f59e0b", text: "#ffffff" }
      : amount >= 500
      ? { bg: "#0f172a", border: "#fbbf24", text: "#fbbf24" }
      : amount >= 100
      ? { bg: "#059669", border: "#047857", text: "#ffffff" }
      : amount >= 50
      ? { bg: "#dc2626", border: "#b91c1c", text: "#ffffff" }
      : { bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" };

  return (
    <div
      className="table-placed-chip"
      style={{
        backgroundColor: chipStyle.bg,
        borderColor: chipStyle.border,
        color: chipStyle.text,
      }}
    >
      <span className="placed-chip-val">
        {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
      </span>
    </div>
  );
}

export function RouletteGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const router = useRouter();
  const sectors = useRouletteSectors();

  const [balance, setBalance] = useState(initialBalance);
  const [selectedChipVal, setSelectedChipVal] = useState(50);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [betHistoryStack, setBetHistoryStack] = useState<RouletteBet[][]>([]);
  const [lastBets, setLastBets] = useState<RouletteBet[]>([]);
  const [customClientSeed, setCustomClientSeed] = useState("");

  // Hovered spot for table visual preview
  const [hoveredSpot, setHoveredSpot] = useState<{
    type: RouletteBetType;
    target?: number;
  } | null>(null);

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
    (type: "spin" | "chip" | "ball" | "win" | "loss") => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === "chip") {
          [1600, 2400].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.02);
            gain.gain.setValueAtTime(0.12, now + idx * 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.02);
            osc.stop(now + idx * 0.02 + 0.06);
          });
        } else if (type === "spin") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.linearRampToValueAtTime(320, now + 0.6);
          osc.frequency.exponentialRampToValueAtTime(80, now + 3.4);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 3.4);
        } else if (type === "ball") {
          [0, 0.1, 0.19, 0.27, 0.34, 0.4, 0.45].forEach((t, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1300 - i * 90, now + t);
            gain.gain.setValueAtTime(0.16 - i * 0.02, now + t);
            gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + t);
            osc.stop(now + t + 0.04);
          });
        } else if (type === "win") {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.15, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
          });
        } else if (type === "loss") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        }
      } catch {
        // Audio non-fatal
      }
    },
    [soundEnabled, getAudioContext],
  );

  // Wheel Animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [winningPocket, setWinningPocket] = useState<RoulettePocket | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);

  // Wheel History & Statistics
  const [historyPockets, setHistoryPockets] = useState<RoulettePocket[]>(() => {
    // Seed with realistic initial spins
    return [32, 15, 19, 4, 21, 2, 25, 17, 34, 6].map((n) => getRoulettePocket(n));
  });

  // Modals
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Audit state
  const [auditServerSeed, setAuditServerSeed] = useState("");
  const [auditClientSeed, setAuditClientSeed] = useState("");
  const [auditNonce, setAuditNonce] = useState(1);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  // Total Stake calculation
  const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);

  // Add or increment bet on a specific spot
  const placeBet = (type: RouletteBetType, target?: number) => {
    if (isSpinning) return;
    playSound("chip");

    setBets((prev) => {
      setBetHistoryStack((stack) => [...stack, prev]);
      const idx = prev.findIndex((b) => b.type === type && b.target === target);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], stake: next[idx].stake + selectedChipVal };
        return next;
      } else {
        return [...prev, { type, target, stake: selectedChipVal }];
      }
    });
  };

  // Place a French Call Bet group
  const placeCallBet = (key: keyof typeof FRENCH_CALL_BETS) => {
    if (isSpinning) return;
    const group = FRENCH_CALL_BETS[key];
    playSound("chip");

    setBets((prev) => {
      setBetHistoryStack((stack) => [...stack, prev]);
      const next = [...prev];
      for (const num of group.numbers) {
        const idx = next.findIndex((b) => b.type === "straight" && b.target === num);
        if (idx >= 0) {
          next[idx] = { ...next[idx], stake: next[idx].stake + selectedChipVal };
        } else {
          next.push({ type: "straight", target: num, stake: selectedChipVal });
        }
      }
      return next;
    });
  };

  const undoLastBet = () => {
    if (isSpinning || betHistoryStack.length === 0) return;
    playSound("chip");
    const prev = betHistoryStack[betHistoryStack.length - 1];
    setBets(prev);
    setBetHistoryStack((stack) => stack.slice(0, -1));
  };

  const clearBets = () => {
    if (isSpinning || bets.length === 0) return;
    playSound("chip");
    setBetHistoryStack((stack) => [...stack, bets]);
    setBets([]);
  };

  const doubleBets = () => {
    if (isSpinning || bets.length === 0) return;
    playSound("chip");
    setBetHistoryStack((stack) => [...stack, bets]);
    setBets((prev) => prev.map((b) => ({ ...b, stake: b.stake * 2 })));
  };

  const repeatLastBets = () => {
    if (isSpinning || lastBets.length === 0) return;
    playSound("chip");
    setBetHistoryStack((stack) => [...stack, bets]);
    setBets(lastBets);
  };

  // Get total stake placed on a spot for display
  const getSpotStake = (type: RouletteBetType, target?: number): number => {
    const bet = bets.find((b) => b.type === type && b.target === target);
    return bet ? bet.stake : 0;
  };

  // Hover Covered Numbers Set for Visual Felt Illumination
  const coveredNumbers = useMemo(() => {
    if (!hoveredSpot) return new Set<number>();
    const { type, target } = hoveredSpot;
    if (type === "straight" && target !== undefined) return new Set([target]);

    const set = new Set<number>();
    for (let i = 1; i <= 36; i++) {
      const p = getRoulettePocket(i);
      if (type === "red" && p.color === "red") set.add(i);
      else if (type === "black" && p.color === "black") set.add(i);
      else if (type === "even" && p.isEven) set.add(i);
      else if (type === "odd" && !p.isEven) set.add(i);
      else if (type === "low" && !p.isHigh) set.add(i);
      else if (type === "high" && p.isHigh) set.add(i);
      else if (type === "dozen_1" && p.dozen === 1) set.add(i);
      else if (type === "dozen_2" && p.dozen === 2) set.add(i);
      else if (type === "dozen_3" && p.dozen === 3) set.add(i);
      else if (type === "col_1" && p.column === 1) set.add(i);
      else if (type === "col_2" && p.column === 2) set.add(i);
      else if (type === "col_3" && p.column === 3) set.add(i);
    }
    return set;
  }, [hoveredSpot]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (historyPockets.length === 0) return { redPct: 50, blackPct: 50, evenPct: 50, oddPct: 50 };
    const reds = historyPockets.filter((p) => p.color === "red").length;
    const blacks = historyPockets.filter((p) => p.color === "black").length;
    const evens = historyPockets.filter((p) => p.number !== 0 && p.isEven).length;
    const odds = historyPockets.filter((p) => p.number !== 0 && !p.isEven).length;
    const total = historyPockets.length;

    return {
      redPct: Math.round((reds / total) * 100),
      blackPct: Math.round((blacks / total) * 100),
      evenPct: Math.round((evens / total) * 100),
      oddPct: Math.round((odds / total) * 100),
    };
  }, [historyPockets]);

  // Handle Spin Action
  const handleSpin = useCallback(async () => {
    if (isSpinning || bets.length === 0 || totalStake > balance) return;

    try {
      setIsSpinning(true);
      setBannerMessage(null);
      setLastPayout(null);
      setLastBets([...bets]);

      playSound("spin");

      // 1. Call server action
      const res = await startRouletteSpin({
        bets,
        clientSeed: customClientSeed.trim() || undefined,
      });

      // 2. Animate wheel rotation so winning pocket aligns under the top indicator needle (12 o'clock)
      const degPerPocket = 360 / 37;
      const targetAngle = res.spinResult.pocketIndexOnWheel * degPerPocket;
      // 5 full rotations (1800 deg) + angle to bring winning pocket directly to top (360 - targetAngle)
      const newWheelDeg = wheelRotation + 1800 + (360 - targetAngle);
      // Counter-rotating ball: 7 full reverse revolutions
      const newBallDeg = ballRotation - 2520 + targetAngle;

      setWheelRotation(newWheelDeg);
      setBallRotation(newBallDeg);

      // Play ball bouncing sound as it settles into fret
      setTimeout(() => {
        playSound("ball");
      }, 2500);

      // Settle round after 3.6 seconds
      setTimeout(() => {
        setIsSpinning(false);
        setWinningPocket(res.spinResult.pocket);
        setLastPayout(res.evaluation.totalPayout);
        setBalance(res.newBalance);
        setAuditServerSeed(res.serverSeed);
        setHistoryPockets((prev) => [res.spinResult.pocket, ...prev.slice(0, 14)]);

        if (res.evaluation.totalPayout > 0) {
          playSound("win");
          setBannerMessage(
            `WINNER #${res.spinResult.winningNumber} ${res.spinResult.pocket.color.toUpperCase()}! Payout: +${res.evaluation.totalPayout.toFixed(2)} Pts`,
          );
        } else {
          playSound("loss");
          setBannerMessage(
            `Result: #${res.spinResult.winningNumber} ${res.spinResult.pocket.color.toUpperCase()} (${
              res.spinResult.winningNumber === 0
                ? "ZERO"
                : `${res.spinResult.pocket.isEven ? "EVEN" : "ODD"} · ${
                    res.spinResult.pocket.isHigh ? "HIGH" : "LOW"
                  }`
            })`,
          );
        }

        router.refresh();
      }, 3600);
    } catch (err: any) {
      setIsSpinning(false);
      alert(err.message || "Roulette spin failed");
    }
  }, [
    isSpinning,
    bets,
    totalStake,
    balance,
    customClientSeed,
    wheelRotation,
    ballRotation,
    playSound,
    router,
  ]);

  // Keyboard shortcut: Spacebar to spin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showRulesModal ||
        showFairnessModal ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.code === "Space" && !isSpinning && bets.length > 0) {
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSpin, isSpinning, bets.length, showRulesModal, showFairnessModal]);

  const verifyAudit = () => {
    try {
      if (!auditServerSeed || !auditClientSeed || auditNonce <= 0) return;
      const res = calculateRouletteSpin(auditServerSeed, auditClientSeed, auditNonce);
      setAuditResult(res);
    } catch (err: any) {
      alert(err.message || "Audit verification failed");
    }
  };

  return (
    <div className="sim-game-wrapper roulette-suite-wrap">
      {/* Header Banner */}
      <div className="sim-game-header">
        <div className="sim-header-titles">
          <div className="sim-game-badge">
            <Sparkles size={16} className="text-sky-400 inline mr-1" />
            PROVABLY FAIR EUROPEAN 37-POCKET WHEEL
          </div>
          <h1 className="sim-game-name">Roulette Royale · European Table</h1>
          <p className="sim-game-sub">
            Single-Zero (0) 97.30% RTP · Interactive Betting Felt · French Call Bets · Cryptographic HMAC-SHA256
          </p>
        </div>

        <div className="sim-meta-chips">
          <div className="sim-chip">
            <span className="sim-chip-k">Balance:</span>
            <span className="sim-chip-v">{balance.toFixed(2)} Pts</span>
          </div>

          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Audio" : "Enable Audio"}
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

          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setShowRulesModal(true)}
          >
            <HelpCircle size={14} className="ref-inline-icon" /> Rules &amp; Payouts
          </button>
          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setShowFairnessModal(true)}
          >
            <ShieldCheck size={14} className="ref-inline-icon" /> Provably Fair
          </button>
        </div>
      </div>

      {/* TOP CASINO ARENA: 3D Vector Wheel + Live Stats & Spotlight */}
      <div className="roulette-top-arena">
        {/* Left: 3D European Wheel */}
        <div className="roulette-wheel-stage">
          {/* Outer Mahogany Wood Rim with Metallic Accents */}
          <div className="roulette-wheel-outer-bowl">
            {/* Top Indicator Arrow / Needle */}
            <div className="roulette-wheel-top-marker">
              <div className="marker-diamond" />
            </div>

            {/* Rotating Rotor */}
            <div
              className="roulette-wheel-rotor"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: isSpinning
                  ? "transform 3.6s cubic-bezier(0.12, 0.8, 0.32, 1)"
                  : "none",
              }}
            >
              <svg viewBox="0 0 400 400" className="roulette-svg-rotor">
                {/* Outer Ring Shadow */}
                <circle cx="200" cy="200" r="162" fill="#1e130c" stroke="#b45309" strokeWidth="4" />

                {/* 37 Colored Sector Wedges */}
                {sectors.map((sec) => (
                  <g key={sec.num}>
                    <path
                      d={sec.d}
                      fill={sec.color}
                      stroke="#d97706"
                      strokeWidth="1.2"
                      className="roulette-wedge-path"
                    />
                    {/* Radial Fret line */}
                    <line
                      x1={sec.x4}
                      y1={sec.y4}
                      x2={sec.x1}
                      y2={sec.y1}
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />
                    {/* Sector Number facing outward */}
                    <text
                      x={sec.tx}
                      y={sec.ty}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${sec.midDeg}, ${sec.tx}, ${sec.ty})`}
                      className="roulette-wedge-text"
                    >
                      {sec.num}
                    </text>
                  </g>
                ))}

                {/* Inner Metallic Bowl */}
                <circle cx="200" cy="200" r="102" fill="url(#metallicBowlGrad)" />

                {/* Center Turret Cone & 4 Cross-arms */}
                <circle cx="200" cy="200" r="38" fill="url(#goldTurretGrad)" stroke="#fef08a" strokeWidth="2" />
                <circle cx="200" cy="200" r="14" fill="#ffffff" opacity="0.4" />

                {/* Gradients */}
                <defs>
                  <radialGradient id="metallicBowlGrad" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="50%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </radialGradient>
                  <radialGradient id="goldTurretGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#f59e0b" />
                    <stop offset="85%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

            {/* Ball Track & Spinning Ivory Ball */}
            <div
              className="roulette-ball-track-ring"
              style={{
                transform: `rotate(${ballRotation}deg)`,
                transition: isSpinning
                  ? "transform 3.6s cubic-bezier(0.15, 0.85, 0.35, 1)"
                  : "none",
              }}
            >
              <div className="roulette-ivory-ball-sphere" />
            </div>
          </div>
        </div>

        {/* Right: Live Spotlight, History & Wheel Statistics */}
        <div className="roulette-stats-stage">
          {/* Spotlight Result Card */}
          <div className="roulette-spotlight-card">
            {winningPocket ? (
              <div className="spotlight-active-wrap">
                <div className={`spotlight-badge-lg ${winningPocket.color}`}>
                  <span>{winningPocket.number}</span>
                </div>
                <div className="spotlight-meta-block">
                  <span className="spotlight-color-title">
                    {winningPocket.color.toUpperCase()} ·{" "}
                    {winningPocket.number === 0
                      ? "ZERO"
                      : `${winningPocket.isEven ? "EVEN" : "ODD"} · ${
                          winningPocket.isHigh ? "HIGH (19-36)" : "LOW (1-18)"
                        }`}
                  </span>
                  <span className="spotlight-dozen-title">
                    {winningPocket.number === 0
                      ? "House Edge"
                      : `Dozen ${winningPocket.dozen} · Column ${winningPocket.column}`}
                  </span>
                  {bannerMessage && (
                    <div
                      className={`spotlight-payout-pill ${
                        lastPayout !== null && lastPayout > 0 ? "won" : "lost"
                      }`}
                    >
                      {lastPayout !== null && lastPayout > 0 ? (
                        <>
                          <Trophy size={14} className="inline mr-1" />
                          {bannerMessage}
                        </>
                      ) : (
                        bannerMessage
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : isSpinning ? (
              <div className="spotlight-spin-active">
                <RotateCcw className="animate-spin inline mr-2 text-amber-400" size={24} />
                <div>
                  <span className="spin-main-text">WHEEL IN MOTION</span>
                  <span className="spin-sub-text">Ball revolving counter-clockwise...</span>
                </div>
              </div>
            ) : (
              <div className="spotlight-idle-wrap">
                <Coins size={20} className="text-amber-400 inline mr-2" />
                <div>
                  <span className="spin-main-text">PLACE CHIPS ON THE TABLE</span>
                  <span className="spin-sub-text">Select your favorite numbers or outside bets</span>
                </div>
              </div>
            )}
          </div>

          {/* History Ribbon */}
          <div className="roulette-history-row">
            <span className="hist-title">LAST SPINS:</span>
            <div className="hist-pills">
              {historyPockets.map((p, idx) => (
                <span key={idx} className={`hist-pill ${p.color}`} title={`#${p.number}`}>
                  {p.number}
                </span>
              ))}
            </div>
          </div>

          {/* Live Heat & Parity Statistics */}
          <div className="roulette-live-stats-card">
            <div className="stats-row">
              <span className="stat-label">Red / Black</span>
              <div className="stat-bar-dual">
                <div className="stat-fill-red" style={{ width: `${stats.redPct}%` }}>
                  {stats.redPct}%
                </div>
                <div className="stat-fill-black" style={{ width: `${stats.blackPct}%` }}>
                  {stats.blackPct}%
                </div>
              </div>
            </div>

            <div className="stats-row">
              <span className="stat-label">Even / Odd</span>
              <div className="stat-bar-dual">
                <div className="stat-fill-even" style={{ width: `${stats.evenPct}%` }}>
                  {stats.evenPct}%
                </div>
                <div className="stat-fill-odd" style={{ width: `${stats.oddPct}%` }}>
                  {stats.oddPct}%
                </div>
              </div>
            </div>
          </div>

          {/* French Call Bets Quick Actions */}
          <div className="french-call-bets-bar">
            <span className="call-title">FRENCH CALL BETS:</span>
            <div className="call-btns-grid">
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => placeCallBet("voisins")}
                className="call-bet-btn"
                title="Bet 17 numbers around zero"
              >
                Voisins (17)
              </button>
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => placeCallBet("tiers")}
                className="call-bet-btn"
                title="Bet 12 numbers opposite zero"
              >
                Tiers (12)
              </button>
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => placeCallBet("orphelins")}
                className="call-bet-btn"
                title="Bet 8 orphan numbers"
              >
                Orphelins (8)
              </button>
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => placeCallBet("zeroSpiel")}
                className="call-bet-btn"
                title="Bet 7 zero game numbers"
              >
                Jeu Zéro (7)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH EMERALD FELT BETTING TABLE */}
      <div className="roulette-felt-container">
        <div className="roulette-felt-mat">
          {/* Main Numbers & Outside Layout Grid */}
          <div className="felt-main-grid-layout">
            {/* Zero (0) Left Column */}
            <div className="felt-zero-col">
              <button
                type="button"
                disabled={isSpinning}
                className={`felt-cell-btn cell-zero ${
                  coveredNumbers.has(0) ? "hover-covered" : ""
                } ${winningPocket?.number === 0 ? "winning-cell-pulse" : ""}`}
                onClick={() => placeBet("straight", 0)}
                onMouseEnter={() => setHoveredSpot({ type: "straight", target: 0 })}
                onMouseLeave={() => setHoveredSpot(null)}
              >
                <span className="cell-num-text">0</span>
                <PlacedChipBadge amount={getSpotStake("straight", 0)} />
              </button>
            </div>

            {/* 36 Numbers Grid (3 rows x 12 cols) */}
            <div className="felt-numbers-grid">
              {[
                [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
                [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
                [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
              ].map((row, rowIdx) => (
                <div key={rowIdx} className="felt-numbers-row">
                  {row.map((num) => {
                    const isRed = ROULETTE_RED_NUMBERS.has(num);
                    const stake = getSpotStake("straight", num);
                    const isCovered = coveredNumbers.has(num);
                    const isWinner = winningPocket?.number === num;

                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isSpinning}
                        className={`felt-cell-btn cell-number ${isRed ? "red" : "black"} ${
                          isCovered ? "hover-covered" : ""
                        } ${isWinner ? "winning-cell-pulse" : ""}`}
                        onClick={() => placeBet("straight", num)}
                        onMouseEnter={() => setHoveredSpot({ type: "straight", target: num })}
                        onMouseLeave={() => setHoveredSpot(null)}
                      >
                        <span className="cell-num-text">{num}</span>
                        <PlacedChipBadge amount={stake} />
                      </button>
                    );
                  })}
                  {/* Column 2:1 button at the right end */}
                  <button
                    type="button"
                    disabled={isSpinning}
                    className="felt-cell-btn cell-column"
                    onClick={() =>
                      placeBet(rowIdx === 0 ? "col_3" : rowIdx === 1 ? "col_2" : "col_1")
                    }
                    onMouseEnter={() =>
                      setHoveredSpot({
                        type: rowIdx === 0 ? "col_3" : rowIdx === 1 ? "col_2" : "col_1",
                      })
                    }
                    onMouseLeave={() => setHoveredSpot(null)}
                  >
                    <span className="cell-label-text">2:1</span>
                    <PlacedChipBadge
                      amount={getSpotStake(
                        rowIdx === 0 ? "col_3" : rowIdx === 1 ? "col_2" : "col_1",
                      )}
                    />
                  </button>
                </div>
              ))}

              {/* Dozens Row */}
              <div className="felt-dozens-row">
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-dozen"
                  onClick={() => placeBet("dozen_1")}
                  onMouseEnter={() => setHoveredSpot({ type: "dozen_1" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">1st 12 (1 - 12)</span>
                  <PlacedChipBadge amount={getSpotStake("dozen_1")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-dozen"
                  onClick={() => placeBet("dozen_2")}
                  onMouseEnter={() => setHoveredSpot({ type: "dozen_2" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">2nd 12 (13 - 24)</span>
                  <PlacedChipBadge amount={getSpotStake("dozen_2")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-dozen"
                  onClick={() => placeBet("dozen_3")}
                  onMouseEnter={() => setHoveredSpot({ type: "dozen_3" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">3rd 12 (25 - 36)</span>
                  <PlacedChipBadge amount={getSpotStake("dozen_3")} />
                </button>
              </div>

              {/* Even-Money Outside Row */}
              <div className="felt-outside-row">
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-outside"
                  onClick={() => placeBet("low")}
                  onMouseEnter={() => setHoveredSpot({ type: "low" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">1 - 18</span>
                  <PlacedChipBadge amount={getSpotStake("low")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-outside"
                  onClick={() => placeBet("even")}
                  onMouseEnter={() => setHoveredSpot({ type: "even" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">EVEN</span>
                  <PlacedChipBadge amount={getSpotStake("even")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-outside red-diamond"
                  onClick={() => placeBet("red")}
                  onMouseEnter={() => setHoveredSpot({ type: "red" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-diamond-red" />
                  <span className="cell-label-text">RED</span>
                  <PlacedChipBadge amount={getSpotStake("red")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-outside black-diamond"
                  onClick={() => placeBet("black")}
                  onMouseEnter={() => setHoveredSpot({ type: "black" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-diamond-black" />
                  <span className="cell-label-text">BLACK</span>
                  <PlacedChipBadge amount={getSpotStake("black")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-outside"
                  onClick={() => placeBet("odd")}
                  onMouseEnter={() => setHoveredSpot({ type: "odd" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">ODD</span>
                  <PlacedChipBadge amount={getSpotStake("odd")} />
                </button>
                <button
                  type="button"
                  disabled={isSpinning}
                  className="felt-cell-btn cell-outside"
                  onClick={() => placeBet("high")}
                  onMouseEnter={() => setHoveredSpot({ type: "high" })}
                  onMouseLeave={() => setHoveredSpot(null)}
                >
                  <span className="cell-label-text">19 - 36</span>
                  <PlacedChipBadge amount={getSpotStake("high")} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM DASHBOARD: Chips, Modifiers, Stake & Spin */}
        <div className="roulette-bottom-bar">
          {/* Left: Physical Chips Selector */}
          <div className="chips-control-group">
            <span className="chips-title">CHIP:</span>
            <div className="chips-token-rack">
              {CHIP_VALUES.map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  disabled={isSpinning}
                  className={`bj-chip-token ${
                    selectedChipVal === chip.val ? "active-chip-glow" : ""
                  }`}
                  style={{
                    backgroundColor: chip.bg,
                    borderColor: chip.border,
                    color: chip.text,
                  }}
                  onClick={() => {
                    playSound("chip");
                    setSelectedChipVal(chip.val);
                  }}
                  title={`Select ${chip.val} Pts chip`}
                >
                  <div className="bj-chip-inner">
                    <span className="bj-chip-label">{chip.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center: Quick Table Modifiers */}
          <div className="table-modifiers-group">
            <button
              type="button"
              className="roulette-mod-btn"
              onClick={undoLastBet}
              disabled={isSpinning || betHistoryStack.length === 0}
              title="Undo last placed bet"
            >
              <Undo2 size={13} className="inline mr-1" /> Undo
            </button>
            <button
              type="button"
              className="roulette-mod-btn"
              onClick={doubleBets}
              disabled={isSpinning || bets.length === 0}
              title="Double all bets on table"
            >
              2x Double
            </button>
            <button
              type="button"
              className="roulette-mod-btn"
              onClick={clearBets}
              disabled={isSpinning || bets.length === 0}
              title="Clear all bets from table"
            >
              <Trash2 size={13} className="inline mr-1" /> Clear
            </button>
            <button
              type="button"
              className="roulette-mod-btn"
              onClick={repeatLastBets}
              disabled={isSpinning || lastBets.length === 0}
              title="Re-bet last round bets"
            >
              <Copy size={13} className="inline mr-1" /> Re-Bet
            </button>
          </div>

          {/* Right: Bet Total & Spin CTA */}
          <div className="spin-cta-group">
            <div className="stake-summary-badge">
              <span className="stake-label">TOTAL BET</span>
              <span className="stake-val">{totalStake} Pts</span>
              <span className="stake-count">({bets.length} spots)</span>
            </div>

            <button
              type="button"
              disabled={isSpinning || bets.length === 0 || totalStake > balance}
              onClick={handleSpin}
              className="cherry-arcade-btn sim-play-btn spin roulette-spin-cta"
            >
              {isSpinning ? (
                <>
                  <RotateCcw className="animate-spin inline mr-2" size={18} />
                  SPINNING...
                </>
              ) : (
                <>
                  <span className="cherry-btn-text">
                    SPIN WHEEL ({totalStake} Pts)
                  </span>
                  <span className="cherry-space-badge">SPACE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="sim-modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div
            className="sim-modal-dialog"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sim-modal-head">
              <div className="sim-modal-title">
                <HelpCircle size={18} className="text-sky-400 inline mr-2" />
                European Roulette Rules &amp; Payouts
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="sim-modal-close"
              >
                ×
              </button>
            </div>
            <div className="sim-modal-body">
              <p className="text-xs text-slate-600 mb-4">
                European Roulette features a single zero (0) pocket, giving players a generous{" "}
                <strong>97.30% RTP</strong> compared to American double-zero variants.
              </p>
              <table className="w-full text-xs border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2">Bet Type</th>
                    <th className="py-2">Covered Spots</th>
                    <th className="py-2">Payout Ratio</th>
                    <th className="py-2">Total Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2 font-bold text-slate-800">Straight Up</td>
                    <td>Single Number (0-36)</td>
                    <td className="text-sky-400 font-bold">35 to 1</td>
                    <td>36x</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-slate-800">Dozens (1st, 2nd, 3rd)</td>
                    <td>12 numbers (1-12, 13-24, 25-36)</td>
                    <td className="text-sky-400 font-bold">2 to 1</td>
                    <td>3x</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-slate-800">Columns (Col 1, 2, 3)</td>
                    <td>12 vertical numbers</td>
                    <td className="text-sky-400 font-bold">2 to 1</td>
                    <td>3x</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-slate-800">Red / Black</td>
                    <td>18 color numbers</td>
                    <td className="text-sky-400 font-bold">1 to 1</td>
                    <td>2x</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-slate-800">Even / Odd</td>
                    <td>18 parity numbers</td>
                    <td className="text-sky-400 font-bold">1 to 1</td>
                    <td>2x</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-slate-800">Low (1-18) / High (19-36)</td>
                    <td>18 half numbers</td>
                    <td className="text-sky-400 font-bold">1 to 1</td>
                    <td>2x</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fairness Modal */}
      {showFairnessModal && (
        <div className="sim-modal-overlay" onClick={() => setShowFairnessModal(false)}>
          <div
            className="sim-modal-dialog"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sim-modal-head">
              <div className="sim-modal-title">
                <ShieldCheck size={18} className="text-sky-400 inline mr-2" />
                Provably Fair Wheel Verifier
              </div>
              <button
                type="button"
                onClick={() => setShowFairnessModal(false)}
                className="sim-modal-close"
              >
                ×
              </button>
            </div>
            <div className="sim-modal-body text-xs space-y-3">
              <p className="text-slate-600">
                Every spin is determined deterministically by{" "}
                <code>HMAC-SHA256(ServerSeed, ClientSeed:Nonce:roulette) % 37</code>. The server seed hash is
                committed before each spin, preventing post-bet manipulation.
              </p>
              <div>
                <label className="font-bold text-slate-700">Server Seed:</label>
                <input
                  type="text"
                  value={auditServerSeed}
                  onChange={(e) => setAuditServerSeed(e.target.value)}
                  className="sim-input mt-1 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Client Seed:</label>
                <input
                  type="text"
                  value={auditClientSeed}
                  onChange={(e) => setAuditClientSeed(e.target.value)}
                  className="sim-input mt-1 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Nonce:</label>
                <input
                  type="number"
                  value={auditNonce}
                  onChange={(e) => setAuditNonce(Number(e.target.value))}
                  className="sim-input mt-1 font-mono text-[11px]"
                />
              </div>
              <button
                type="button"
                onClick={verifyAudit}
                className="cherry-arcade-btn w-full py-2 text-xs mt-2"
              >
                VERIFY DETERMINISTIC POCKET
              </button>
              {auditResult && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded mt-3 text-xs">
                  <p>
                    Winning Pocket: <strong>#{auditResult.winningNumber}</strong> (
                    {auditResult.pocket.color.toUpperCase()})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { playDragonTigerRound } from "@/lib/simulated-actions";
import {
  type PlayingCard,
  type CardSuit,
  type DragonTigerResult,
} from "@/lib/provably-fair";

const SUIT_META: Record<CardSuit, { symbol: string; color: string }> = {
  hearts: { symbol: "♥", color: "#dc2626" },
  diamonds: { symbol: "♦", color: "#dc2626" },
  clubs: { symbol: "♣", color: "#0f172a" },
  spades: { symbol: "♠", color: "#0f172a" },
};

const CHIP_VALUES = [
  { val: 10, label: "10", bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" },
  { val: 50, label: "50", bg: "#dc2626", border: "#b91c1c", text: "#ffffff" },
  { val: 100, label: "100", bg: "#059669", border: "#047857", text: "#ffffff" },
  { val: 500, label: "500", bg: "#0f172a", border: "#fbbf24", text: "#fbbf24" },
  { val: 1000, label: "1K", bg: "#d97706", border: "#f59e0b", text: "#ffffff" },
];

function BigCardView({ card }: { card?: PlayingCard }) {
  const meta = card ? SUIT_META[card.suit] : null;

  return (
    <div className="card-3d-wrapper dt-big-card">
      <div className="card-3d-inner is-revealed">
        {card && meta && (
          <div className="card-face card-face-front" style={{ color: meta.color }}>
            <div className="card-corner top-left">
              <span className="card-rank">{card.rank}</span>
              <span className="card-suit-icon">{meta.symbol}</span>
            </div>
            <div className="card-center-suit text-4xl">{meta.symbol}</div>
            <div className="card-corner bottom-right">
              <span className="card-rank">{card.rank}</span>
              <span className="card-suit-icon">{meta.symbol}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DragonTigerGame({ initialBalance }: { initialBalance: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [stake, setStake] = useState(50);
  const [betSide, setBetSide] = useState<"dragon" | "tiger" | "tie">("dragon");
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
    (type: "deal" | "chip" | "snap" | "win" | "loss" | "push") => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === "deal") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === "chip") {
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
        } else if (type === "win") {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.14, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.28);
          });
        } else if (type === "push") {
          [440, 554.37].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
          });
        } else if (type === "loss") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
        }
      } catch {
        // Audio non-fatal
      }
    },
    [soundEnabled, getAudioContext],
  );

  // Round State
  const [isDealing, setIsDealing] = useState(false);
  const [dragonCard, setDragonCard] = useState<PlayingCard | null>(null);
  const [tigerCard, setTigerCard] = useState<PlayingCard | null>(null);
  const [roundWinner, setRoundWinner] = useState<"dragon" | "tiger" | "tie" | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [history, setHistory] = useState<("D" | "T" | "Tie")[]>(["D", "T", "D", "D", "T"]);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  // Deal Dragon Tiger Hand
  const handleDeal = useCallback(async () => {
    if (isDealing || stake <= 0 || stake > balance) return;

    try {
      setIsDealing(true);
      setBannerMessage(null);
      setLastPayout(null);
      setDragonCard(null);
      setTigerCard(null);
      setRoundWinner(null);

      playSound("chip");

      // 1. Call server action
      const res = await playDragonTigerRound({
        betType: betSide,
        stake,
        clientSeed: customClientSeed.trim() || undefined,
      });

      // Deal Dragon Card (100ms)
      setTimeout(() => {
        playSound("deal");
        setDragonCard(res.result.dragonCard);
      }, 150);

      // Deal Tiger Card (450ms)
      setTimeout(() => {
        playSound("deal");
        setTigerCard(res.result.tigerCard);
      }, 450);

      // Settle round (800ms)
      setTimeout(() => {
        setIsDealing(false);
        setRoundWinner(res.result.winner);
        setLastPayout(res.payout);
        setBalance(res.newBalance);

        const histTag: "D" | "T" | "Tie" =
          res.result.winner === "dragon"
            ? "D"
            : res.result.winner === "tiger"
            ? "T"
            : "Tie";
        setHistory((prev) => [histTag, ...prev.slice(0, 19)]);

        if (res.status === "won") {
          playSound("win");
          setBannerMessage(
            `${res.result.winner.toUpperCase()} WINS! (${res.result.dragonCard.rank} vs ${
              res.result.tigerCard.rank
            }) · Payout: +${res.payout.toFixed(2)} Pts`,
          );
        } else if (res.status === "push") {
          playSound("push");
          setBannerMessage(`TIE (${res.result.dragonCard.rank}) · 50% Refund (+${res.payout.toFixed(2)} Pts)`);
        } else {
          playSound("loss");
          setBannerMessage(
            `${res.result.winner.toUpperCase()} WINS (${res.result.dragonCard.rank} vs ${
              res.result.tigerCard.rank
            })`,
          );
        }

        router.refresh();
      }, 850);
    } catch (err: any) {
      setIsDealing(false);
      alert(err.message || "Dragon Tiger deal failed");
    }
  }, [isDealing, stake, balance, betSide, customClientSeed, playSound, router]);

  // Keyboard shortcut: Spacebar to deal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.code === "Space" && !isDealing) {
        e.preventDefault();
        handleDeal();
      } else if (e.key.toLowerCase() === "d" && !isDealing) {
        setBetSide("dragon");
      } else if (e.key.toLowerCase() === "t" && !isDealing) {
        setBetSide("tiger");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeal, isDealing]);

  const addChip = (val: number) => {
    if (isDealing) return;
    playSound("chip");
    setStake((prev) => Math.min(Math.floor(balance), prev + val));
  };

  return (
    <div className="baccarat-game-view">
      {/* Bead History */}
      <div className="baccarat-road-bar">
        <span className="road-label">ROADMAP:</span>
        <div className="road-beads">
          {history.map((h, i) => (
            <span
              key={i}
              className={`bead-token ${h === "D" ? "dragon" : h === "T" ? "tiger" : "tie"}`}
              title={h === "D" ? "Dragon" : h === "T" ? "Tiger" : "Tie"}
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Main Arena */}
      <div className="sim-arena-grid">
        {/* Felt Table */}
        <div className="blackjack-felt-cabinet high-roller-felt dt-table">
          <div className="felt-top-bar">
            <div className="felt-table-arc">
              <span>DRAGON TIGER · 2-CARD SHOWDOWN · KING HIGH · ACE LOW · TIE PAYS 11:1</span>
            </div>
            <div className="felt-shoe-box">
              <div className="shoe-lid" />
              <div className="shoe-deck-stack">
                <span className="shoe-deck-label">8 DECKS</span>
              </div>
            </div>
          </div>

          {/* Dragon vs Tiger Arena */}
          <div className="dt-battle-arena">
            {/* Dragon Left */}
            <div className={`dt-combatant dragon ${roundWinner === "dragon" ? "winner-glow" : ""}`}>
              <div className="felt-zone-header">
                <span className="felt-zone-title text-amber-400">DRAGON (龙)</span>
                {dragonCard && (
                  <span className="felt-score-tag">Rank: {dragonCard.rank}</span>
                )}
              </div>
              <div className="dt-card-slot">
                {dragonCard ? (
                  <BigCardView card={dragonCard} />
                ) : (
                  <div className="dt-card-placeholder">DRAGON</div>
                )}
              </div>
            </div>

            {/* VS Emblem */}
            <div className="baccarat-vs-divider">
              <span className="vs-text text-amber-300">⚔</span>
            </div>

            {/* Tiger Right */}
            <div className={`dt-combatant tiger ${roundWinner === "tiger" ? "winner-glow" : ""}`}>
              <div className="felt-zone-header">
                <span className="felt-zone-title text-orange-400">TIGER (虎)</span>
                {tigerCard && (
                  <span className="felt-score-tag">Rank: {tigerCard.rank}</span>
                )}
              </div>
              <div className="dt-card-slot">
                {tigerCard ? (
                  <BigCardView card={tigerCard} />
                ) : (
                  <div className="dt-card-placeholder">TIGER</div>
                )}
              </div>
            </div>
          </div>

          {/* Status Banner */}
          <div className="felt-center-banner">
            {bannerMessage ? (
              <div
                className={`felt-status-badge ${
                  roundWinner === betSide || (roundWinner === "tie" && betSide === "tie")
                    ? "status-win"
                    : roundWinner === "tie"
                    ? "status-push"
                    : "status-lost"
                }`}
              >
                {bannerMessage}
              </div>
            ) : isDealing ? (
              <div className="felt-status-badge status-playing">
                <span>REVEALING CARDS...</span>
              </div>
            ) : (
              <div className="felt-status-badge status-idle">
                <Coins size={14} className="inline mr-1" />
                <span>CHOOSE DRAGON, TIGER, OR TIE &amp; PRESS DEAL</span>
              </div>
            )}
          </div>

          {/* Table Bet Spots */}
          <div className="baccarat-felt-spots">
            <button
              type="button"
              disabled={isDealing}
              className={`baccarat-spot-btn player dt-dragon ${betSide === "dragon" ? "selected" : ""}`}
              onClick={() => {
                playSound("chip");
                setBetSide("dragon");
              }}
            >
              <span className="spot-title">DRAGON (龙)</span>
              <span className="spot-odds">1 : 1</span>
              {betSide === "dragon" && (
                <span className="spot-stake-pill">{stake} Pts</span>
              )}
            </button>

            <button
              type="button"
              disabled={isDealing}
              className={`baccarat-spot-btn tie ${betSide === "tie" ? "selected" : ""}`}
              onClick={() => {
                playSound("chip");
                setBetSide("tie");
              }}
            >
              <span className="spot-title">TIE</span>
              <span className="spot-odds">11 : 1</span>
              {betSide === "tie" && (
                <span className="spot-stake-pill">{stake} Pts</span>
              )}
            </button>

            <button
              type="button"
              disabled={isDealing}
              className={`baccarat-spot-btn banker dt-tiger ${betSide === "tiger" ? "selected" : ""}`}
              onClick={() => {
                playSound("chip");
                setBetSide("tiger");
              }}
            >
              <span className="spot-title">TIGER (虎)</span>
              <span className="spot-odds">1 : 1</span>
              {betSide === "tiger" && (
                <span className="spot-stake-pill">{stake} Pts</span>
              )}
            </button>
          </div>
        </div>

        {/* Right Controls Panel */}
        <div className="sim-controls-card">
          <div className="flex items-center justify-between mb-2">
            <label className="sim-control-label">Bet Amount (Pts)</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="bj-chip-mod-btn"
                onClick={() => setStake(10)}
                disabled={isDealing}
              >
                Clear
              </button>
              <button
                type="button"
                className="bj-chip-mod-btn"
                onClick={() => setStake((p) => Math.min(Math.floor(balance), p * 2))}
                disabled={isDealing}
              >
                2x
              </button>
            </div>
          </div>

          <div className="bj-chips-rack">
            {CHIP_VALUES.map((chip) => (
              <button
                key={chip.val}
                type="button"
                disabled={isDealing}
                className="bj-chip-token"
                style={{
                  backgroundColor: chip.bg,
                  borderColor: chip.border,
                  color: chip.text,
                }}
                onClick={() => addChip(chip.val)}
                title={`Add +${chip.val} Pts`}
              >
                <div className="bj-chip-inner">
                  <span className="bj-chip-label">{chip.label}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="slot-bet-stepper mt-3">
            <input
              type="number"
              min="1"
              step="1"
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
              className="sim-input text-center font-bold text-base"
            />
          </div>

          <div className="sim-actions-stack mt-4">
            <button
              type="button"
              disabled={isDealing || stake > balance}
              onClick={handleDeal}
              className="cherry-arcade-btn sim-play-btn spin"
            >
              {isDealing ? (
                <>
                  <RotateCcw className="animate-spin inline mr-2" size={18} />
                  DEALING...
                </>
              ) : (
                <>
                  <span className="cherry-btn-text">
                    DEAL {betSide.toUpperCase()} ({stake} Pts)
                  </span>
                  <span className="cherry-space-badge">SPACE</span>
                </>
              )}
            </button>
          </div>

          <div className="sim-control-group mt-3">
            <label className="sim-control-label">Client Seed (Optional)</label>
            <input
              type="text"
              placeholder="Entropy for shoe shuffle"
              value={customClientSeed}
              onChange={(e) => setCustomClientSeed(e.target.value)}
              className="sim-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

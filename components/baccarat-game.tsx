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
import { playBaccaratRound } from "@/lib/simulated-actions";
import {
  shuffleDeck,
  getBaccaratScore,
  type PlayingCard,
  type CardSuit,
  type BaccaratResult,
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

function CardView({ card, delayMs = 0 }: { card?: PlayingCard; delayMs?: number }) {
  const meta = card ? SUIT_META[card.suit] : null;

  return (
    <div className="card-3d-wrapper" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="card-3d-inner is-revealed">
        {card && meta && (
          <div className="card-face card-face-front" style={{ color: meta.color }}>
            <div className="card-corner top-left">
              <span className="card-rank">{card.rank}</span>
              <span className="card-suit-icon">{meta.symbol}</span>
            </div>
            <div className="card-center-suit">{meta.symbol}</div>
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

export function BaccaratGame({ initialBalance }: { initialBalance: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [stake, setStake] = useState(50);
  const [betSide, setBetSide] = useState<"player" | "banker" | "tie">("banker");
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
        } else if (type === "snap") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
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
  const [playerCards, setPlayerCards] = useState<PlayingCard[]>([]);
  const [bankerCards, setBankerCards] = useState<PlayingCard[]>([]);
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [bankerScore, setBankerScore] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<"player" | "banker" | "tie" | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [beadHistory, setBeadHistory] = useState<("P" | "B" | "T")[]>(["B", "P", "B", "B", "T"]);

  // Modals
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Audit state
  const [auditServerSeed, setAuditServerSeed] = useState("");
  const [auditClientSeed, setAuditClientSeed] = useState("");
  const [auditNonce, setAuditNonce] = useState(1);
  const [auditDeck, setAuditDeck] = useState<PlayingCard[] | null>(null);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  // Deal Baccarat Hand with authentic staged card sequences
  const handleDeal = useCallback(async () => {
    if (isDealing || stake <= 0 || stake > balance) return;

    try {
      setIsDealing(true);
      setBannerMessage(null);
      setLastPayout(null);
      setPlayerCards([]);
      setBankerCards([]);
      setPlayerScore(null);
      setBankerScore(null);
      setRoundWinner(null);

      playSound("chip");

      // 1. Call server action
      const res = await playBaccaratRound({
        betType: betSide,
        stake,
        clientSeed: customClientSeed.trim() || undefined,
      });

      const fullP = res.result.playerCards;
      const fullB = res.result.bankerCards;

      // Staged Dealing:
      // Card 1: Player (0ms)
      // Card 2: Banker (220ms)
      // Card 3: Player (440ms)
      // Card 4: Banker (660ms)
      setTimeout(() => {
        playSound("deal");
        setPlayerCards([fullP[0]]);
        setPlayerScore(getBaccaratScore([fullP[0]]));
      }, 100);

      setTimeout(() => {
        playSound("deal");
        setBankerCards([fullB[0]]);
        setBankerScore(getBaccaratScore([fullB[0]]));
      }, 320);

      setTimeout(() => {
        playSound("deal");
        setPlayerCards([fullP[0], fullP[1]]);
        setPlayerScore(getBaccaratScore([fullP[0], fullP[1]]));
      }, 540);

      setTimeout(() => {
        playSound("deal");
        setBankerCards([fullB[0], fullB[1]]);
        setBankerScore(getBaccaratScore([fullB[0], fullB[1]]));

        // If 3rd cards exist, continue staged draw
        const hasP3 = fullP.length > 2;
        const hasB3 = fullB.length > 2;

        if (!hasP3 && !hasB3) {
          // Conclude round (Natural 8/9 or Stand)
          finalizeRound(res);
        } else {
          // Draw 3rd cards
          if (hasP3) {
            setTimeout(() => {
              playSound("deal");
              setPlayerCards(fullP);
              setPlayerScore(res.result.playerScore);
            }, 350);
          }
          if (hasB3) {
            setTimeout(() => {
              playSound("deal");
              setBankerCards(fullB);
              setBankerScore(res.result.bankerScore);
            }, hasP3 ? 700 : 350);
          }
          setTimeout(
            () => {
              finalizeRound(res);
            },
            hasP3 && hasB3 ? 1050 : 700,
          );
        }
      }, 760);
    } catch (err: any) {
      setIsDealing(false);
      alert(err.message || "Baccarat deal failed");
    }
  }, [isDealing, stake, balance, betSide, customClientSeed, playSound]);

  const finalizeRound = (res: any) => {
    setIsDealing(false);
    setPlayerCards(res.result.playerCards);
    setBankerCards(res.result.bankerCards);
    setPlayerScore(res.result.playerScore);
    setBankerScore(res.result.bankerScore);
    setRoundWinner(res.result.winner);
    setLastPayout(res.payout);
    setBalance(res.newBalance);
    setAuditServerSeed(res.serverSeed);

    const bead: "P" | "B" | "T" =
      res.result.winner === "player" ? "P" : res.result.winner === "banker" ? "B" : "T";
    setBeadHistory((prev) => [bead, ...prev.slice(0, 19)]);

    if (res.status === "won") {
      playSound("win");
      setBannerMessage(
        `${res.result.winner.toUpperCase()} WINS (${res.result.playerScore} vs ${res.result.bankerScore})${
          res.result.isNatural ? " · NATURAL!" : ""
        } · Payout: +${res.payout.toFixed(2)} Pts`,
      );
    } else if (res.status === "push") {
      playSound("push");
      setBannerMessage(
        `TIE (${res.result.playerScore} vs ${res.result.bankerScore}) · Player/Banker bets refunded!`,
      );
    } else {
      playSound("loss");
      setBannerMessage(
        `${res.result.winner.toUpperCase()} WINS (${res.result.playerScore} vs ${res.result.bankerScore})`,
      );
    }

    router.refresh();
  };

  // Keyboard shortcut: Spacebar to deal
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
      if (e.code === "Space" && !isDealing) {
        e.preventDefault();
        handleDeal();
      } else if (e.key.toLowerCase() === "p" && !isDealing) {
        setBetSide("player");
      } else if (e.key.toLowerCase() === "b" && !isDealing) {
        setBetSide("banker");
      } else if (e.key.toLowerCase() === "t" && !isDealing) {
        setBetSide("tie");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeal, isDealing, showRulesModal, showFairnessModal]);

  const addChip = (val: number) => {
    if (isDealing) return;
    playSound("chip");
    setStake((prev) => Math.min(Math.floor(balance), prev + val));
  };

  const verifyAudit = () => {
    try {
      if (!auditServerSeed || !auditClientSeed || auditNonce <= 0) return;
      const deck = shuffleDeck(auditServerSeed, auditClientSeed, auditNonce);
      setAuditDeck(deck);
    } catch (err: any) {
      alert(err.message || "Deck audit failed");
    }
  };

  return (
    <div className="baccarat-game-view">
      {/* Bead Road History */}
      <div className="baccarat-road-bar">
        <span className="road-label">BEAD ROAD:</span>
        <div className="road-beads">
          {beadHistory.map((b, i) => (
            <span
              key={i}
              className={`bead-token ${b === "P" ? "player" : b === "B" ? "banker" : "tie"}`}
              title={b === "P" ? "Player Win" : b === "B" ? "Banker Win" : "Tie"}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Main Arena */}
      <div className="sim-arena-grid">
        {/* Felt Table */}
        <div className="blackjack-felt-cabinet high-roller-felt baccarat-table">
          {/* Top Arc Rule */}
          <div className="felt-top-bar">
            <div className="felt-table-arc">
              <span>BACCARAT · PLAYER PAYS 1:1 · BANKER PAYS 0.95:1 · TIE PAYS 8:1</span>
            </div>
            <div className="felt-shoe-box">
              <div className="shoe-lid" />
              <div className="shoe-deck-stack">
                <span className="shoe-deck-label">8 DECKS</span>
              </div>
            </div>
          </div>

          {/* Dual Hand Arena: Player (Left) vs Banker (Right) */}
          <div className="baccarat-hands-arena">
            {/* Player Hand Zone */}
            <div
              className={`baccarat-hand-col player ${
                roundWinner === "player" ? "winner-glow" : ""
              }`}
            >
              <div className="felt-zone-header">
                <span className="felt-zone-title text-blue-400">PLAYER</span>
                <span className="felt-score-tag">
                  Points: {playerScore !== null ? playerScore : "?"}
                </span>
              </div>

              <div className="felt-cards-tray">
                {playerCards.map((card, idx) => (
                  <CardView key={`p-${idx}`} card={card} delayMs={idx * 120} />
                ))}
                {playerCards.length === 0 && !isDealing && (
                  <div className="felt-empty-hand-prompt">Awaiting deal...</div>
                )}
              </div>
            </div>

            {/* VS Center Divider & Status */}
            <div className="baccarat-vs-divider">
              <span className="vs-text">VS</span>
            </div>

            {/* Banker Hand Zone */}
            <div
              className={`baccarat-hand-col banker ${
                roundWinner === "banker" ? "winner-glow" : ""
              }`}
            >
              <div className="felt-zone-header">
                <span className="felt-zone-title text-red-400">BANKER</span>
                <span className="felt-score-tag">
                  Points: {bankerScore !== null ? bankerScore : "?"}
                </span>
              </div>

              <div className="felt-cards-tray">
                {bankerCards.map((card, idx) => (
                  <CardView key={`b-${idx}`} card={card} delayMs={idx * 120} />
                ))}
                {bankerCards.length === 0 && !isDealing && (
                  <div className="felt-empty-hand-prompt">Awaiting deal...</div>
                )}
              </div>
            </div>
          </div>

          {/* Center Banner */}
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
                <span>DEALING BACCARAT SHOE...</span>
              </div>
            ) : (
              <div className="felt-status-badge status-idle">
                <Coins size={14} className="inline mr-1" />
                <span>CHOOSE PLAYER, BANKER, OR TIE &amp; PRESS DEAL</span>
              </div>
            )}
          </div>

          {/* Table Bet Spots (PLAYER / TIE / BANKER) */}
          <div className="baccarat-felt-spots">
            <button
              type="button"
              disabled={isDealing}
              className={`baccarat-spot-btn player ${betSide === "player" ? "selected" : ""}`}
              onClick={() => {
                playSound("chip");
                setBetSide("player");
              }}
            >
              <span className="spot-title">PLAYER</span>
              <span className="spot-odds">1 : 1</span>
              {betSide === "player" && (
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
              <span className="spot-odds">8 : 1</span>
              {betSide === "tie" && (
                <span className="spot-stake-pill">{stake} Pts</span>
              )}
            </button>

            <button
              type="button"
              disabled={isDealing}
              className={`baccarat-spot-btn banker ${betSide === "banker" ? "selected" : ""}`}
              onClick={() => {
                playSound("chip");
                setBetSide("banker");
              }}
            >
              <span className="spot-title">BANKER</span>
              <span className="spot-odds">0.95 : 1 (5% Comm)</span>
              {betSide === "banker" && (
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

          {/* Chips Rack */}
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

          {/* Actions */}
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

          {/* Seed */}
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

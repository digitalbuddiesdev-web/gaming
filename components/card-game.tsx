"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  HelpCircle,
  Trophy,
  Coins,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowUpCircle,
  Layers,
} from "lucide-react";
import {
  startBlackjackRound,
  playerBlackjackAction,
} from "@/lib/simulated-actions";
import { BaccaratGame } from "./baccarat-game";
import { DragonTigerGame } from "./dragon-tiger-game";
import {
  shuffleDeck,
  evaluateHand,
  hashServerSeed,
  type PlayingCard,
  type CardSuit,
} from "@/lib/provably-fair";

// Suit glyphs and colors
const SUIT_META: Record<CardSuit, { symbol: string; color: string; name: string }> = {
  hearts: { symbol: "♥", color: "#dc2626", name: "Hearts" },
  diamonds: { symbol: "♦", color: "#dc2626", name: "Diamonds" },
  clubs: { symbol: "♣", color: "#0f172a", name: "Clubs" },
  spades: { symbol: "♠", color: "#0f172a", name: "Spades" },
};

// Casino Chip definitions
const CHIP_VALUES = [
  { val: 10, label: "10", bg: "#2563eb", border: "#1d4ed8", text: "#ffffff" },
  { val: 50, label: "50", bg: "#dc2626", border: "#b91c1c", text: "#ffffff" },
  { val: 100, label: "100", bg: "#059669", border: "#047857", text: "#ffffff" },
  { val: 500, label: "500", bg: "#0f172a", border: "#fbbf24", text: "#fbbf24" },
  { val: 1000, label: "1K", bg: "#d97706", border: "#f59e0b", text: "#ffffff" },
];

// 3D Animated Card Component with realistic dealing slide and 3D card back
function CardView({
  card,
  hidden = false,
  delayMs = 0,
}: {
  card?: PlayingCard;
  hidden?: boolean;
  delayMs?: number;
}) {
  const meta = card ? SUIT_META[card.suit] : null;

  return (
    <div
      className="card-3d-wrapper"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className={`card-3d-inner ${hidden ? "is-hidden" : "is-revealed"}`}>
        {/* Front Face */}
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

        {/* Back Face */}
        <div className="card-face card-face-back">
          <div className="card-back-pattern">
            <span className="card-back-logo">8910</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardGame({
  initialBalance,
  recentHistory,
}: {
  initialBalance: number;
  recentHistory: any[];
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [cardGameMode, setCardGameMode] = useState<"blackjack" | "baccarat" | "dragontiger">("blackjack");
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
    (type: "deal" | "chip" | "snap" | "win" | "bust" | "push") => {
      if (!soundEnabled) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === "deal") {
          // Card swish / whoosh sound
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
          // Card snap onto felt
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
          // Ceramic chip click
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
          // Victory ascending arpeggio
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
        } else if (type === "bust") {
          // Low percussive thud
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === "push") {
          // Neutral chords
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
        }
      } catch {
        // Audio non-fatal
      }
    },
    [soundEnabled, getAudioContext]
  );

  // Round State
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "won" | "push" | "lost">("idle");
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [currentRoundStake, setCurrentRoundStake] = useState(stake);

  // Dealing & Turn Animation state
  const [isDealing, setIsDealing] = useState(false);
  const [isDealerDrawing, setIsDealerDrawing] = useState(false);

  // Visible Cards & Dealer hole card
  const [playerCards, setPlayerCards] = useState<PlayingCard[]>([]);
  const [dealerCards, setDealerCards] = useState<PlayingCard[]>([]);
  const [dealerHoleCard, setDealerHoleCard] = useState<PlayingCard | null>(null);
  const [dealerHoleCardRevealed, setDealerHoleCardRevealed] = useState(false);

  // Hand Scores & Verdicts
  const [playerScore, setPlayerScore] = useState(0);
  const [playerIsSoft, setPlayerIsSoft] = useState(false);
  const [dealerScore, setDealerScore] = useState<number | string>("?");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);

  // Modals
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [showRulesModal, setShowHelpModal] = useState(false);

  // Audit state
  const [auditServerSeed, setAuditServerSeed] = useState("");
  const [auditClientSeed, setAuditClientSeed] = useState("");
  const [auditNonce, setAuditNonce] = useState(1);
  const [auditDeck, setAuditDeck] = useState<PlayingCard[] | null>(null);

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  // Deal initial hand with staged physical dealing sequence
  const handleDeal = useCallback(async () => {
    if (gameStatus === "playing" || isDealing || stake <= 0 || stake > balance) return;

    try {
      setIsDealing(true);
      setBannerMessage(null);
      setLastPayout(null);
      setPlayerCards([]);
      setDealerCards([]);
      setDealerHoleCard(null);
      setDealerHoleCardRevealed(false);
      setCurrentRoundStake(stake);

      playSound("chip");

      // 1. Call server action
      const res = await startBlackjackRound({
        stake,
        clientSeed: customClientSeed.trim() || undefined,
      });

      setActiveRoundId(res.roundId);
      setAuditClientSeed(res.clientSeed);
      setAuditNonce(res.nonce);

      // Staged Card Dealing Motion:
      // Deal card 1: Player (0ms)
      // Deal card 2: Dealer Up (200ms)
      // Deal card 3: Player (400ms)
      // Deal card 4: Dealer Hole (600ms)
      setTimeout(() => {
        playSound("deal");
        setPlayerCards([res.playerCards[0]]);
        setPlayerScore(evaluateHand([res.playerCards[0]]).score);
      }, 80);

      setTimeout(() => {
        playSound("deal");
        setDealerCards([res.dealerUpCard]);
        setDealerScore(evaluateHand([res.dealerUpCard]).score);
      }, 280);

      setTimeout(() => {
        playSound("deal");
        setPlayerCards([res.playerCards[0], res.playerCards[1]]);
        const evalP = evaluateHand(res.playerCards);
        setPlayerScore(evalP.score);
        setPlayerIsSoft(evalP.isSoft);
      }, 500);

      setTimeout(() => {
        playSound("snap");
        setDealerHoleCardRevealed(false);
        setIsDealing(false);

        if (res.status !== "active") {
          // Immediate Natural Blackjack or Push
          setGameStatus(res.status as "won" | "push" | "lost");
          setDealerHoleCardRevealed(true);
          setLastPayout(res.payout);
          setBalance(res.newBalance);

          if (res.isBlackjack) {
            playSound("win");
            setBannerMessage("NATURAL 21 BLACKJACK! Payout 3:2 (+150%)");
          } else if (res.status === "push") {
            playSound("push");
            setBannerMessage("PUSH! Both player & dealer hold Natural 21");
          }
          router.refresh();
        } else {
          setGameStatus("playing");
          setBalance(res.newBalance);
          router.refresh();
        }
      }, 720);
    } catch (err: any) {
      setIsDealing(false);
      alert(err.message || "Failed to start blackjack deal");
      setGameStatus("idle");
    }
  }, [gameStatus, isDealing, stake, balance, customClientSeed, playSound, router]);

  // Player action: "hit" | "stand" | "double"
  const handleAction = useCallback(
    async (action: "hit" | "stand" | "double") => {
      if (gameStatus !== "playing" || isDealerDrawing || !activeRoundId) return;

      try {
        if (action === "double") {
          playSound("chip");
          setCurrentRoundStake((prev) => prev * 2);
        } else if (action === "hit") {
          playSound("deal");
        }

        const res = await playerBlackjackAction({
          roundId: activeRoundId,
          action,
        });

        // Update player cards
        setPlayerCards(res.playerCards);
        const evalP = evaluateHand(res.playerCards);
        setPlayerScore(evalP.score);
        setPlayerIsSoft(evalP.isSoft);

        if (res.status === "active") {
          // Still active after hit
          playSound("snap");
          return;
        }

        // Round concluding: reveal dealer hole card & draw cards step-by-step
        setIsDealerDrawing(true);
        setDealerHoleCardRevealed(true);
        playSound("snap");

        // Staged dealer card draw animation
        const finalDealerCards = res.dealerCards;
        let currentDrawIdx = 1; // already have dealerCards[0]

        const drawNextDealerCard = () => {
          if (currentDrawIdx < finalDealerCards.length) {
            playSound("deal");
            setDealerCards(finalDealerCards.slice(0, currentDrawIdx + 1));
            setDealerScore(evaluateHand(finalDealerCards.slice(0, currentDrawIdx + 1)).score);
            currentDrawIdx++;
            setTimeout(drawNextDealerCard, 500);
          } else {
            // All cards drawn, settle outcome
            setIsDealerDrawing(false);
            setGameStatus(res.status as "won" | "push" | "lost");
            setDealerCards(res.dealerCards);
            setDealerScore(res.dealerScore);
            setLastPayout(res.payout);
            setBalance(res.newBalance);

            if (res.serverSeed) {
              setAuditServerSeed(res.serverSeed);
            }

            if (res.status === "won") {
              playSound("win");
              if (res.dealerScore > 21) {
                setBannerMessage(`DEALER BUSTS (${res.dealerScore})! YOU WIN!`);
              } else {
                setBannerMessage(`YOU WIN! ${res.playerScore} beats Dealer ${res.dealerScore}`);
              }
            } else if (res.status === "push") {
              playSound("push");
              setBannerMessage(`PUSH! Hand tied at ${res.playerScore}`);
            } else {
              playSound("bust");
              if (res.playerScore > 21) {
                setBannerMessage(`BUST (${res.playerScore})! Dealer wins.`);
              } else {
                setBannerMessage(`DEALER WINS (${res.dealerScore} vs ${res.playerScore})`);
              }
            }

            router.refresh();
          }
        };

        // Start dealer draw sequence
        setTimeout(drawNextDealerCard, 450);
      } catch (err: any) {
        setIsDealerDrawing(false);
        alert(err.message || `Failed to execute ${action}`);
      }
    },
    [gameStatus, isDealerDrawing, activeRoundId, playSound, router]
  );

  // Keyboard Shortcuts (Space: Deal, H: Hit, S: Stand, D: Double)
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

      if (e.code === "Space" && gameStatus !== "playing") {
        e.preventDefault();
        handleDeal();
      } else if (e.key.toLowerCase() === "h" && gameStatus === "playing") {
        e.preventDefault();
        handleAction("hit");
      } else if (e.key.toLowerCase() === "s" && gameStatus === "playing") {
        e.preventDefault();
        handleAction("stand");
      } else if (
        e.key.toLowerCase() === "d" &&
        gameStatus === "playing" &&
        playerCards.length === 2 &&
        currentRoundStake <= balance
      ) {
        e.preventDefault();
        handleAction("double");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleDeal,
    handleAction,
    gameStatus,
    playerCards.length,
    currentRoundStake,
    balance,
    showRulesModal,
    showFairnessModal,
  ]);

  // Chip Selector increment
  const addChip = (val: number) => {
    if (gameStatus === "playing" || isDealing) return;
    playSound("chip");
    setStake((prev) => Math.min(Math.floor(balance), prev + val));
  };

  const clearBet = () => {
    if (gameStatus === "playing" || isDealing) return;
    playSound("chip");
    setStake(10);
  };

  const doubleBet = () => {
    if (gameStatus === "playing" || isDealing) return;
    playSound("chip");
    setStake((prev) => Math.min(Math.floor(balance), prev * 2));
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
    <div className="sim-game-wrapper">
      {/* Header Banner */}
      <div className="sim-game-header">
        <div className="sim-header-titles">
          <div className="sim-game-badge">
            <Sparkles size={16} className="text-sky-400 inline mr-1" />
            PROVABLY FAIR 52-CARD VEGAS SHOE
          </div>
          <h1 className="sim-game-name">Club Cards · Blackjack 21</h1>
          <p className="sim-game-sub">
            Real Card Dealing Motion · 3D Dealer Hole Card Reveal · Cryptographic Fisher-Yates
          </p>
        </div>

        <div className="sim-meta-chips">
          <div className="sim-chip">
            <span className="sim-chip-k">Balance:</span>
            <span className="sim-chip-v">{balance.toFixed(2)} Pts</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            className="sim-fair-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Card Audio" : "Enable Card Audio"}
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
            onClick={() => setShowHelpModal(true)}
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

      {/* Card Games Tab Bar */}
      <div className="card-games-tab-bar">
        <button
          type="button"
          className={`card-tab-btn ${cardGameMode === "blackjack" ? "active" : ""}`}
          onClick={() => setCardGameMode("blackjack")}
        >
          ♠ Blackjack 21
        </button>
        <button
          type="button"
          className={`card-tab-btn ${cardGameMode === "baccarat" ? "active" : ""}`}
          onClick={() => setCardGameMode("baccarat")}
        >
          ♥ Baccarat (Punto Banco)
        </button>
        <button
          type="button"
          className={`card-tab-btn ${cardGameMode === "dragontiger" ? "active" : ""}`}
          onClick={() => setCardGameMode("dragontiger")}
        >
          ♦ Dragon Tiger
        </button>
      </div>

      {cardGameMode === "baccarat" ? (
        <BaccaratGame initialBalance={balance} />
      ) : cardGameMode === "dragontiger" ? (
        <DragonTigerGame initialBalance={balance} />
      ) : (
        /* Main Table Felt Arena */
        <div className="sim-arena-grid">
        {/* Felt Table Cabinet */}
        <div className="blackjack-felt-cabinet high-roller-felt">
          {/* Top Physical Card Shoe & Table Arc */}
          <div className="felt-top-bar">
            <div className="felt-table-arc">
              <span>BLACKJACK PAYS 3 TO 2 · DEALER MUST STAND ON 17 AND DRAW TO 16</span>
            </div>

            {/* 3D Physical Shoe Dispenser */}
            <div className="felt-shoe-box">
              <div className="shoe-lid" />
              <div className="shoe-deck-stack">
                <span className="shoe-deck-label">52 CARDS</span>
              </div>
            </div>
          </div>

          {/* Dealer Area */}
          <div className="felt-hand-zone dealer-zone">
            <div className="felt-zone-header">
              <span className="felt-zone-title">DEALER</span>
              <span className="felt-score-tag">
                Score: {dealerHoleCardRevealed ? dealerScore : dealerScore}
                {Number(dealerScore) > 21 && " (BUST)"}
              </span>
            </div>

            <div className="felt-cards-tray">
              {dealerCards.map((card, idx) => (
                <CardView key={`dealer-${idx}`} card={card} delayMs={idx * 140} />
              ))}
              {!dealerHoleCardRevealed && gameStatus === "playing" && (
                <CardView hidden={true} delayMs={240} />
              )}
            </div>
          </div>

          {/* Center Banner / Status Notification */}
          <div className="felt-center-banner">
            {bannerMessage ? (
              <div
                className={`felt-status-badge ${
                  gameStatus === "won"
                    ? "status-win"
                    : gameStatus === "push"
                    ? "status-push"
                    : "status-lost"
                }`}
              >
                {gameStatus === "won" && <Trophy size={16} className="inline mr-1" />}
                {bannerMessage}
                {lastPayout !== null && lastPayout > 0 && (
                  <span className="felt-status-payout"> (+{lastPayout.toFixed(2)} Pts)</span>
                )}
              </div>
            ) : gameStatus === "playing" ? (
              <div className="felt-status-badge status-playing">
                <span>HIT [H], STAND [S], OR DOUBLE DOWN [D]</span>
              </div>
            ) : (
              <div className="felt-status-badge status-idle">
                <Coins size={14} className="inline mr-1" />
                <span>PLACE YOUR CHIPS AND PRESS DEAL [SPACE]</span>
              </div>
            )}
          </div>

          {/* Player Area */}
          <div className="felt-hand-zone player-zone">
            <div className="felt-zone-header">
              <span className="felt-zone-title">PLAYER (YOU)</span>
              <span className="felt-score-tag">
                Score: {playerScore > 0 ? (playerIsSoft ? `Soft ${playerScore}` : playerScore) : 0}
                {playerScore > 21 && " (BUST)"}
                {playerScore === 21 && playerCards.length === 2 && " (BLACKJACK 3:2)"}
              </span>
            </div>

            <div className="felt-cards-tray">
              {playerCards.map((card, idx) => (
                <CardView key={`player-${idx}`} card={card} delayMs={idx * 140} />
              ))}
              {playerCards.length === 0 && !isDealing && (
                <div className="felt-empty-hand-prompt">Place chips and press DEAL...</div>
              )}
            </div>
          </div>

          {/* Table Felt Chip Spot */}
          <div className="felt-table-bet-spot">
            <div className="felt-bet-circle">
              <span className="felt-bet-caption">BET</span>
              <div className="felt-chip-display">
                <Coins size={16} className="text-amber-400 inline mr-1" />
                <span>{currentRoundStake} Pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls Panel with Physical Casino Chips & Hotkeys */}
        <div className="sim-controls-card">
          {gameStatus === "playing" ? (
            /* Active Round Controls (Hit, Stand, Double) */
            <div className="sim-control-group">
              <div className="flex items-center justify-between mb-2">
                <label className="sim-control-label">
                  Active Bet: <strong>{currentRoundStake} Pts</strong>
                </label>
                <span className="text-xs text-sky-400 font-bold">Round In Play</span>
              </div>

              <div className="bj-actions-grid">
                <button
                  type="button"
                  disabled={isDealerDrawing}
                  className="bj-action-btn hit"
                  onClick={() => handleAction("hit")}
                >
                  <span className="bj-btn-main">HIT</span>
                  <span className="bj-btn-hotkey">[H] +1 Card</span>
                </button>

                <button
                  type="button"
                  disabled={isDealerDrawing}
                  className="bj-action-btn stand"
                  onClick={() => handleAction("stand")}
                >
                  <span className="bj-btn-main">STAND</span>
                  <span className="bj-btn-hotkey">[S] Hold Hand</span>
                </button>

                <button
                  type="button"
                  disabled={
                    isDealerDrawing ||
                    playerCards.length !== 2 ||
                    currentRoundStake > balance
                  }
                  className="bj-action-btn double"
                  onClick={() => handleAction("double")}
                >
                  <span className="bj-btn-main">DOUBLE</span>
                  <span className="bj-btn-hotkey">[D] 2x Bet</span>
                </button>
              </div>
            </div>
          ) : (
            /* Idle Stake & Physical Casino Chips */
            <div className="sim-control-group">
              <div className="flex items-center justify-between mb-2">
                <label className="sim-control-label">Bet Amount (Pts)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="bj-chip-mod-btn"
                    onClick={clearBet}
                    title="Reset to 10"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="bj-chip-mod-btn"
                    onClick={doubleBet}
                    title="Double Bet"
                  >
                    2x
                  </button>
                </div>
              </div>

              {/* Physical Casino Chips Rack */}
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

              {/* Direct Stake Input */}
              <div className="slot-bet-stepper" style={{ marginTop: 12 }}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 0))}
                  className="sim-input text-center font-bold text-base"
                />
              </div>

              <div className="sim-actions-stack" style={{ marginTop: 16 }}>
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
                      <span className="cherry-btn-text">DEAL ({stake} Pts)</span>
                      <span className="cherry-space-badge">SPACE</span>
                    </>
                  )}
                </button>
              </div>

              {/* Client Seed Customizer */}
              <div className="sim-control-group" style={{ marginTop: 16 }}>
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
          )}
        </div>
      </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="sim-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div
            className="sim-modal-dialog"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sim-modal-head">
              <div className="sim-modal-title">
                <HelpCircle size={18} className="text-sky-400" />
                Club Cards · Standard Vegas Rules
              </div>
              <button
                type="button"
                className="sim-modal-close"
                onClick={() => setShowHelpModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sim-modal-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <p>
                Blackjack is played against the virtual dealer. The objective is to achieve a hand value
                closer to 21 than the dealer without busting (exceeding 21).
              </p>
              <ul style={{ paddingLeft: 20, marginTop: 10 }}>
                <li>Aces count as either 1 or 11, whichever gives the player the best non-busting total.</li>
                <li>Face cards (Jack, Queen, King) count as 10. Cards 2 through 10 count at face value.</li>
                <li>A natural 2-card 21 (Ace + 10-value card) pays <strong>3 to 2 (2.5x total payout)</strong>.</li>
                <li>Dealer must draw on cards totaling 16 or lower, and stand on all 17s (hard and soft).</li>
                <li><strong>Double Down:</strong> Allowed on the initial 2-card hand. Doubles the stake and draws exactly one additional card.</li>
                <li>Push (tie) returns 100% of your stake with zero deduction.</li>
                <li><strong>Keyboard Shortcuts:</strong> Press <strong>SPACE</strong> to deal, <strong>[H]</strong> to Hit, <strong>[S]</strong> to Stand, <strong>[D]</strong> to Double Down.</li>
              </ul>
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
                Blackjack 52-Card Shoe Provably Fair Auditor
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
                Before every round, a fresh 52-card deck is shuffled using the cryptographic
                Fisher-Yates algorithm seeded with HMAC-SHA512(serverSeed, `${'{clientSeed}'}:${'{nonce}'}:cards`).
                You can independently audit any completed shoe sequence below.
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
                  Verify Shuffled Shoe
                </button>
              </div>

              {auditDeck && (
                <div className="sim-audit-result" style={{ marginTop: 16 }}>
                  <div className="sim-audit-row">
                    <span className="sim-audit-k">SHA-256 Hash of Server Seed:</span>
                    <span className="sim-audit-v">{hashServerSeed(auditServerSeed)}</span>
                  </div>
                  <div className="sim-audit-row">
                    <span className="sim-audit-k">First 10 Cards Dealt From Shoe:</span>
                    <span className="sim-audit-v">
                      {auditDeck
                        .slice(0, 10)
                        .map((c) => `${c.rank}${SUIT_META[c.suit].symbol}`)
                        .join(", ")}
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
        <h3 className="sim-history-title">Recent Blackjack Hands</h3>
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
                    No recent blackjack hands recorded yet. Deal a hand to start!
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
                          item.status === "won"
                            ? "won"
                            : item.status === "push"
                            ? "push"
                            : "lost"
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

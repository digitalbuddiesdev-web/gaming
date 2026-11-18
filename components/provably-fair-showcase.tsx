import Link from "next/link";
import Image from "next/image";
import { Rocket, Bomb, CircleDot, Flame, ShieldCheck, Zap, Sparkles, Crown } from "lucide-react";

export const PROVABLY_FAIR_GAMES = [
  {
    name: "Apex Slots",
    slug: "slots",
    href: "/play/slots",
    image: "/images/games/slots.png",
    tag: "97.5% RTP · 20 Paylines",
    desc: "5x3 Neon Matrix with Wilds, Scatters, and cryptographic HMAC-SHA512 reel strips.",
    icon: Sparkles,
    color: "#f59e0b",
    bg: "linear-gradient(135deg, rgba(254,243,199,0.7) 0%, rgba(253,230,138,0.3) 100%)",
    border: "#fde68a",
  },
  {
    name: "Club Cards",
    slug: "cards",
    href: "/play/cards",
    image: "/images/games/cards.png",
    tag: "99.5% RTP · Blackjack 21",
    desc: "52-card shoe Fisher-Yates shuffle. Natural 21 blackjack 3:2 and dealer stands on 17.",
    icon: Crown,
    color: "#059669",
    bg: "linear-gradient(135deg, rgba(236,253,245,0.8) 0%, rgba(209,250,229,0.4) 100%)",
    border: "#a7f3d0",
  },
  {
    name: "Roulette Royale",
    slug: "roulette",
    href: "/play/roulette",
    image: "/images/games/roulette.png",
    tag: "97.3% RTP · European Wheel",
    desc: "37-pocket single-zero wheel. Full felt betting board, Red/Black, Dozens & 35:1 Straight-Ups.",
    icon: CircleDot,
    color: "#dc2626",
    bg: "linear-gradient(135deg, rgba(254,242,242,0.8) 0%, rgba(254,202,202,0.4) 100%)",
    border: "#fecaca",
  },
  {
    name: "Crash Rocket",
    slug: "crash",
    href: "/play/crash",
    image: "/images/games/crash.png",
    tag: "99.0% RTP · Up to 2,500x",
    desc: "Exponential HMAC-SHA256 multiplier curve. Cash out before the rocket detonates.",
    icon: Rocket,
    color: "#059669",
    bg: "linear-gradient(135deg, rgba(236,253,245,0.7) 0%, rgba(209,250,229,0.3) 100%)",
    border: "#a7f3d0",
  },
  {
    name: "Mines Matrix",
    slug: "mines",
    href: "/play/mines",
    image: "/images/games/mines.png",
    tag: "98.0% RTP · 24 Mines Max",
    desc: "5x5 cryptographic Fisher-Yates grid. Uncover gems and multiply your stake.",
    icon: Bomb,
    color: "#0284c7",
    bg: "linear-gradient(135deg, rgba(240,249,255,0.7) 0%, rgba(224,242,254,0.3) 100%)",
    border: "#bae6fd",
  },
  {
    name: "Plinko Physics",
    slug: "plinko",
    href: "/play/plinko",
    image: "/images/games/plinko.png",
    tag: "98.5% RTP · Up to 1,000x",
    desc: "Cascading Bernoulli pegboard drops. Real-time pin collisions and multiplier buckets.",
    icon: CircleDot,
    color: "#7c3aed",
    bg: "linear-gradient(135deg, rgba(250,245,255,0.7) 0%, rgba(243,232,255,0.3) 100%)",
    border: "#e9d5ff",
  },
  {
    name: "Tower Ascent",
    slug: "tower",
    href: "/play/tower",
    image: "/images/games/tower.png",
    tag: "98.0% RTP · 8 Floors Summit",
    desc: "Multi-tiered recursive hash chaining. Dodge traps and climb towards the summit.",
    icon: Flame,
    color: "#d97706",
    bg: "linear-gradient(135deg, rgba(254,252,232,0.7) 0%, rgba(254,243,199,0.3) 100%)",
    border: "#fde68a",
  },
];

export function ProvablyFairShowcase() {
  return (
    <section className="sim-originals-section">
      <div className="showcase-head">
        <div className="showcase-heading">
          <ShieldCheck className="showcase-head-icon" />
          <h2 className="showcase-title">Provably Fair Originals</h2>
        </div>
        <span className="showcase-badge">
          <Zap className="showcase-badge-icon" /> Cryptographic Integrity
        </span>
      </div>

      <div className="showcase-grid">
        {PROVABLY_FAIR_GAMES.map((og) => {
          const IconComponent = og.icon;
          return (
            <Link
              key={og.slug}
              href={og.href}
              className="sim-original-card showcase-game"
              style={{ background: og.bg, borderColor: og.border }}
            >
              <div className="showcase-game-banner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={og.image}
                  alt={og.name}
                  className="showcase-game-image"
                  loading="lazy"
                />
                <span className="showcase-tag-floating">{og.tag}</span>
              </div>

              <div className="showcase-game-info">
                <div className="showcase-title-row">
                  <span className="showcase-icon" style={{ color: og.color }}>
                    <IconComponent className="showcase-game-icon" />
                  </span>
                  <h3 className="showcase-name">{og.name}</h3>
                </div>
                <p className="showcase-desc">{og.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

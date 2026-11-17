import Link from "next/link";
import { Rocket, Bomb, CircleDot, Flame, ShieldCheck, Zap } from "lucide-react";

const PROVABLY_FAIR_GAMES = [
  {
    name: "Crash Rocket",
    slug: "crash",
    href: "/play/crash",
    tag: "99.0% RTP · Up to 2,500x",
    desc: "Exponential HMAC-SHA256 multiplier curve. Cash out before the rocket detonates.",
    icon: Rocket,
    color: "#059669",
    bg: "linear-gradient(135deg, rgba(236,253,245,0.9) 0%, rgba(209,250,229,0.5) 100%)",
    border: "#a7f3d0",
  },
  {
    name: "Mines Matrix",
    slug: "mines",
    href: "/play/mines",
    tag: "98.0% RTP · 24 Mines Max",
    desc: "5x5 cryptographic Fisher-Yates grid. Uncover gems and multiply your stake.",
    icon: Bomb,
    color: "#0284c7",
    bg: "linear-gradient(135deg, rgba(240,249,255,0.9) 0%, rgba(224,242,254,0.5) 100%)",
    border: "#bae6fd",
  },
  {
    name: "Plinko Physics",
    slug: "plinko",
    href: "/play/plinko",
    tag: "98.5% RTP · Up to 1,000x",
    desc: "Cascading Bernoulli pegboard drops. Real-time pin collisions and multiplier buckets.",
    icon: CircleDot,
    color: "#7c3aed",
    bg: "linear-gradient(135deg, rgba(250,245,255,0.9) 0%, rgba(243,232,255,0.5) 100%)",
    border: "#e9d5ff",
  },
  {
    name: "Tower Ascent",
    slug: "tower",
    href: "/play/tower",
    tag: "98.0% RTP · 8 Floors Summit",
    desc: "Multi-tiered recursive hash chaining. Dodge traps and climb towards the summit.",
    icon: Flame,
    color: "#d97706",
    bg: "linear-gradient(135deg, rgba(254,252,232,0.9) 0%, rgba(254,243,199,0.5) 100%)",
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
          <Zap className="showcase-badge-icon" /> Unbreakable Cryptography
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
              <div className="showcase-game-head">
                <span className="showcase-icon" style={{ color: og.color }}>
                  <IconComponent className="showcase-game-icon" />
                </span>
                <span className="showcase-tag">{og.tag}</span>
              </div>
              <h3 className="showcase-name">{og.name}</h3>
              <p className="showcase-desc">{og.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

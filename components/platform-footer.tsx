"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Scale,
  Zap,
  HelpCircle,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  X,
  Radio,
  FileText,
  ChevronDown,
} from "lucide-react";

export function PlatformFooter({ brandName }: { brandName: string }) {
  const [activeModal, setActiveModal] = useState<
    "responsible" | "fairness" | "terms" | "support" | null
  >(null);

  // Accordion dropdown state for mobile view
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({
    sportsbook: false,
    casino: false,
    fairness: false,
    protection: false,
  });

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <footer className="platform-luxury-footer" role="contentinfo">
      <div className="footer-inner-container">
        {/* 1. Value Proposition & Trust Badges Strip */}
        <div className="footer-trust-strip">
          <div className="footer-trust-col">
            <div className="trust-icon-box">
              <ShieldCheck size={22} className="text-sky-400" />
            </div>
            <div className="trust-text-group">
              <span className="trust-title">256-Bit SSL Encryption</span>
              <span className="trust-sub">Military-grade cold vault data isolation</span>
            </div>
          </div>

          <div className="footer-trust-col">
            <div className="trust-icon-box">
              <Scale size={22} className="text-sky-400" />
            </div>
            <div className="trust-text-group">
              <span className="trust-title">Provably Fair Consensus</span>
              <span className="trust-sub">HMAC-SHA512 cryptographic verification</span>
            </div>
          </div>

          <div className="footer-trust-col">
            <div className="trust-icon-box">
              <Zap size={22} className="text-sky-400" />
            </div>
            <div className="trust-text-group">
              <span className="trust-title">High-Frequency Settlement</span>
              <span className="trust-sub">Instant sub-second bet grading engine</span>
            </div>
          </div>

          <div className="footer-trust-col">
            <div className="trust-icon-box">
              <HeartHandshake size={22} className="text-sky-400" />
            </div>
            <div className="trust-text-group">
              <span className="trust-title">Responsible Gaming</span>
              <span className="trust-sub">18+ strictly enforced &amp; self-exclusion</span>
            </div>
          </div>
        </div>

        {/* 2. Main Navigation Columns (Responsive Grid / Mobile Dropdown) */}
        <div className="footer-main-grid">
          {/* Brand & Mission Column */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <img
                src="/images/brand-logo.jpg"
                alt="Brand Logo"
                className="footer-brand-logo-img"
              />
              <span className="footer-brand-tag">APEX EXCHANGE</span>
            </div>
            <p className="footer-brand-bio">
              Next-generation autonomous sports exchange and provably fair casino suite.
              Engineered for high-frequency in-play sportsbooks, single-zero European
              roulette, Vegas-grade blackjack, and cryptographic arcade experiences.
            </p>
            <div className="footer-status-pill">
              <Radio size={14} className="text-emerald-400 animate-pulse" />
              <span>Operational · Sub-second Odds Engine</span>
            </div>
          </div>

          {/* Sportsbook Dropdown Column */}
          <div className={`footer-nav-col ${openDropdowns.sportsbook ? "open" : ""}`}>
            <button
              type="button"
              className="footer-col-header-btn"
              onClick={() => toggleDropdown("sportsbook")}
              aria-expanded={openDropdowns.sportsbook}
            >
              <span className="footer-col-heading">Sportsbook</span>
              <ChevronDown size={16} className="footer-col-chevron" />
            </button>
            <ul className="footer-link-list">
              <li><Link href="/play/sports">Live In-Play Matches</Link></li>
              <li><Link href="/play/sports">Cricket Exchange</Link></li>
              <li><Link href="/play/sports">Premier Football &amp; Soccer</Link></li>
              <li><Link href="/play/sports">Grand Slam Tennis</Link></li>
              <li><Link href="/play/sports">Pro Basketball</Link></li>
              <li><Link href="/play/virtual">Virtual Sports Arena</Link></li>
            </ul>
          </div>

          {/* Casino Originals Dropdown Column */}
          <div className={`footer-nav-col ${openDropdowns.casino ? "open" : ""}`}>
            <button
              type="button"
              className="footer-col-header-btn"
              onClick={() => toggleDropdown("casino")}
              aria-expanded={openDropdowns.casino}
            >
              <span className="footer-col-heading">Casino Originals</span>
              <ChevronDown size={16} className="footer-col-chevron" />
            </button>
            <ul className="footer-link-list">
              <li><Link href="/play/roulette">Roulette Royale (European 0)</Link></li>
              <li><Link href="/play/cards">Club Cards (Blackjack 21)</Link></li>
              <li><Link href="/play/slots">Apex Slots (Cherry Charm)</Link></li>
              <li><Link href="/play/mines">Mines Matrix (5x5 Field)</Link></li>
              <li><Link href="/play/plinko">Plinko Physics Simulator</Link></li>
              <li><Link href="/play/tower">Tower Ascent (8-Floor)</Link></li>
              <li><Link href="/play/crash">Crash Rocket Multiplier</Link></li>
            </ul>
          </div>

          {/* Provably Fair Dropdown Column */}
          <div className={`footer-nav-col ${openDropdowns.fairness ? "open" : ""}`}>
            <button
              type="button"
              className="footer-col-header-btn"
              onClick={() => toggleDropdown("fairness")}
              aria-expanded={openDropdowns.fairness}
            >
              <span className="footer-col-heading">Fairness &amp; Security</span>
              <ChevronDown size={16} className="footer-col-chevron" />
            </button>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("fairness")}
                  className="footer-modal-trigger-btn"
                >
                  Provably Fair Auditor
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("fairness")}
                  className="footer-modal-trigger-btn"
                >
                  HMAC-SHA256 Commitments
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("fairness")}
                  className="footer-modal-trigger-btn"
                >
                  RNG Mathematical Proofs
                </button>
              </li>
              <li><Link href="/play/statement">Player Account Ledger</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("terms")}
                  className="footer-modal-trigger-btn"
                >
                  Wagering &amp; Escrow Rules
                </button>
              </li>
            </ul>
          </div>

          {/* Protection & Support Dropdown Column */}
          <div className={`footer-nav-col ${openDropdowns.protection ? "open" : ""}`}>
            <button
              type="button"
              className="footer-col-header-btn"
              onClick={() => toggleDropdown("protection")}
              aria-expanded={openDropdowns.protection}
            >
              <span className="footer-col-heading">Player Protection</span>
              <ChevronDown size={16} className="footer-col-chevron" />
            </button>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("responsible")}
                  className="footer-modal-trigger-btn highlight-gold"
                >
                  18+ Responsible Gaming
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("responsible")}
                  className="footer-modal-trigger-btn"
                >
                  Self-Exclusion Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("terms")}
                  className="footer-modal-trigger-btn"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("support")}
                  className="footer-modal-trigger-btn"
                >
                  24/7 VIP Concierge Support
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("support")}
                  className="footer-modal-trigger-btn"
                >
                  Dispute Resolution Desk
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Accepted Payment & Settlement Rails Strip */}
        <div className="footer-payment-strip">
          <span className="payment-label">Supported Settlement Rails &amp; Gateways:</span>
          <div className="payment-badges-row">
            <span className="pay-badge">Bitcoin (BTC)</span>
            <span className="pay-badge">Ethereum (ETH)</span>
            <span className="pay-badge">USDT Tether</span>
            <span className="pay-badge">Solana (SOL)</span>
            <span className="pay-badge">Visa Fast-Funds</span>
            <span className="pay-badge">Mastercard Identity</span>
            <span className="pay-badge">Apple Pay</span>
            <span className="pay-badge">Google Pay</span>
            <span className="pay-badge">Instant Bank Wire</span>
          </div>
        </div>

        {/* 4. Responsible Gaming 18+ Warning Banner */}
        <div className="footer-warning-banner">
          <div className="warning-badge-18">18+</div>
          <p className="warning-text">
            Gambling can be addictive and carries financial risk. Play responsibly and only wager what
            you can afford to lose. All sports betting and casino products are strictly restricted to
            persons of legal age (18+ or the legal age of majority in your jurisdiction). If you or
            someone you know has a gambling issue, please contact national gambling helpline resources.
          </p>
        </div>

        {/* 5. Copyright & System Telemetry Bottom Strip */}
        <div className="footer-bottom-bar">
          <div className="footer-copy-text">
            &copy; {new Date().getFullYear()} Apex Exchange &bull; {brandName}. All rights reserved.
            Operated under international fair gaming protocols.
          </div>
          <div className="footer-telemetry">
            <span className="telemetry-item">
              <span className="telemetry-dot online" /> Node: APEX-PROD-EAST
            </span>
            <span className="telemetry-item">Latency: 12ms</span>
            <span className="telemetry-item">Uptime: 99.99%</span>
            <span className="telemetry-item">Build: v4.2.8</span>
          </div>
        </div>
      </div>

      {/* Modals for Footer Triggers */}
      {activeModal && (
        <div className="sim-modal-overlay" onClick={() => setActiveModal(null)}>
          <div
            className="sim-modal-dialog"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sim-modal-head">
              <div className="sim-modal-title flex items-center gap-2">
                {activeModal === "responsible" && <HeartHandshake size={20} className="text-amber-400" />}
                {activeModal === "fairness" && <ShieldCheck size={20} className="text-sky-400" />}
                {activeModal === "terms" && <FileText size={20} className="text-sky-400" />}
                {activeModal === "support" && <HelpCircle size={20} className="text-sky-400" />}
                <span>
                  {activeModal === "responsible" && "Responsible Gaming & Player Safeguards"}
                  {activeModal === "fairness" && "Provably Fair Cryptographic Architecture"}
                  {activeModal === "terms" && "Terms of Service & Wagering Rules"}
                  {activeModal === "support" && "24/7 VIP Concierge & Dispute Resolution"}
                </span>
              </div>
              <button
                type="button"
                className="sim-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sim-modal-body" style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
              {activeModal === "responsible" && (
                <div className="space-y-3">
                  <p>
                    We are dedicated to providing an entertaining and fair betting experience while
                    actively safeguarding vulnerable players.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                    <li><strong>Daily / Weekly Deposit Limits:</strong> Cap your daily or weekly maximum stake exposure.</li>
                    <li><strong>Cool-Off Period:</strong> Temporarily suspend account wagering for 24 hours, 7 days, or 30 days.</li>
                    <li><strong>Self-Exclusion:</strong> Permanently block account access with automatic forfeit of promotional balances.</li>
                    <li><strong>Underage Prevention:</strong> Automated identity verification ensures no individuals under 18 years of age place bets.</li>
                  </ul>
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Need immediate assistance? Free confidential help is available 24/7 via
                    the National Problem Gambling Helpline (1-800-522-4700).
                  </p>
                </div>
              )}

              {activeModal === "fairness" && (
                <div className="space-y-3">
                  <p>
                    Every spin, deal, drop, and roll across our platform uses mathematically unalterable
                    cryptographic hashing algorithms.
                  </p>
                  <div className="p-3 bg-slate-900 text-sky-300 font-mono text-xs rounded-lg">
                    HMAC_SHA512(ServerSeed, ClientSeed : Nonce : GameType)
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                    <li>The Server Seed is generated and hashed via SHA-256 before any round begins.</li>
                    <li>Players can customize or randomize their own Client Seed at any time.</li>
                    <li>Once a round concludes, the unhashed Server Seed is revealed, enabling third-party verification.</li>
                  </ul>
                </div>
              )}

              {activeModal === "terms" && (
                <div className="space-y-3">
                  <p>
                    All wagers, exchange trades, and casino rounds are governed by international
                    betting standards.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                    <li><strong>Match Settlement:</strong> Sports odds are graded against official governing body results (ICC, FIFA, ATP, NBA).</li>
                    <li><strong>Payout Integrity:</strong> Winning wagers credit immediately upon event finalization.</li>
                    <li><strong>Fair Play:</strong> Sybil attacks, latency arbitrage bots, and duplicate accounts result in immediate suspension.</li>
                  </ul>
                </div>
              )}

              {activeModal === "support" && (
                <div className="space-y-3">
                  <p>
                    Our VIP Concierge team operates 24 hours a day, 365 days a year to assist
                    with account questions, settlement audits, and technical queries.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-xs text-slate-800">Live Concierge Chat</div>
                      <div className="text-[11px] text-slate-500 mt-1">Average response time: &lt; 45 seconds</div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-xs text-slate-800">Audit Desk Email</div>
                      <div className="text-[11px] text-slate-500 mt-1">support@apex-exchange.casino</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

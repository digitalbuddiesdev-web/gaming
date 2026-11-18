"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions";
import {
  Search,
  User,
  ChevronDown,
  Menu,
  X,
  FileSpreadsheet,
  ScrollText,
  TrendingUp,
  Trophy,
  Gamepad2,
  LogOut,
  HelpCircle,
} from "lucide-react";

export function PlayerHeader({
  brandName,
  username,
  balance,
  exposure,
  mode,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onToggleMobileSearch,
  isMobileSearchOpen,
}: {
  brandName: string;
  username: string;
  balance: string;
  exposure: string;
  mode?: "real" | "demo";
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileSearch?: () => void;
  isMobileSearchOpen?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="ref-topbar">
        {/* Brand & Mobile Hamburger */}
        <div className="ref-brand-zone">
          <button
            type="button"
            className="ref-mobile-burger-btn"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/play" className="ref-brand-logo-custom" title={brandName}>
            <img
              src="/images/brand-logo.jpg"
              alt={brandName}
              className="ref-brand-img-logo"
            />
          </Link>
        </div>

        {/* Desktop Global Search Bar */}
        <form action="/play/sports" className="ref-search-wrap ref-search-desktop" role="search">
          <Search size={14} className="ref-search-icon" />
          <input
            type="search"
            name="q"
            className="ref-search-input"
            placeholder="Search matches, leagues..."
            aria-label="Search"
          />
        </form>

        <div className="ref-spacer" />

        {/* Mobile Search Toggle Icon */}
        <button
          type="button"
          className={`ref-mobile-search-toggle ${isMobileSearchOpen ? "active" : ""}`}
          onClick={onToggleMobileSearch}
          aria-label="Toggle search"
          aria-expanded={isMobileSearchOpen}
        >
          <Search size={16} />
        </button>

        {/* User Status Bar & Interactive Dropdown */}
        <div className="ref-user-meta">
          <Link className="ref-rules-link" href="/play/statement">
            Rules
          </Link>

          <div className="ref-balance-chip" title={`Exposure: ${exposure}`}>
            <div className="ref-bal-segment">
              <span className="ref-bal-label">Bal:</span>
              <span className="ref-bal-val">{balance}</span>
            </div>
            <div className="ref-exp-segment">
              <span className="ref-exp-label">Exp:</span>
              <span className="ref-exp-val">{exposure}</span>
            </div>
          </div>

          {/* Interactive Dropdown */}
          <div className="ref-account-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`ref-user-badge-btn ${dropdownOpen ? "active" : ""}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
            >
              <User size={14} className="ref-user-icon" />
              <span className="ref-username-text">{username}</span>
              <ChevronDown size={12} className={`ref-caret ${dropdownOpen ? "open" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="ref-dropdown-menu-active">
                <div className="ref-dropdown-header">
                  <span className="ref-dropdown-user-title">{username}</span>
                  <span className="ref-mode-pill">{mode === "demo" ? "DEMO BOOK" : "REAL PLAY"}</span>
                </div>

                <div className="ref-dropdown-divider" />

                <Link
                  href="/play/statement"
                  className="ref-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <FileSpreadsheet size={14} className="ref-menu-icon" />
                  <span>Account Statement</span>
                </Link>
                <Link
                  href="/play/statement#bets"
                  className="ref-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <ScrollText size={14} className="ref-menu-icon" />
                  <span>Current Bets</span>
                </Link>
                <Link
                  href="/play/statement#totals"
                  className="ref-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <TrendingUp size={14} className="ref-menu-icon" />
                  <span>Profit & Loss Summary</span>
                </Link>
                <Link
                  href="/play/sports"
                  className="ref-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Trophy size={14} className="ref-menu-icon" />
                  <span>Sports Markets</span>
                </Link>
                <Link
                  href="/play/casino"
                  className="ref-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Gamepad2 size={14} className="ref-menu-icon" />
                  <span>Casino Lobby</span>
                </Link>
                <Link
                  href="/play/statement"
                  className="ref-menu-item ref-mobile-only-menu-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <HelpCircle size={14} className="ref-menu-icon" />
                  <span>Rules & Regulations</span>
                </Link>

                <div className="ref-dropdown-divider" />

                <form action={logout} className="ref-logout-form">
                  <button type="submit" className="ref-menu-item ref-logout-btn">
                    <LogOut size={14} className="ref-menu-icon danger" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

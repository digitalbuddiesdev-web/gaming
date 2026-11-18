"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayerHeader } from "@/components/player-header";
import { PlayerSidebar } from "@/components/player-sidebar";
import { PlatformFooter } from "@/components/platform-footer";
import {
  Rocket,
  Activity,
  Home,
  Trophy,
  Gamepad2,
  Menu,
  X,
  Search,
  ShieldCheck,
} from "lucide-react";

export function PlayerShell({
  viewer,
  exposure,
  topNavTabs,
  quickTickerMatches,
  children,
}: {
  viewer: {
    username: string;
    operator_name?: string | null;
    balance: string;
    mode?: "real" | "demo";
  };
  exposure: string;
  topNavTabs: { name: string; href: string; hasIcon?: boolean }[];
  quickTickerMatches: { title: string; href: string }[];
  children: React.ReactNode;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const pathname = usePathname();
  const brandName = (viewer.operator_name && viewer.operator_name !== "Demo Operator") ? viewer.operator_name : "Club-8910";

  // Auto-close mobile drawer and search when route changes
  useEffect(() => {
    setMobileDrawerOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  // Handle ESC key to close drawer or search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  return (
    <div className="play-page-root">
      {/* 1 & 2. Persistent Sticky Header Stack: Topbar + Category Navstrip + Mobile Search Bar */}
      <div className="ref-sticky-header-stack">
        <PlayerHeader
          brandName={brandName}
          username={viewer.username}
          balance={viewer.balance}
          exposure={exposure}
          mode={viewer.mode}
          onToggleMobileMenu={() => setMobileDrawerOpen((prev) => !prev)}
          isMobileMenuOpen={mobileDrawerOpen}
          onToggleMobileSearch={() => setMobileSearchOpen((prev) => !prev)}
          isMobileSearchOpen={mobileSearchOpen}
        />

        {/* 2. Top Navigation Bar (Touch-scrollable with high-contrast pills) */}
        <nav className="ref-navstrip" aria-label="Main Sports and Games Categories">
          {topNavTabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== "/play" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`ref-nav-item ${isActive ? "active" : ""}`}
              >
                <span>{tab.name}</span>
                {tab.hasIcon && <Rocket size={13} className="ref-nav-accent-icon" />}
              </Link>
            );
          })}
        </nav>

        {/* 2b. Mobile Search Bar - Positioned Just Below the Navbar */}
        {mobileSearchOpen && (
          <div className="ref-mobile-search-tray">
            <form action="/play/sports" className="ref-search-wrap-light" role="search" aria-label="Mobile Search">
              <Search size={15} className="ref-search-icon-light" />
              <input
                type="search"
                name="q"
                className="ref-search-input-light"
                placeholder="Search matches, leagues, sports..."
                autoFocus
                aria-label="Search matches, leagues, sports"
              />
              <button
                type="button"
                className="ref-search-close-btn"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={15} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 3. Live In-Play Match Ticker Ribbon */}
      <div className="ref-ticker-bar" aria-label="Live Match Ticker">
        {quickTickerMatches.map((m) => (
          <Link key={m.href} href={m.href} className="ref-ticker-chip">
            <Activity size={12} className="ref-ticker-icon-active" />
            <span className="ref-ticker-text">{m.title}</span>
          </Link>
        ))}
      </div>

      {/* 4. Body Layout */}
      <div className="ref-body-layout">
        {/* Desktop Sidebar (visible on screens >= 900px) */}
        <aside className="ref-desktop-sidebar">
          <PlayerSidebar />
        </aside>

        {/* Mobile Slide-Over Drawer (animated from left on screens < 900px) */}
        <div
          className={`ref-mobile-drawer-backdrop ${mobileDrawerOpen ? "open" : ""}`}
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden={!mobileDrawerOpen}
        >
          <div
            className={`ref-mobile-drawer-panel ${mobileDrawerOpen ? "open" : ""}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            <div className="ref-drawer-header">
              <div className="flex items-center gap-2">
                <img
                  src="/images/brand-logo.jpg"
                  alt={brandName}
                  className="ref-brand-img-logo-drawer"
                />
              </div>
              <button
                type="button"
                className="ref-drawer-close-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ref-drawer-scrollable">
              <PlayerSidebar />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="ref-main-content">
          {children}
        </main>
      </div>

      {/* Full-Width Platform Footer */}
      <PlatformFooter brandName={brandName} />

      {/* 5. Mobile Native-Like Bottom App Bar (visible on screens < 768px) */}
      <nav className="ref-mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
        <Link
          href="/play"
          className={`ref-bottom-nav-item ${pathname === "/play" ? "active" : ""}`}
        >
          <Home size={18} />
          <span>Home</span>
        </Link>
        <Link
          href="/play/sports"
          className={`ref-bottom-nav-item ${pathname.startsWith("/play/sports") ? "active" : ""}`}
        >
          <Trophy size={18} />
          <span>Sports</span>
        </Link>
        <Link
          href="/play/casino"
          className={`ref-bottom-nav-item ${pathname.startsWith("/play/casino") ? "active" : ""}`}
        >
          <Gamepad2 size={18} />
          <span>Casino</span>
        </Link>
        <Link
          href="/play/crash"
          className={`ref-bottom-nav-item ${pathname.startsWith("/play/crash") ? "active" : ""}`}
        >
          <Rocket size={18} />
          <span>Crash</span>
        </Link>
        <button
          type="button"
          className={`ref-bottom-nav-item ${mobileDrawerOpen ? "active" : ""}`}
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}

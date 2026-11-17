"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Flame,
  Gamepad2,
  Trophy,
} from "lucide-react";

export function PlayerSidebar() {
  const pathname = usePathname();
  const activeSport = useSearchParams().get("sport");
  const [openSections, setOpenSections] = useState({
    racing: true,
    others: true,
    allSports: true,
  });

  const toggle = (section: "racing" | "others" | "allSports") => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const allSports = [
    "Cricket",
    "Football",
    "Tennis",
    "Table Tennis",
    "Basketball",
    "Volleyball",
    "Badminton",
    "Snooker",
    "Ice Hockey",
    "Horse Racing",
    "Greyhound Racing",
    "Politics",
  ];

  return (
    <aside className="ref-sidebar">
      {/* 1. Racing Sports */}
      <div className="ref-side-card">
        <button
          type="button"
          className="ref-card-header ref-card-btn"
          onClick={() => toggle("racing")}
        >
          <span className="ref-header-label-with-icon">
            <Flame size={14} className="ref-header-icon" /> Racing Sports
          </span>
          <span className="ref-chevron">
            {openSections.racing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
        {openSections.racing && (
          <div className="ref-card-list">
            <Link
              href="/play/sports?sport=Horse%20Racing"
              className={`ref-side-link ${activeSport === "Horse Racing" ? "active" : ""}`}
            >
              Horse Racing
            </Link>
            <Link
              href="/play/sports?sport=Greyhound%20Racing"
              className={`ref-side-link ${activeSport === "Greyhound Racing" ? "active" : ""}`}
            >
              Greyhound Racing
            </Link>
          </div>
        )}
      </div>

      {/* 2. Others (Casino & Virtual) */}
      <div className="ref-side-card">
        <button
          type="button"
          className="ref-card-header ref-card-btn"
          onClick={() => toggle("others")}
        >
          <span className="ref-header-label-with-icon">
            <Gamepad2 size={14} className="ref-header-icon" /> Casino & Games
          </span>
          <span className="ref-chevron">
            {openSections.others ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
        {openSections.others && (
          <div className="ref-card-list">
            <Link
              href="/play/crash"
              className={`ref-side-link ${pathname === "/play/crash" ? "active" : ""}`}
            >
              Crash Rocket
            </Link>
            <Link
              href="/play/mines"
              className={`ref-side-link ${pathname === "/play/mines" ? "active" : ""}`}
            >
              Mines Matrix
            </Link>
            <Link
              href="/play/plinko"
              className={`ref-side-link ${pathname === "/play/plinko" ? "active" : ""}`}
            >
              Plinko Physics
            </Link>
            <Link
              href="/play/tower"
              className={`ref-side-link ${pathname === "/play/tower" ? "active" : ""}`}
            >
              Tower Ascent
            </Link>
            <Link
              href="/play/casino"
              className={`ref-side-link ${pathname === "/play/casino" ? "active" : ""}`}
            >
              Our Casino
            </Link>
            <Link
              href="/play/live"
              className={`ref-side-link ${pathname === "/play/live" ? "active" : ""}`}
            >
              Live Casino
            </Link>
            <Link
              href="/play/slots"
              className={`ref-side-link ${pathname === "/play/slots" ? "active" : ""}`}
            >
              Slot Game
            </Link>
            <Link
              href="/play/virtual"
              className={`ref-side-link ${pathname === "/play/virtual" ? "active" : ""}`}
            >
              Virtual Sports
            </Link>
            <Link
              href="/play/fantasy"
              className={`ref-side-link ${pathname === "/play/fantasy" ? "active" : ""}`}
            >
              Fantasy Games
            </Link>
          </div>
        )}
      </div>

      {/* 3. All Sports Tree */}
      <div className="ref-side-card">
        <button
          type="button"
          className="ref-card-header ref-card-btn"
          onClick={() => toggle("allSports")}
        >
          <span className="ref-header-label-with-icon">
            <Trophy size={14} className="ref-header-icon" /> All Sports
          </span>
          <span className="ref-chevron">
            {openSections.allSports ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </button>
        {openSections.allSports && (
          <div className="ref-card-list">
            {allSports.map((sport) => (
              <Link
                key={sport}
                href={`/play/sports?sport=${encodeURIComponent(sport)}`}
                className={`ref-side-link ref-sports-link ${activeSport === sport ? "active" : ""}`}
              >
                <ChevronRight size={13} className="ref-tree-icon" />
                <span className="ref-sport-name-text">{sport}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

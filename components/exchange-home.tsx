"use client";

import { useState } from "react";
import Link from "next/link";
import { placeSportBetAction } from "@/lib/actions";
import { X, Search } from "lucide-react";
import { ProvablyFairShowcase } from "./provably-fair-showcase";

export type EventItem = {
  id: string;
  name: string;
  sport: string;
  starts_at: string;
};

export type MarketItem = {
  id: string;
  event_id: string;
  name: string;
  option_a: string;
  option_b: string;
  odds: string;
};

export type CasinoMarketItem = {
  id: string;
  name: string;
  provider_slug: string;
  provider_name: string;
  option_a: string;
  option_b: string;
  odds: string;
};

export type ProviderItem = {
  id: string;
  slug: string;
  name: string;
  open_markets: number;
};

type ActiveBet = {
  marketId: string;
  matchName: string;
  selectionName: string;
  selection: "a" | "b";
  odds: number;
  stake: number;
};

const formatMatchDate = (isoString: string) => {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export function ExchangeHome({
  events,
  markets,
  casinoMarkets,
  providers,
  balance,
}: {
  events: EventItem[];
  markets: MarketItem[];
  casinoMarkets: CasinoMarketItem[];
  providers: ProviderItem[];
  balance: string;
}) {
  const [selectedSport, setSelectedSport] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBet, setActiveBet] = useState<ActiveBet | null>(null);

  const sportFilterTabs = [
    "All",
    "Cricket",
    "Football",
    "Tennis",
    "Table Tennis",
    "Horse Racing",
    "Basketball",
    "Volleyball",
    "Snooker",
  ];

  const byEvent = new Map<string, MarketItem[]>();
  for (const m of markets) {
    byEvent.set(m.event_id, [...(byEvent.get(m.event_id) ?? []), m]);
  }

  const filteredEvents = events.filter((ev) => {
    const matchesSport =
      selectedSport === "All" ||
      ev.sport.toLowerCase().includes(selectedSport.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.sport.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  // One market covers both outcomes: option_a is "1", option_b is "2".
  // There is no draw market, so the X price is intentionally unavailable.
  const openBetSlip = (
    event: EventItem,
    market: MarketItem | undefined,
    selection: "a" | "b",
  ) => {
    if (!market) return;
    setActiveBet({
      marketId: market.id,
      matchName: event.name,
      selectionName: selection === "a" ? market.option_a : market.option_b,
      selection,
      odds: Number(market.odds),
      stake: 100,
    });
  };

  return (
    <div className="ref-exchange-wrapper">
      {/* 1. Sport filter tabs */}
      <div className="ref-sport-tabs-bar">
        {sportFilterTabs.map((sport) => (
          <button
            key={sport}
            className={`ref-sport-tab-btn ${selectedSport === sport ? "active" : ""}`}
            type="button"
            onClick={() => setSelectedSport(sport)}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* 2. Search */}
      <div className="ref-table-search-row">
        <div className="ref-filter-input-wrap">
          <Search size={14} className="ref-filter-search-icon" />
          <input
            type="text"
            className="ref-filter-input"
            placeholder="Filter matches, teams, or leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            className="ref-clear-search-btn"
            onClick={() => setSearchQuery("")}
          >
            <X size={12} className="ref-inline-icon" /> Clear
          </button>
        )}
      </div>

      {/* 3. Sports price grid - real stored odds, no lay prices */}
      <div className="ref-table-card">
        <div className="ref-table-head">
          <div className="ref-col-game">Game</div>
          <div className="ref-col-outcome-group">
            <span className="ref-group-title">1</span>
            <div className="ref-subcols"><span className="ref-subcol-back">Odds</span></div>
          </div>
          <div className="ref-col-outcome-group">
            <span className="ref-group-title">X</span>
            <div className="ref-subcols"><span className="ref-subcol-back">Odds</span></div>
          </div>
          <div className="ref-col-outcome-group">
            <span className="ref-group-title">2</span>
            <div className="ref-subcols"><span className="ref-subcol-back">Odds</span></div>
          </div>
        </div>

        <div className="ref-table-body">
          {filteredEvents.length === 0 ? (
            <div className="ref-empty-row">No matches match your filter.</div>
          ) : (
            filteredEvents.map((event) => {
              const market = (byEvent.get(event.id) ?? [])[0];
              const odds = market ? Number(market.odds).toFixed(2) : null;

              return (
                <div key={event.id} className="ref-match-row">
                  <div className="ref-col-game ref-game-info">
                    <div className="ref-match-title-row">
                      <Link href={`/play/sports/${event.id}`} className="ref-match-name">
                        {event.name}
                      </Link>
                    </div>
                    <div className="ref-match-meta">
                      <span className="ref-match-sport-tag">{event.sport}</span>
                      <span>·</span>
                      <span className="ref-match-date">{formatMatchDate(event.starts_at)}</span>
                    </div>
                  </div>

                  <div className="ref-odds-cell-group">
                    {market ? (
                      <button
                        type="button"
                        className="ref-odds-btn ref-btn-back"
                        onClick={() => openBetSlip(event, market, "a")}
                        title={`Back ${market.option_a} @ ${odds}`}
                      >
                        {odds}
                      </button>
                    ) : (
                      <span className="ref-odds-btn ref-disabled">—</span>
                    )}
                  </div>

                  <div className="ref-odds-cell-group">
                    <span className="ref-odds-btn ref-disabled" title="No draw market">—</span>
                  </div>

                  <div className="ref-odds-cell-group">
                    {market ? (
                      <button
                        type="button"
                        className="ref-odds-btn ref-btn-back"
                        onClick={() => openBetSlip(event, market, "b")}
                        title={`Back ${market.option_b} @ ${odds}`}
                      >
                        {odds}
                      </button>
                    ) : (
                      <span className="ref-odds-btn ref-disabled">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Bet slip */}
      {activeBet && (
        <div className="ref-betslip-dock">
          <div className="ref-betslip-header">
            <div className="ref-betslip-title">
              <span>{activeBet.selectionName} @ {activeBet.odds.toFixed(2)}</span>
            </div>
            <button
              type="button"
              className="ref-betslip-close"
              onClick={() => setActiveBet(null)}
              aria-label="Close bet slip"
            >
              <X size={15} />
            </button>
          </div>

          <form action={placeSportBetAction} className="ref-betslip-body">
            <input type="hidden" name="marketId" value={activeBet.marketId} />
            <input type="hidden" name="selection" value={activeBet.selection} />
            <input type="hidden" name="back" value="/play" />

            <div className="ref-betslip-match-name">{activeBet.matchName}</div>

            <div className="ref-betslip-inputs-row">
              <div className="ref-betslip-field">
                <label>Stake (Pts)</label>
                <input
                  type="number"
                  name="stake"
                  step="1"
                  min="1"
                  required
                  value={activeBet.stake}
                  onChange={(e) =>
                    setActiveBet({ ...activeBet, stake: Number(e.target.value) || 0 })
                  }
                  className="ref-betslip-input ref-stake-input"
                />
              </div>
            </div>

            <div className="ref-quick-stakes">
              {[100, 500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="ref-quick-stake-chip"
                  onClick={() =>
                    setActiveBet({ ...activeBet, stake: (activeBet.stake || 0) + val })
                  }
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                className="ref-quick-stake-chip ref-max-chip"
                onClick={() =>
                  setActiveBet({ ...activeBet, stake: Math.floor(Number(balance)) })
                }
              >
                MAX
              </button>
              <button
                type="button"
                className="ref-quick-stake-chip ref-clear-chip"
                onClick={() => setActiveBet({ ...activeBet, stake: 0 })}
              >
                Clear
              </button>
            </div>

            <div className="ref-betslip-actions">
              <button
                type="button"
                className="ref-btn-cancel"
                onClick={() => setActiveBet(null)}
              >
                Cancel
              </button>
              <button type="submit" className="ref-btn-place-bet">
                Place Bet ({activeBet.stake} Pts)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Provably Fair Originals Showcase */}
      <ProvablyFairShowcase />

      {/* 5. Casino quick access - links to the real market ladder */}
      <div className="ref-table-card ref-casino-card">
        <div className="ref-table-head">
          <div className="ref-col-game">Our Casino Games</div>
          <div className="ref-col-outcome-group">
            <span className="ref-group-title">1</span>
            <div className="ref-subcols"><span className="ref-subcol-back">Odds</span></div>
          </div>
          <div className="ref-col-outcome-group">
            <span className="ref-group-title">X</span>
            <div className="ref-subcols"><span className="ref-subcol-back">Odds</span></div>
          </div>
          <div className="ref-col-outcome-group">
            <span className="ref-group-title">2</span>
            <div className="ref-subcols"><span className="ref-subcol-back">Odds</span></div>
          </div>
        </div>

        <div className="ref-table-body">
          {casinoMarkets.map((m) => {
            const odds = Number(m.odds).toFixed(2);
            const href = `/play/casino/${m.provider_slug}`;
            return (
              <div key={m.id} className="ref-match-row">
                <div className="ref-col-game ref-game-info">
                  <div className="ref-match-title-row">
                    <Link href={href} className="ref-match-name">{m.name}</Link>
                  </div>
                  <div className="ref-match-meta">
                    <span className="ref-match-date">{m.provider_name}</span>
                  </div>
                </div>

                <div className="ref-odds-cell-group">
                  <Link href={href} className="ref-odds-btn ref-btn-back" title={`Back ${m.option_a} @ ${odds}`}>
                    {odds}
                  </Link>
                </div>

                <div className="ref-odds-cell-group">
                  <span className="ref-odds-btn ref-disabled" title="No draw market">—</span>
                </div>

                <div className="ref-odds-cell-group">
                  <Link href={href} className="ref-odds-btn ref-btn-back" title={`Back ${m.option_b} @ ${odds}`}>
                    {odds}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Providers */}
      <div className="ref-providers-section">
        <h3 className="ref-section-heading">Featured Gaming Providers</h3>
        <div className="ref-provider-chips-grid">
          {providers.map((p) => (
            <Link key={p.id} href={`/play/casino/${p.slug}`} className="ref-provider-chip-card">
              <span className="ref-provider-chip-name">{p.name}</span>
              <span className="ref-provider-chip-count">{p.open_markets} tables</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

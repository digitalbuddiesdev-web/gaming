import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarketLadder, type LadderMarket } from "@/components/market-ladder";
import { currentAccount, money } from "@/lib/auth";
import { one, sql } from "@/lib/db";

type Event = { id: string; name: string; sport: string; starts_at: string };

type Market = LadderMarket;

type Bet = {
  id: string;
  market: string;
  side: string;
  stake: string;
  odds: string;
  status: "open" | "won" | "lost";
  payout: string | null;
  placed_at: string;
};

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export default async function SportEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const event = await one<Event>(
    `select id, name, sport, starts_at from sport_events where id = $1 and operator_id = $2`,
    [id, viewer.operator_id],
  );
  if (!event) notFound();

  const markets = await sql<Market>(
    `select id, name, option_a, option_b, odds, status, winner
       from sport_markets
      where event_id = $1 and operator_id = $2
      order by status = 'open' desc, created_at
      limit 20`,
    [event.id, viewer.operator_id],
  );

  const bets = await sql<Bet>(
    `select b.id, m.name as market,
            case when b.selection = 'a' then m.option_a else m.option_b end as side,
            b.stake, b.odds, b.status, b.payout, b.placed_at
       from bets b
       join sport_markets m on m.id = b.sport_market_id
      where b.account_id = $1 and m.event_id = $2
      order by b.placed_at desc
      limit 30`,
    [viewer.id, event.id],
  );

  const locked = viewer.bet_status !== "open";

  return (
    <>
      {error ? <div className="error">{error}</div> : null}
      {locked ? <div className="error">Betting is locked on this account. Existing bets still settle.</div> : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1>{event.name}</h1>
            <p className="sub" style={{ marginBottom: 0 }}>
              {event.sport} · kick-off {when(event.starts_at)}
            </p>
          </div>
          <Link className="muted" href="/play/sports">All events</Link>
        </div>
      </div>

      <div className="card">
        <h2>Market ladder</h2>
        <MarketLadder kind="sports" markets={markets} locked={locked} back={`/play/sports/${event.id}`} />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>My bet</h2>
          <Link className="muted" href="/play/statement#bets">All bets</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Market</th>
              <th>Side</th>
              <th className="num">Stake</th>
              <th className="num">Odds</th>
              <th>Status</th>
              <th className="num">Payout</th>
            </tr>
          </thead>
          <tbody>
            {bets.length === 0 ? (
              <tr><td colSpan={7} className="muted">No bets on this event.</td></tr>
            ) : (
              bets.map((bet) => (
                <tr key={bet.id}>
                  <td className="muted">{when(bet.placed_at)}</td>
                  <td>{bet.market}</td>
                  <td>{bet.side}</td>
                  <td className="num">{money(bet.stake)}</td>
                  <td className="num">{Number(bet.odds).toFixed(2)}</td>
                  <td>
                    <span className={`pill ${bet.status === "open" ? "pill-demo" : bet.status === "won" ? "pill-active" : "pill-locked"}`}>
                      {bet.status}
                    </span>
                  </td>
                  <td className="num credit">{bet.payout ? money(bet.payout) : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarketLadder, type LadderMarket } from "@/components/market-ladder";
import { currentAccount, money } from "@/lib/auth";
import { one, sql } from "@/lib/db";

type Provider = { id: string; slug: string; name: string };

type Market = LadderMarket & { created_at: string };

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

export default async function CasinoGame({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const provider = await one<Provider>(`select id, slug, name from casino_providers where slug = $1`, [slug]);
  if (!provider) notFound();

  const markets = await sql<Market>(
    `select id, name, option_a, option_b, odds, status, winner, created_at
       from casino_markets
      where operator_id = $1 and provider_id = $2
      order by status = 'open' desc, created_at desc
      limit 12`,
    [viewer.operator_id, provider.id],
  );

  const bets = await sql<Bet>(
    `select b.id, m.name as market,
            case when b.selection = 'a' then m.option_a else m.option_b end as side,
            b.stake, b.odds, b.status, b.payout, b.placed_at
       from bets b
       join casino_markets m on m.id = b.market_id
      where b.account_id = $1 and m.provider_id = $2
      order by b.placed_at desc
      limit 20`,
    [viewer.id, provider.id],
  );

  const results = await sql<{ id: string; name: string; winner: "a" | "b"; option_a: string; option_b: string }>(
    `select id, name, winner, option_a, option_b
       from casino_markets
      where operator_id = $1 and provider_id = $2 and status = 'settled'
      order by settled_at desc
      limit 12`,
    [viewer.operator_id, provider.id],
  );

  const round = markets.find((m) => m.status === "open")?.id ?? provider.id;
  const locked = viewer.bet_status !== "open";

  return (
    <>
      {error ? <div className="error">{error}</div> : null}
      {locked ? <div className="error">Betting is locked on this account. Existing bets still settle.</div> : null}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1>{provider.name}</h1>
            <p className="sub" style={{ marginBottom: 0 }}>
              Round ID: <span className="mono">{round.slice(0, 12)}</span>
            </p>
          </div>
          <span className="pill pill-active">{markets.some((m) => m.status === "open") ? "open" : "closed"}</span>
        </div>
      </div>

      <div className="card">
        <h2>Markets</h2>
        <MarketLadder
          kind="casino"
          markets={markets}
          locked={locked}
          back={`/play/casino/${provider.slug}`}
        />
      </div>

      <div className="card">
        <h2>Last result</h2>
        <div className="results">
          {results.length === 0 ? (
            <span className="muted">No settled rounds yet.</span>
          ) : (
            results.map((result) => (
              <span key={result.id} className="result-chip">
                {result.winner === "a" ? result.option_a : result.option_b}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>My bet</h2>
          <Link href="/play/statement#bets" className="muted">All bets</Link>
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
              <tr><td colSpan={7} className="muted">No bets on this provider.</td></tr>
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

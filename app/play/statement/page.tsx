import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { one, sql } from "@/lib/db";

type Movement = {
  id: string;
  kind: "credit" | "debit";
  amount: string;
  closing: string;
  description: string | null;
  created_at: string;
};

type Bet = {
  id: string;
  kind: string;
  source: string;
  market: string;
  side: string;
  stake: string;
  odds: string;
  status: "open" | "won" | "lost";
  payout: string | null;
  placed_at: string;
};

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export default async function Statement() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const movements = await sql<Movement>(
    `select id, kind, amount, closing, description, created_at
       from transactions
      where account_id = $1
      order by created_at desc
      limit 100`,
    [viewer.id],
  );

  const bets = await sql<Bet>(
    `select b.id, 'Casino' as kind, p.name as source, m.name as market,
            case when b.selection = 'a' then m.option_a else m.option_b end as side,
            b.stake, b.odds, b.status, b.payout, b.placed_at
       from bets b
       join casino_markets m on m.id = b.market_id
       join casino_providers p on p.id = m.provider_id
      where b.account_id = $1
      union all
     select b.id, 'Sports', e.name, m.name,
            case when b.selection = 'a' then m.option_a else m.option_b end,
            b.stake, b.odds, b.status, b.payout, b.placed_at
       from bets b
       join sport_markets m on m.id = b.sport_market_id
       join sport_events e on e.id = m.event_id
      where b.account_id = $1
      order by placed_at desc
      limit 100`,
    [viewer.id],
  );

  const totals = await one<{ staked: string; won: string; open: string }>(
    `select coalesce(sum(stake), 0) as staked,
            coalesce(sum(case when status = 'won' then payout else 0 end), 0) as won,
            coalesce(sum(case when status = 'open' then stake else 0 end), 0) as open
       from bets where account_id = $1`,
    [viewer.id],
  );

  return (
    <>
      <div className="card" id="totals">
        <h1>Statement</h1>
        <p className="sub">Every movement is an append-only ledger row. Newest first.</p>
        <div className="grid-3">
          <div className="metric">
            <div className="k">Balance</div>
            <div className="v">{money(viewer.balance)}</div>
          </div>
          <div className="metric">
            <div className="k">Open exposure</div>
            <div className="v">{money(totals?.open ?? "0")}</div>
          </div>
          <div className="metric">
            <div className="k">Staked / won</div>
            <div className="v">{money(totals?.staked ?? "0")} / {money(totals?.won ?? "0")}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Ledger</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="num">Credit</th>
              <th className="num">Debit</th>
              <th className="num">Closing</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={5} className="muted">No movements yet.</td></tr>
            ) : (
              movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="muted">{when(movement.created_at)}</td>
                  <td>{movement.description ?? "—"}</td>
                  <td className="num credit">{movement.kind === "credit" ? money(movement.amount) : ""}</td>
                  <td className="num debit">{movement.kind === "debit" ? money(movement.amount) : ""}</td>
                  <td className="num">{money(movement.closing)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card" id="bets">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Current bets</h2>
          <Link className="muted" href="/play/sports">Sports book</Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Event</th>
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
              <tr><td colSpan={9} className="muted">No bets yet.</td></tr>
            ) : (
              bets.map((bet) => (
                <tr key={`${bet.kind}-${bet.id}`}>
                  <td className="muted">{when(bet.placed_at)}</td>
                  <td>{bet.kind}</td>
                  <td>{bet.source}</td>
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

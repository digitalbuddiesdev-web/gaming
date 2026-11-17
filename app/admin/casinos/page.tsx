import { redirect } from "next/navigation";
import { createCasinoMarket, declareCasinoResult } from "@/lib/actions";
import { currentAccount, money } from "@/lib/auth";
import { sql } from "@/lib/db";

type Provider = { id: string; name: string; slug: string };

type Market = {
  id: string;
  name: string;
  provider_name: string;
  option_a: string;
  option_b: string;
  odds: string;
  status: "open" | "settled";
  winner: "a" | "b" | null;
  bets: number;
  open_bets: number;
  volume: string;
};

export default async function Casinos({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const providers = await sql<Provider>(`select id, name, slug from casino_providers order by sort_order, name`);

  const markets = await sql<Market>(
    `select m.id, m.name, m.option_a, m.option_b, m.odds, m.status, m.winner,
            p.name as provider_name,
            (select count(*)::int from bets b where b.market_id = m.id) as bets,
            (select count(*)::int from bets b where b.market_id = m.id and b.status = 'open') as open_bets,
            (select coalesce(sum(b.stake), 0) from bets b where b.market_id = m.id) as volume
       from casino_markets m
       join casino_providers p on p.id = m.provider_id
      where m.operator_id = $1
      order by m.status = 'open' desc, m.created_at desc
      limit 100`,
    [viewer.operator_id],
  );

  return (
    <>
      {error ? <div className="error">{error}</div> : null}

      <div className="card">
        <h1>Casino markets</h1>
        <p className="sub">
          Stake is debited when a bet is placed. Declaring a winner settles every open bet on the
          market in one transaction; a market can only be settled once.
        </p>

        {providers.length === 0 ? (
          <p className="muted">No providers seeded yet. Run `npm run seed`.</p>
        ) : (
          <form action={createCasinoMarket}>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <div className="field" style={{ maxWidth: 190 }}>
                <label htmlFor="providerId">Provider</label>
                <select id="providerId" name="providerId" defaultValue={providers[0].id}>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ maxWidth: 220 }}>
                <label htmlFor="name">Market name</label>
                <input id="name" name="name" required placeholder="Round 12" />
              </div>
              <div className="field" style={{ maxWidth: 120 }}>
                <label htmlFor="optionA">Side A</label>
                <input id="optionA" name="optionA" defaultValue="Andar" />
              </div>
              <div className="field" style={{ maxWidth: 120 }}>
                <label htmlFor="optionB">Side B</label>
                <input id="optionB" name="optionB" defaultValue="Bahar" />
              </div>
              <div className="field" style={{ maxWidth: 110 }}>
                <label htmlFor="odds">Odds</label>
                <input id="odds" name="odds" type="number" step="0.01" min="1.01" max="100" defaultValue="2" />
              </div>
              <div className="field" style={{ maxWidth: 110 }}>
                <button className="btn" type="submit">Create market</button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Markets</h2>
        <p className="sub">Newest first. Settled markets stay visible for audit.</p>

        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Market</th>
              <th>Sides</th>
              <th className="num">Odds</th>
              <th className="num">Bets</th>
              <th className="num">Volume</th>
              <th>Status</th>
              <th>Settle</th>
            </tr>
          </thead>
          <tbody>
            {markets.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">No markets yet.</td>
              </tr>
            ) : (
              markets.map((m) => (
                <tr key={m.id}>
                  <td>{m.provider_name}</td>
                  <td>{m.name}</td>
                  <td className="muted">
                    {m.option_a} / {m.option_b}
                  </td>
                  <td className="num">{Number(m.odds).toFixed(2)}</td>
                  <td className="num">
                    {m.bets}
                    {m.open_bets > 0 ? <span className="muted"> ({m.open_bets} open)</span> : null}
                  </td>
                  <td className="num">{money(m.volume)}</td>
                  <td>
                    <span className={`pill ${m.status === "open" ? "pill-active" : "pill-demo"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    {m.status === "open" ? (
                      <form action={declareCasinoResult} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="marketId" value={m.id} />
                        <select name="winner" defaultValue="a" style={{ width: 110 }}>
                          <option value="a">{m.option_a}</option>
                          <option value="b">{m.option_b}</option>
                        </select>
                        <button className="btn btn-sm btn-ok" type="submit">Declare</button>
                      </form>
                    ) : (
                      <span className="muted">
                        {m.winner === "a" ? m.option_a : m.winner === "b" ? m.option_b : "—"} won
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

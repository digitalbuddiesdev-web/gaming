import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ProvablyFairShowcase } from "@/components/provably-fair-showcase";

type Row = {
  id: string;
  slug: string;
  name: string;
  open_markets: number;
  volume: string;
};

export default async function CasinoLobby() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const providers = await sql<Row>(
    `select p.id, p.slug, p.name,
            (select count(*)::int from casino_markets m
              where m.provider_id = p.id and m.operator_id = $1 and m.status = 'open') as open_markets,
            (select coalesce(sum(b.stake), 0) from casino_markets m
               join bets b on b.market_id = m.id
              where m.provider_id = p.id and m.operator_id = $1) as volume
       from casino_providers p
      order by p.sort_order, p.name`,
    [viewer.operator_id],
  );

  return (
    <div className="card lobby-stack">
      <ProvablyFairShowcase />

      <div className="lobby-section">
        <h1>Our casino</h1>
        <p className="sub">
          Native two-sided rounds run by this operator. Pick a provider to see its open markets and your bets.
        </p>

        {providers.length === 0 ? (
          <p className="muted">No providers seeded. Run `npm run seed`.</p>
        ) : (
          <div className="tiles">
            {providers.map((provider) => (
              <Link key={provider.id} className="tile" href={`/play/casino/${provider.slug}`}>
                <span className="tile-art">{provider.name.slice(0, 2).toUpperCase()}</span>
                <span className="tile-name">{provider.name}</span>
                <span className="tile-provider">
                  {provider.open_markets} open · {money(provider.volume)} volume
                </span>
              </Link>
            ))}
          </div>
        )}

        <p className="sub" style={{ marginTop: 18, marginBottom: 0 }}>
          Looking for live dealers or slots? Open the <Link href="/play/live">live casino lobby</Link>.
        </p>
      </div>
    </div>
  );
}

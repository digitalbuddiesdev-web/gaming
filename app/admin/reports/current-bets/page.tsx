import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { currentBets } from "@/lib/reports";

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export default async function CurrentBetsReport() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const bets = await currentBets(viewer);
  const total = bets.reduce((n, bet) => n + Number(bet.stake), 0);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Current bets</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            Open casino and sports bets · {bets.length} rows · {money(total)} staked
          </p>
        </div>
        <Link className="muted" href="/admin/reports">All reports</Link>
      </div>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Event</th>
            <th>User</th>
            <th>Market</th>
            <th>Side</th>
            <th className="num">Stake</th>
            <th className="num">Odds</th>
            <th>Placed</th>
          </tr>
        </thead>
        <tbody>
          {bets.length === 0 ? (
            <tr><td colSpan={8} className="muted">No open bets.</td></tr>
          ) : (
            bets.map((bet) => (
              <tr key={`${bet.kind}-${bet.id}`}>
                <td>{bet.kind}</td>
                <td>{bet.source}</td>
                <td>
                  {bet.username}
                  <span className="muted"> · {bet.mode}</span>
                </td>
                <td>{bet.market}</td>
                <td>{bet.side}</td>
                <td className="num">{money(bet.stake)}</td>
                <td className="num">{Number(bet.odds).toFixed(2)}</td>
                <td className="muted">{when(bet.placed_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

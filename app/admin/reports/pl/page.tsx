import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { accountReport } from "@/lib/reports";

export default async function ProfitLossReport() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const rows = await accountReport(viewer);
  const clients = rows.filter((row) => row.role === "client");
  const casino = clients.reduce((n, row) => n + Number(row.casino_payout) - Number(row.casino_stake), 0);
  const sport = clients.reduce((n, row) => n + Number(row.sport_payout) - Number(row.sport_stake), 0);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Profit / loss</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            Player net on settled and open bets. The book is the negative of this figure.
          </p>
        </div>
        <Link className="muted" href="/admin/reports">All reports</Link>
      </div>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th className="num">No</th>
            <th>User name</th>
            <th>Level</th>
            <th className="num">Casino staked</th>
            <th className="num">Casino paid</th>
            <th className="num">Sport staked</th>
            <th className="num">Sport paid</th>
            <th className="num">Profit / loss</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr><td colSpan={8} className="muted">No clients in scope.</td></tr>
          ) : (
            clients.map((row, index) => {
              const net = Number(row.pl);
              return (
                <tr key={row.id}>
                  <td className="num muted">{index + 1}</td>
                  <td><Link href={`/admin/clients/${row.id}`}>{row.username}</Link></td>
                  <td>{row.role === "client" ? "User" : "Agent"}</td>
                  <td className="num">{money(row.casino_stake)}</td>
                  <td className="num">{money(row.casino_payout)}</td>
                  <td className="num">{money(row.sport_stake)}</td>
                  <td className="num">{money(row.sport_payout)}</td>
                  <td className={`num ${net >= 0 ? "credit" : "debit"}`}>{net.toFixed(2)}</td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>Total</th>
            <th className="num">{money(clients.reduce((n, r) => n + Number(r.casino_stake), 0))}</th>
            <th className="num">{money(clients.reduce((n, r) => n + Number(r.casino_payout), 0))}</th>
            <th className="num">{money(clients.reduce((n, r) => n + Number(r.sport_stake), 0))}</th>
            <th className="num">{money(clients.reduce((n, r) => n + Number(r.sport_payout), 0))}</th>
            <th className={`num ${casino + sport >= 0 ? "credit" : "debit"}`}>{(casino + sport).toFixed(2)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { accountReport } from "@/lib/reports";

export default async function Users2Report() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const rows = await accountReport(viewer);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>users2 summary</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            One row per account. Exposure is open stake; available is the settled balance.
          </p>
        </div>
        <Link className="muted" href="/admin/reports">All reports</Link>
      </div>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>User</th>
            <th className="num">CR</th>
            <th className="num">Balance</th>
            <th className="num">Client P/L</th>
            <th className="num">Exposure</th>
            <th>U st</th>
            <th>B st</th>
            <th className="num">Exposure limit</th>
            <th className="num">Default %</th>
            <th>Account type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={11} className="muted">No accounts in scope.</td></tr>
          ) : (
            rows.map((row) => {
              const net = Number(row.pl);
              return (
                <tr key={row.id}>
                  <td>{row.username}</td>
                  <td className="num">{money(row.credit_limit)}</td>
                  <td className="num">{money(row.balance)}</td>
                  <td className={`num ${net >= 0 ? "credit" : "debit"}`}>{net.toFixed(2)}</td>
                  <td className="num">{money(row.exposure)}</td>
                  <td>
                    <span className={`pill ${row.user_status === "active" ? "pill-active" : "pill-locked"}`}>
                      {row.user_status === "active" ? "active" : "locked"}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${row.bet_status === "open" ? "pill-active" : "pill-locked"}`}>
                      {row.bet_status === "open" ? "open" : "locked"}
                    </span>
                  </td>
                  <td className="num">{money(row.exposure_limit)}</td>
                  <td className="num">{Number(row.default_pct).toFixed(2)}</td>
                  <td>{row.role.replace("_", " ")} · {row.mode}</td>
                  <td><Link href={`/admin/clients/${row.id}`}>Open</Link></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

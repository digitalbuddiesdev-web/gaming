import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { sql } from "@/lib/db";
import { visibleAccounts } from "@/lib/reports";

type Movement = {
  id: string;
  kind: "credit" | "debit";
  amount: string;
  closing: string;
  description: string | null;
  created_at: string;
};

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export default async function StatementReport({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account } = await searchParams;
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const accounts = await visibleAccounts(viewer);
  if (accounts.length === 0) {
    return <div className="card"><p className="muted">No accounts in scope.</p></div>;
  }

  const selected = accounts.find((row) => row.id === account) ?? accounts[0];

  const movements = await sql<Movement>(
    `select id, kind, amount, closing, description, created_at
       from transactions
      where account_id = $1
      order by created_at desc
      limit 200`,
    [selected.id],
  );

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1>Account statement</h1>
            <p className="sub" style={{ marginBottom: 0 }}>
              {selected.username} · {selected.role.replace("_", " ")} · {selected.mode} · balance {money(selected.balance)}
            </p>
          </div>
          <Link className="muted" href="/admin/reports">All reports</Link>
        </div>

        <form method="get" className="row" style={{ marginTop: 14 }}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="account">Account</label>
            <select id="account" name="account" defaultValue={selected.id}>
              {accounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.username} · {row.role.replace("_", " ")} · {row.mode}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 110 }}>
            <button className="btn btn-ghost" type="submit">Show</button>
          </div>
        </form>
      </div>

      <div className="card">
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
              <tr><td colSpan={5} className="muted">No movements.</td></tr>
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
    </>
  );
}

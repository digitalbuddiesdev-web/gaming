import Link from "next/link";
import { notFound } from "next/navigation";
import { adjustBalance, setStatus } from "@/lib/actions";
import { canAct, currentAccount, money, type Account } from "@/lib/auth";
import { one, sql } from "@/lib/db";

type Movement = {
  id: string;
  kind: "credit" | "debit";
  amount: string;
  closing: string;
  description: string | null;
  created_at: string;
};

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export default async function ClientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const viewer = await currentAccount();
  if (!viewer) return null;
  if (!(await canAct(viewer, id))) notFound();

  const account = await one<Account>(
    `select * from accounts where id = $1 and operator_id = $2`,
    [id, viewer.operator_id],
  );
  if (!account) notFound();

  const movements = await sql<Movement>(
    `select id, kind, amount, closing, description, created_at
       from transactions
      where account_id = $1
      order by created_at desc, id desc
      limit 200`,
    [id],
  );

  const isSelf = account.id === viewer.id;

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        <Link href="/admin">Clients</Link> / {account.username}
      </p>

      {error ? <div className="error">{error}</div> : null}

      <div className="card">
        <h1>
          {account.username}{" "}
          {account.mode === "demo" ? <span className="pill pill-demo">demo</span> : null}
        </h1>
        <p className="sub">
          {account.role === "operator_admin" ? "Operator admin" : account.role === "agent" ? "Agent" : "Client"}
          {account.full_name ? ` · ${account.full_name}` : ""}
          {account.deposit_mobile ? ` · deposit ${account.deposit_mobile}` : ""}
        </p>

        <div className="grid-3" style={{ marginBottom: 18 }}>
          <div className="metric">
            <div className="k">Balance</div>
            <div className="v">{money(account.balance)}</div>
          </div>
          <div className="metric">
            <div className="k">Credit limit</div>
            <div className="v">{money(account.credit_limit)}</div>
          </div>
          <div className="metric">
            <div className="k">Default %</div>
            <div className="v">{Number(account.default_pct).toFixed(2)}</div>
          </div>
        </div>

        <div className="row" style={{ flexWrap: "wrap" }}>
          <form action={setStatus}>
            <input type="hidden" name="accountId" value={account.id} />
            <input type="hidden" name="field" value="user_status" />
            <input type="hidden" name="value" value={account.user_status === "active" ? "locked" : "active"} />
            <button className="btn btn-sm btn-ghost" type="submit" disabled={isSelf}>
              Login: {account.user_status === "active" ? "active" : "locked"} — toggle
            </button>
          </form>

          <form action={setStatus}>
            <input type="hidden" name="accountId" value={account.id} />
            <input type="hidden" name="field" value="bet_status" />
            <input type="hidden" name="value" value={account.bet_status === "open" ? "locked" : "open"} />
            <button className="btn btn-sm btn-ghost" type="submit">
              Betting: {account.bet_status === "open" ? "open" : "locked"} — toggle
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2>Credit / debit</h2>
        <p className="sub">Writes one ledger row and updates the balance in the same transaction.</p>

        <form action={adjustBalance}>
          <input type="hidden" name="accountId" value={account.id} />
          <div className="row">
            <div className="field" style={{ maxWidth: 130 }}>
              <label htmlFor="kind">Type</label>
              <select id="kind" name="kind" defaultValue="credit">
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
            <div className="field" style={{ maxWidth: 160 }}>
              <label htmlFor="amount">Amount</label>
              <input id="amount" name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <input id="description" name="description" placeholder="UPI deposit, settlement, correction…" />
            </div>
            <div className="field" style={{ maxWidth: 130 }}>
              <button className="btn" type="submit">Post</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Account statement</h2>
        <p className="sub">Newest first. Closing balance is stored per row.</p>

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
              <tr>
                <td colSpan={5} className="muted">No movements yet.</td>
              </tr>
            ) : (
              movements.map((row) => (
                <tr key={row.id}>
                  <td className="muted">{when(row.created_at)}</td>
                  <td>{row.description ?? "—"}</td>
                  <td className="num credit">{row.kind === "credit" ? money(row.amount) : ""}</td>
                  <td className="num debit">{row.kind === "debit" ? money(row.amount) : ""}</td>
                  <td className="num">{money(row.closing)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

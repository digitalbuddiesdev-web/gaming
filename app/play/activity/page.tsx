import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { activityFeed } from "@/lib/activity";

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export const metadata = {
  title: "Activity",
  description: "Your recent account activity.",
};

export default async function PlayerActivity() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const rows = await activityFeed(viewer);

  return (
    <>
      <div className="card">
        <h1>Activity</h1>
        <p className="sub">
          Your logins, balance changes, wagers and other account actions. Newest first.
        </p>
        <p className="muted">
          Referral code <code>{viewer.referral_code}</code> · <Link href="/play/statement">Account statement</Link>
        </p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="muted">No activity yet.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="muted">{when(row.created_at)}</td>
                  <td>{row.action.replaceAll("_", " ")}</td>
                  <td>{row.detail ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

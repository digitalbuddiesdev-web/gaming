import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { activityFeed } from "@/lib/activity";

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export const metadata = {
  title: "Activity Log · Operator Admin",
  description: "Chronological actions across accounts in your scope.",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string }>;
}) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const { q = "", action = "" } = await searchParams;
  const rows = await activityFeed(viewer, { query: q, action });

  return (
    <div className="admin-page-content">
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Activity Log</h1>
          <p className="admin-page-sub">
            Newest first. Shows actions where the actor or the target is in your scope.
          </p>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-header">
          <h2 className="admin-card-heading">Activity ({rows.length})</h2>
          <form method="get" className="admin-filter-bar">
            <input
              name="q"
              className="admin-filter-input"
              defaultValue={q}
              placeholder="Name or referral code"
              aria-label="Search activity"
            />
            <input
              name="action"
              className="admin-filter-input"
              defaultValue={action}
              placeholder="Action"
              aria-label="Filter by action"
            />
            <button className="admin-btn-secondary" type="submit">Search</button>
          </form>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty-table">No activity matches this filter.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="admin-table-row">
                    <td className="muted">{when(row.created_at)}</td>
                    <td>{row.actor ?? "—"}</td>
                    <td>{row.action.replaceAll("_", " ")}</td>
                    <td>{row.target ?? "—"}</td>
                    <td>{row.detail ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

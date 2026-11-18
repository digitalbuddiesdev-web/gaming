import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { scopeParams, visibleAccountScope } from "@/lib/access";
import { sql } from "@/lib/db";
import {
  Users,
  UserCheck,
  Coins,
  UserPlus,
  ArrowRight,
  Shield,
  Search,
  Lock,
  Unlock,
} from "lucide-react";

type Row = {
  id: string;
  username: string;
  full_name: string | null;
  referral_code: string;
  role: string;
  mode: "real" | "demo";
  balance: string;
  credit_limit: string;
  default_pct: string;
  user_status: "active" | "locked";
  bet_status: "open" | "locked";
};

export const metadata = {
  title: "Client Management · Operator Admin",
  description: "Manage operator accounts, balance movements, and betting permissions.",
};

export default async function ClientList({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const q = (await searchParams).q?.trim() ?? "";
  const params: unknown[] = scopeParams(viewer);
  let filter = "";
  if (q) {
    params.push(`%${q}%`);
    filter = ` and (lower(a.username) like lower($${params.length})
                  or lower(coalesce(a.full_name, '')) like lower($${params.length})
                  or lower(a.referral_code) like lower($${params.length}))`;
  }
  const rows = await sql<Row>(
    `${visibleAccountScope}
     select a.id, a.username, a.full_name, a.referral_code, a.role, a.mode, a.balance,
            a.credit_limit, a.default_pct, a.user_status, a.bet_status
       from accounts a
      where a.id in (select id from scope) ${filter}
      order by a.created_at`,
    params,
  );

  const totalPoints = rows.reduce((sum, row) => sum + Number(row.balance), 0);
  const activeCount = rows.filter((row) => row.user_status === "active").length;
  const lockedCount = rows.length - activeCount;

  return (
    <div className="admin-page-content">
      {/* 1. Header with Title & Quick CTA */}
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Client Management</h1>
          <p className="admin-page-sub">
            Overview of player accounts, ledger balances, credit limits, and betting status.
          </p>
        </div>
        <Link href="/admin/new" className="admin-btn-primary">
          <UserPlus size={15} className="ref-inline-icon" />
          <span>Create Account</span>
        </Link>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">TOTAL ACCOUNTS</span>
            <Users size={18} className="admin-kpi-icon blue" />
          </div>
          <div className="admin-kpi-val">{rows.length}</div>
          <div className="admin-kpi-sub">
            <span className="admin-sub-tag">{activeCount} active</span>
            <span className="admin-sub-tag muted">{lockedCount} locked</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">ACTIVE PLAYERS</span>
            <UserCheck size={18} className="admin-kpi-icon emerald" />
          </div>
          <div className="admin-kpi-val emerald">{activeCount}</div>
          <div className="admin-kpi-sub">
            <span className="admin-sub-pill active">System Online</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">TOTAL POINTS HELD</span>
            <Coins size={18} className="admin-kpi-icon gold" />
          </div>
          <div className="admin-kpi-val">{money(totalPoints)}</div>
          <div className="admin-kpi-sub">
            <span className="admin-sub-desc">Active float liability across book</span>
          </div>
        </div>
      </div>

      {/* 3. High-Density Client Account Table Card */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <h2 className="admin-card-heading">Registered Accounts ({rows.length})</h2>
          <form method="get" className="admin-filter-bar">
            <input
              name="q"
              className="admin-filter-input"
              defaultValue={q}
              placeholder="Search name or referral code"
              aria-label="Search accounts"
            />
            <button className="admin-btn-secondary" type="submit">Search</button>
          </form>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Referral Code</th>
                <th>Role & Mode</th>
                <th className="num">Balance</th>
                <th className="num">Credit Limit</th>
                <th className="num">Comm %</th>
                <th>Login State</th>
                <th>Betting State</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="admin-empty-table">
                    No accounts registered in this downline. Click &quot;Create Account&quot; to add one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const initials = (row.username || "U").slice(0, 2).toUpperCase();

                  return (
                    <tr key={row.id} className="admin-table-row">
                      {/* Account Column with Avatar */}
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-avatar">{initials}</span>
                          <div>
                            <Link href={`/admin/clients/${row.id}`} className="admin-user-link">
                              {row.username}
                            </Link>
                            {row.full_name && (
                              <div className="admin-user-fullname">{row.full_name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Referral Code */}
                      <td className="num"><span className="admin-ref-code">{row.referral_code}</span></td>

                      {/* Role & Mode */}
                      <td>
                        <div className="admin-role-cell">
                          <span className="admin-role-badge">
                            {row.role === "super_admin"
                              ? "Super Admin"
                              : row.role === "operator_admin"
                              ? "Admin"
                              : row.role === "agent"
                              ? "Agent"
                              : "User"}
                          </span>
                          <span
                            className={`admin-mode-pill ${row.mode === "demo" ? "demo" : "real"}`}
                          >
                            {row.mode.toUpperCase()}
                          </span>
                        </div>
                      </td>

                      {/* Balance */}
                      <td className="num">
                        <span className="admin-balance-val">{money(row.balance)}</span>
                      </td>

                      {/* Credit Limit */}
                      <td className="num">
                        <span className="admin-limit-val">{money(row.credit_limit)}</span>
                      </td>

                      {/* Commission % */}
                      <td className="num">
                        <span className="admin-pct-val">{Number(row.default_pct).toFixed(2)}%</span>
                      </td>

                      {/* Login Status */}
                      <td>
                        <span
                          className={`admin-status-pill ${
                            row.user_status === "active" ? "active" : "locked"
                          }`}
                        >
                          {row.user_status === "active" ? (
                            <>
                              <span className="status-dot green" /> Active
                            </>
                          ) : (
                            <>
                              <Lock size={11} className="ref-inline-icon" /> Locked
                            </>
                          )}
                        </span>
                      </td>

                      {/* Betting Status */}
                      <td>
                        <span
                          className={`admin-status-pill ${
                            row.bet_status === "open" ? "active" : "locked"
                          }`}
                        >
                          {row.bet_status === "open" ? (
                            <>
                              <Unlock size={11} className="ref-inline-icon" /> Open
                            </>
                          ) : (
                            <>
                              <Lock size={11} className="ref-inline-icon" /> Locked
                            </>
                          )}
                        </span>
                      </td>

                      {/* Manage Button */}
                      <td className="action-col">
                        <Link
                          className="admin-manage-btn"
                          href={`/admin/clients/${row.id}`}
                        >
                          <span>Manage</span>
                          <ArrowRight size={12} className="ref-inline-icon" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

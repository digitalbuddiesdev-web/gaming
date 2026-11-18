import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { accountReport, currentBets } from "@/lib/reports";
import {
  FileSpreadsheet,
  ScrollText,
  TrendingUp,
  Users,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";

const REPORTS = [
  {
    href: "/admin/reports/statement",
    title: "Account Statement",
    body: "Complete audit ledger of credit, debit movements and closing balances per account.",
    icon: FileSpreadsheet,
    badge: "LEDGER AUDIT",
  },
  {
    href: "/admin/reports/current-bets",
    title: "Current Active Bets",
    body: "Live feed of all open casino and sports bets awaiting settlement, newest first.",
    icon: ScrollText,
    badge: "IN-PLAY",
  },
  {
    href: "/admin/reports/pl",
    title: "Profit & Loss Summary",
    body: "Aggregate breakdown of sports and casino turnover, gross payout and net margin.",
    icon: TrendingUp,
    badge: "FINANCIALS",
  },
  {
    href: "/admin/reports/users2",
    title: "Users2 Master Report",
    body: "Multi-dimensional downline overview of balances, exposure, limits, and lock states.",
    icon: Users,
    badge: "DOWNLINE",
  },
  {
    href: "/admin/activity",
    title: "Activity Log",
    body: "Chronological actions across your accounts, including logins, balances, and wagers.",
    icon: Activity,
    badge: "AUDIT",
  },
];

export const metadata = {
  title: "Financial & Exposure Reports · Operator Admin",
  description: "Executive reports, risk metrics, and ledger statements.",
};

export default async function ReportsIndex() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const rows = await accountReport(viewer);
  const bets = await currentBets(viewer);

  const exposure = rows.reduce((n, row) => n + Number(row.exposure), 0);
  const pl = rows.reduce((n, row) => n + Number(row.pl), 0);
  const bookAhead = -pl >= 0;

  return (
    <div className="admin-page-content">
      {/* 1. Header */}
      <div className="admin-section-header">
        <div>
          <h1 className="admin-page-title">Executive Reports & Auditing</h1>
          <p className="admin-page-sub">
            Real-time financial analytics, book liability, and account reconciliation.
          </p>
        </div>
      </div>

      {/* 2. Top Executive Risk & P/L Metrics */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">MANAGED ACCOUNTS</span>
            <Users size={18} className="admin-kpi-icon blue" />
          </div>
          <div className="admin-kpi-val">{rows.length}</div>
          <div className="admin-kpi-sub">
            <span className="admin-sub-desc">Active accounts in current scope</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">OPEN IN-PLAY BETS</span>
            <Activity size={18} className="admin-kpi-icon emerald" />
          </div>
          <div className="admin-kpi-val emerald">{bets.length}</div>
          <div className="admin-kpi-sub">
            <span className="admin-sub-tag">Pending Settlement</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">TOTAL BOOK EXPOSURE</span>
            <Layers size={18} className="admin-kpi-icon gold" />
          </div>
          <div className="admin-kpi-val">{exposure.toFixed(2)} Pts</div>
          <div className="admin-kpi-sub">
            <span className="admin-sub-desc">Maximum downside on open wagers</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">OPERATOR NET P/L</span>
            <TrendingUp size={18} className={`admin-kpi-icon ${bookAhead ? "emerald" : "red"}`} />
          </div>
          <div className={`admin-kpi-val ${bookAhead ? "emerald" : "red"}`}>
            {bookAhead ? `+${(-pl).toFixed(2)}` : (-pl).toFixed(2)} Pts
          </div>
          <div className="admin-kpi-sub">
            <span className={`admin-sub-pill ${bookAhead ? "active" : "locked"}`}>
              {bookAhead ? "House Ahead" : "House Behind"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Reports Hub Navigation Grid */}
      <div className="admin-reports-grid">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} className="admin-report-card" href={report.href}>
              <div className="admin-report-card-top">
                <div className="admin-report-icon-wrap">
                  <Icon size={20} className="admin-report-icon" />
                </div>
                <span className="admin-report-badge">{report.badge}</span>
              </div>

              <h2 className="admin-report-title">{report.title}</h2>
              <p className="admin-report-desc">{report.body}</p>

              <div className="admin-report-footer">
                <span className="admin-report-action-label">Open Report</span>
                <ArrowRight size={14} className="ref-inline-icon" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

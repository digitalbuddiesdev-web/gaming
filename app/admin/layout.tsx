import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions";
import { currentAccount } from "@/lib/auth";
import {
  Users,
  Trophy,
  Gamepad2,
  BarChart3,
  UserPlus,
  LogOut,
  ExternalLink,
  ShieldCheck,
  User,
} from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await currentAccount();
  if (!viewer || viewer.role === "client") redirect("/login");

  const brandName = (viewer.operator_name && viewer.operator_name !== "Demo Operator") ? viewer.operator_name : "Club-8910";

  return (
    <div className="admin-page-root">
      {/* 1. Executive Admin Navigation Bar */}
      <header className="admin-topbar">
        {/* Brand Zone */}
        <div className="admin-brand-zone">
          <Link href="/admin" className="ref-brand-logo-custom" title={brandName}>
            <img
              src="/images/brand-logo.jpg"
              alt={brandName}
              className="ref-brand-img-logo"
            />
          </Link>
          <span className="admin-terminal-badge">BACK OFFICE</span>
        </div>

        {/* Primary Admin Navigation Links */}
        <nav className="admin-navstrip">
          <Link href="/admin" className="admin-nav-item">
            <Users size={14} className="ref-inline-icon" />
            <span>Clients</span>
          </Link>
          <Link href="/admin/sports" className="admin-nav-item">
            <Trophy size={14} className="ref-inline-icon" />
            <span>Sports</span>
          </Link>
          <Link href="/admin/casinos" className="admin-nav-item">
            <Gamepad2 size={14} className="ref-inline-icon" />
            <span>Casinos</span>
          </Link>
          <Link href="/admin/reports" className="admin-nav-item">
            <BarChart3 size={14} className="ref-inline-icon" />
            <span>Reports</span>
          </Link>
          <Link href="/admin/new" className="admin-nav-item highlight">
            <UserPlus size={14} className="ref-inline-icon" />
            <span>New Account</span>
          </Link>
        </nav>

        <div className="ref-spacer" />

        {/* Right Side: Quick Player Switch, Identity Badge & Sign Out */}
        <div className="admin-user-meta">
          <Link href="/play" className="admin-switch-btn" title="Open Player View">
            <ExternalLink size={13} className="ref-inline-icon" />
            <span>Player View</span>
          </Link>

          <div className="admin-identity-chip">
            <User size={13} className="ref-inline-icon accent" />
            <span className="admin-username">{viewer.username}</span>
            <span className="admin-role-pill">
              {viewer.role === "super_admin" ? "SUPER ADMIN" : "OPERATOR ADMIN"}
            </span>
          </div>

          <form action={logout}>
            <button className="admin-logout-btn" type="submit" title="Sign Out">
              <LogOut size={14} className="ref-inline-icon danger" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* 2. Main Executive Content Container */}
      <main className="admin-main-container">
        {children}
      </main>

      {/* 3. Admin Footer */}
      <footer className="admin-footer">
        <div className="admin-footer-content">
          <span className="admin-footer-brand">
            <ShieldCheck size={13} className="ref-inline-icon" /> {brandName} Enterprise Back-Office
          </span>
          <span className="admin-footer-sub">
            Real-time ledger audit active · Embedded PostgreSQL Spine
          </span>
        </div>
      </footer>
    </div>
  );
}

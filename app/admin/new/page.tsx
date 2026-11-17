import Link from "next/link";
import { createAccount } from "@/lib/actions";
import { currentAccount } from "@/lib/auth";
import {
  UserPlus,
  User,
  Lock,
  Percent,
  Coins,
  Shield,
  Smartphone,
  AlertTriangle,
} from "lucide-react";

export const metadata = {
  title: "Create New Account · Operator Admin",
  description: "Register a new client, agent, or operator administrator.",
};

export default async function NewAccount({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await currentAccount();
  const canCreateAdmin = viewer?.role === "super_admin";

  return (
    <div className="admin-form-page-container">
      <div className="admin-form-card">
        {/* Header */}
        <div className="admin-form-header">
          <div className="admin-form-header-icon">
            <UserPlus size={22} className="ref-inline-icon accent" />
          </div>
          <div>
            <h1 className="admin-form-title">Create New Account</h1>
            <p className="admin-form-sub">
              Register a downline account under {viewer?.username}. Balance starts at 0.00 Pts.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="admin-form-error" role="alert">
            <AlertTriangle size={16} className="ref-inline-icon danger" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form action={createAccount} className="admin-form-body">
          <div className="admin-form-grid">
            {/* Username */}
            <div className="admin-field-group">
              <label htmlFor="username" className="admin-field-label">
                Account Username <span className="req">*</span>
              </label>
              <div className="admin-input-wrap">
                <User size={15} className="admin-field-icon" />
                <input
                  id="username"
                  name="username"
                  required
                  minLength={3}
                  placeholder="e.g. client99"
                  className="admin-form-input"
                />
              </div>
            </div>

            {/* Full Name */}
            <div className="admin-field-group">
              <label htmlFor="fullName" className="admin-field-label">
                Full Name / Alias
              </label>
              <div className="admin-input-wrap">
                <User size={15} className="admin-field-icon" />
                <input
                  id="fullName"
                  name="fullName"
                  placeholder="e.g. John Doe"
                  className="admin-form-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="admin-field-group">
              <label htmlFor="password" className="admin-field-label">
                Initial Password <span className="req">*</span>
              </label>
              <div className="admin-input-wrap">
                <Lock size={15} className="admin-field-icon" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="admin-form-input"
                />
              </div>
            </div>

            {/* Role / Account Type */}
            <div className="admin-field-group">
              <label htmlFor="role" className="admin-field-label">
                Account Role <span className="req">*</span>
              </label>
              <div className="admin-input-wrap">
                <Shield size={15} className="admin-field-icon" />
                <select id="role" name="role" defaultValue="client" className="admin-form-select">
                  {canCreateAdmin && <option value="operator_admin">Operator Admin</option>}
                  <option value="client">Client (Player)</option>
                  <option value="agent">Agent (Master)</option>
                </select>
              </div>
            </div>

            {/* Book Mode */}
            <div className="admin-field-group">
              <label htmlFor="mode" className="admin-field-label">
                Book Execution Mode <span className="req">*</span>
              </label>
              <div className="admin-input-wrap">
                <Shield size={15} className="admin-field-icon" />
                <select id="mode" name="mode" defaultValue="real" className="admin-form-select">
                  <option value="real">Real Book (Live Settlement)</option>
                  <option value="demo">Demo Book (Practice Terminal)</option>
                </select>
              </div>
            </div>

            {/* Credit Limit */}
            <div className="admin-field-group">
              <label htmlFor="creditLimit" className="admin-field-label">
                Credit Limit (Pts)
              </label>
              <div className="admin-input-wrap">
                <Coins size={15} className="admin-field-icon" />
                <input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className="admin-form-input"
                />
              </div>
            </div>

            {/* Default % (Commission) */}
            <div className="admin-field-group">
              <label htmlFor="defaultPct" className="admin-field-label">
                Default Commission %
              </label>
              <div className="admin-input-wrap">
                <Percent size={15} className="admin-field-icon" />
                <input
                  id="defaultPct"
                  name="defaultPct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue="0"
                  className="admin-form-input"
                />
              </div>
            </div>

            {/* Mobile Contact */}
            <div className="admin-field-group">
              <label htmlFor="depositMobile" className="admin-field-label">
                Deposit / Contact Mobile
              </label>
              <div className="admin-input-wrap">
                <Smartphone size={15} className="admin-field-icon" />
                <input
                  id="depositMobile"
                  name="depositMobile"
                  inputMode="tel"
                  placeholder="Optional contact number"
                  className="admin-form-input"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="admin-form-actions">
            <button className="admin-btn-primary" type="submit">
              <UserPlus size={15} className="ref-inline-icon" />
              <span>Create Account</span>
            </button>
            <Link className="admin-btn-secondary" href="/admin">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

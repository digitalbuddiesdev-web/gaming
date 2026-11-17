"use client";

import { useState } from "react";
import { login } from "@/lib/actions";
import {
  Zap,
  AlertTriangle,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Scale,
} from "lucide-react";

export function LoginForm({ error }: { error?: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fillDemoClient = () => {
    setUsername("demouser");
    setPassword("admin12345");
  };

  const fillAdmin = () => {
    setUsername("admin");
    setPassword("admin12345");
  };

  return (
    <div className="login-card-container">
      {/* Brand Emblem & Header */}
      <div className="login-header-zone">
        <div className="login-brand-emblem-wrap">
          <svg
            className="login-brand-emblem"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <h1 className="login-title">CLUB-8910</h1>
        <p className="login-subtitle">High-Frequency Sportsbook & Gaming Exchange</p>
      </div>

      {/* Quick Demo Autofill Pills */}
      <div className="login-quick-fill-box">
        <span className="login-quick-label">
          <Zap className="ref-inline-icon accent" size={13} /> Quick Demo Access:
        </span>
        <div className="login-quick-buttons">
          <button
            type="button"
            className="login-quick-btn client"
            onClick={fillDemoClient}
          >
            Fill Demo Client (1500 Pts)
          </button>
          <button
            type="button"
            className="login-quick-btn admin"
            onClick={fillAdmin}
          >
            Fill Operator Admin
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="login-error-alert" role="alert">
          <AlertTriangle className="ref-inline-icon danger" size={16} />
          <span>
            {error === "rate"
              ? "Too many attempts. Please try again shortly."
              : "Invalid username or password, or account is currently locked."}
          </span>
        </div>
      )}

      {/* Login Form */}
      <form
        action={login}
        onSubmit={() => setIsSubmitting(true)}
        className="login-form-body"
      >
        <div className="login-field-group">
          <label htmlFor="username" className="login-label">
            Account Username
          </label>
          <div className="login-input-wrap">
            <span className="login-field-icon">
              <User size={15} />
            </span>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              placeholder="e.g. demouser or admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
            />
          </div>
        </div>

        <div className="login-field-group">
          <div className="login-label-row">
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <button
              type="button"
              className="login-toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <>
                  <EyeOff size={13} /> Hide
                </>
              ) : (
                <>
                  <Eye size={13} /> Show
                </>
              )}
            </button>
          </div>
          <div className="login-input-wrap">
            <span className="login-field-icon">
              <Lock size={15} />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="login-submit-btn"
        >
          {isSubmitting ? "Authenticating..." : "Sign In to Terminal"}
        </button>
      </form>

      {/* Trust & Security Footnote */}
      <div className="login-security-footer">
        <div className="login-trust-badges">
          <span className="trust-badge">
            <ShieldCheck size={13} className="ref-inline-icon" /> 256-Bit SSL Encrypted
          </span>
          <span className="trust-badge">
            <Scale size={13} className="ref-inline-icon" /> Provably Fair Ledger
          </span>
        </div>
        <p className="login-disclaimer">
          Authorized personnel and registered clients only. Real-time session monitoring is active.
        </p>
      </div>
    </div>
  );
}

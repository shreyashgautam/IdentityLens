import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigateToRegister?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister }) => {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('elena.vance@enterprise-sec.io');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [hardwareMfa, setHardwareMfa] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your work email or security principal.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password or passkey.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedEmail, password);
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSsoClick = (provider: string) => {
    setLocalError(`SSO via ${provider} is configured for Enterprise SAML/OIDC. Please authenticate with local IAM credentials below in this environment.`);
  };

  const displayError = localError || error;

  return (
    <div className="stitch-split-auth-container">
      {/* LEFT HALF: Enterprise Login Form (50% on desktop) */}
      <div className="stitch-auth-left-panel">
        {/* Top Bar: Brand & Environment Tag */}
        <div className="stitch-auth-top-bar">
          <div className="stitch-brand-cluster">
            <div className="stitch-brand-badge-id">ID</div>
            <div>
              <div className="stitch-brand-title">IdentityLens</div>
              <p className="stitch-brand-subtitle">Cloud Identity Governance Platform</p>
            </div>
          </div>
        </div>

        {/* Center: Main Login Content Box */}
        <div className="stitch-auth-center-box">
          {/* Heading */}
          <div className="stitch-auth-heading-group">
            <h1 className="stitch-auth-main-title">Sign in to Console</h1>
            <p className="stitch-auth-main-subtitle">
              Enter your enterprise security credentials to access inventory audits, identity posture, and blast-radius telemetry.
            </p>
          </div>

          {/* SSO Quick Identity Providers */}
          <div className="stitch-sso-group">
            <button
              type="button"
              className="stitch-sso-btn-primary"
              onClick={() => handleSsoClick('Okta Workforce')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007DC1" strokeWidth="3.5">
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span>Single Sign-On with <strong>Okta Workforce</strong></span>
            </button>

            <div className="stitch-sso-grid-secondary">
              <button
                type="button"
                className="stitch-sso-btn-secondary"
                onClick={() => handleSsoClick('Microsoft Entra')}
              >
                <svg width="14" height="14" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f3" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <span>Microsoft Entra</span>
              </button>
              <button
                type="button"
                className="stitch-sso-btn-secondary"
                onClick={() => handleSsoClick('Google Workspace')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google Workspace</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="stitch-auth-divider">
            <div className="stitch-divider-line" />
            <span className="stitch-divider-label">OR CONTINUE WITH IAM KEY</span>
            <div className="stitch-divider-line" />
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="stitch-auth-error-alert" role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              <span className="stitch-error-text">{displayError}</span>
              <button
                type="button"
                className="stitch-error-close"
                onClick={() => {
                  setLocalError(null);
                  clearError();
                }}
                aria-label="Dismiss error"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>
            </div>
          )}

          {/* Direct Login Form */}
          <form className="stitch-auth-form" onSubmit={handleSubmit} noValidate>
            <div className="stitch-form-field">
              <label className="stitch-field-label" htmlFor="email">
                Work Email / Security Principal
              </label>
              <div className="stitch-input-relative">
                <input
                  id="email"
                  type="text"
                  className="stitch-field-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="username"
                  autoFocus
                  required
                />
                <span className="stitch-scim-badge">SCIM Verified</span>
              </div>
            </div>

            <div className="stitch-form-field">
              <div className="stitch-field-label-row">
                <label className="stitch-field-label" htmlFor="password">
                  Password or Passkey
                </label>
                <a href="#" className="stitch-field-link" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <div className="stitch-input-relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="stitch-field-input font-mono"
                  placeholder="••••••••••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="stitch-input-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* MFA Hardware Token / Authenticator Option */}
            <div className="stitch-mfa-box">
              <input
                id="hardware-mfa"
                type="checkbox"
                checked={hardwareMfa}
                onChange={(e) => setHardwareMfa(e.target.checked)}
                className="stitch-checkbox"
              />
              <div className="stitch-mfa-text">
                <label htmlFor="hardware-mfa" className="stitch-mfa-title">
                  Require FIDO2 / WebAuthn Hardware Key
                </label>
                <p className="stitch-mfa-desc">
                  Enforced for identities with access to Production Infrastructure Tier 1.
                </p>
              </div>
            </div>

            {/* Primary Submit Action */}
            <button
              type="submit"
              className="stitch-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span>
                  <span>Authenticating Identity Session...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Identity Session →</span>
                </>
              )}
            </button>
          </form>

          {/* Compliance & Switch Link */}
          <div className="stitch-switch-register-row">
            <span>New organization? </span>
            {onNavigateToRegister ? (
              <button
                type="button"
                className="stitch-register-link-btn"
                onClick={onNavigateToRegister}
              >
                Register your organization →
              </button>
            ) : (
              <a href="#" className="stitch-register-link-btn">
                Register your organization →
              </a>
            )}
          </div>

          <div className="stitch-compliance-bar">
            <span>SOC 2 Type II • ISO 27001 • HIPAA Compliant</span>
          </div>
        </div>

        {/* Bottom Footer of Left Side */}
        <div className="stitch-auth-bottom-footer">
          <span>© 2025 IdentityLens IAM Inc. All rights reserved.</span>
          <div className="stitch-footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Security Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>SLA Status</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Notice</a>
          </div>
        </div>
      </div>

      {/* RIGHT HALF: Live Security Telemetry & Platform Showcase (50% on desktop) */}
      <div className="stitch-auth-right-panel">
        {/* Subtle radial grid background */}
        <div className="stitch-right-bg-grid" />

        {/* Top Header of Right Half */}
        <div className="stitch-right-header">
          <div className="stitch-cloud-status">
            <span className="stitch-status-dot-neutral" />
            <span>Enterprise Identity Cloud</span>
          </div>
          <div className="stitch-version-tag">v4.19</div>
        </div>

        {/* Main Showcase Container */}
        <div className="stitch-showcase-box">
          <div className="stitch-showcase-titles">
            <span className="stitch-showcase-kicker">IDENTITY GOVERNANCE</span>
            <h2 className="stitch-showcase-heading">Continuous Identity &amp; Access Governance</h2>
            <p className="stitch-showcase-desc">
              Autonomous visibility and zero-trust controls across enterprise identity providers, service principals, and infrastructure assets.
            </p>
          </div>

          {/* 3 Metric Cards */}
          <div className="stitch-showcase-metrics-grid">
            <div className="stitch-metric-tile">
              <div className="stitch-metric-label">Identities</div>
              <div className="stitch-metric-val">4,892</div>
              <div className="stitch-metric-sub">Monitored</div>
            </div>
            <div className="stitch-metric-tile">
              <div className="stitch-metric-label">Integrations</div>
              <div className="stitch-metric-val">186</div>
              <div className="stitch-metric-sub">Active SCIM</div>
            </div>
            <div className="stitch-metric-tile">
              <div className="stitch-metric-label">Uptime SLA</div>
              <div className="stitch-metric-val" style={{ color: '#34D399' }}>99.98%</div>
              <div className="stitch-metric-sub">Certified</div>
            </div>
          </div>

          {/* Security Posture card */}
          <div className="stitch-posture-card">
            <div className="stitch-posture-header">
              <span>SECURITY POSTURE</span>
              <span className="stitch-posture-badge">FIDO2 / WebAuthn Enforced</span>
            </div>
            <div className="stitch-posture-desc">
              All cross-account sessions and administrative IAM roles operate under just-in-time credential validation with immutable audit logs.
            </div>
          </div>

          <div className="stitch-showcase-footer-badges">
            <span>Audited to SOC 2 Type II Standards</span>
            <span>Enterprise Tier</span>
          </div>
        </div>

        {/* Bottom of Right Half */}
        <div className="stitch-right-bottom-footer">
          <span>IdentityLens Security Platform</span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
};

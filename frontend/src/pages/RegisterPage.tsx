import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [securityRole, setSecurityRole] = useState('IAM Architect / Lead');
  const [orgName, setOrgName] = useState('Apex Cloud Defense');
  const [cloudFootprint, setCloudFootprint] = useState<'AWS' | 'Azure' | 'GCP' | 'Hybrid'>('AWS');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedOrg = orgName.trim();
    if (!trimmedOrg || trimmedOrg.length < 2) {
      setLocalError('Organization entity name must be at least 2 characters.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your work email or security principal.');
      return;
    }

    if (!password) {
      setLocalError('Please enter an enterprise password (minimum 6 characters).');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(trimmedOrg, trimmedEmail, password, fullName.trim() || undefined);
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="stitch-split-auth-container">
      {/* LEFT PANEL: 50% dark slate-obsidian showcase matching Stitch */}
      <div className="stitch-auth-right-panel stitch-reg-left-showcase">
        <div className="stitch-right-bg-grid" />

        {/* Top Header of Left Half */}
        <div className="stitch-right-header">
          <div className="stitch-brand-cluster-dark">
            <div className="stitch-verified-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified_user</span>
            </div>
            <span className="stitch-brand-title-dark">IdentityLens</span>
          </div>
          <span className="stitch-tag-badge">
            Identity Governance / Onboarding
          </span>
        </div>

        {/* Showcase Content */}
        <div className="stitch-showcase-box">
          <div className="stitch-showcase-titles">
            <h1 className="stitch-showcase-heading">
              Continuous Identity &amp; Access Governance
            </h1>
            <p className="stitch-showcase-desc">
              Autonomous visibility and zero-trust controls across enterprise identity providers, service principals, and infrastructure assets.
            </p>
          </div>

          {/* 3 Metric Cards */}
          <div className="stitch-showcase-metrics-grid">
            <div className="stitch-metric-tile">
              <div className="stitch-metric-val">3,420+</div>
              <div className="stitch-metric-sub">Monitored Entities</div>
            </div>
            <div className="stitch-metric-tile">
              <div className="stitch-metric-val">184</div>
              <div className="stitch-metric-sub">Connected Apps</div>
            </div>
            <div className="stitch-metric-tile">
              <div className="stitch-metric-val" style={{ color: '#34D399' }}>99.98%</div>
              <div className="stitch-metric-sub">SLA Uptime</div>
            </div>
          </div>

          {/* Automated Pipeline Engine Card */}
          <div className="stitch-pipeline-card">
            <div className="stitch-pipeline-header">
              <span className="stitch-pipeline-title">
                <span className="stitch-pulse-dot" />
                Automated Pipeline Engine
              </span>
              <span className="stitch-pipeline-badge">Read-only OIDC</span>
            </div>
            <div className="stitch-pipeline-list">
              <div className="stitch-pipeline-item">
                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: '15px' }}>check_circle</span>
                <span>Instant IdP connector configuration across Okta, Entra ID, &amp; Ping</span>
              </div>
              <div className="stitch-pipeline-item">
                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: '15px' }}>check_circle</span>
                <span>Continuous blast radius &amp; toxic triad triage engine</span>
              </div>
              <div className="stitch-pipeline-item">
                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: '15px' }}>check_circle</span>
                <span>Full audit trace &amp; compliance mappings mapped to CIS benchmarks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom of Left Half */}
        <div className="stitch-right-bottom-footer">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
            Audited to SOC 2 Type II Standards • Enterprise Tier
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34D399', marginRight: '6px' }} />
            End-to-End Encrypted
          </span>
        </div>
      </div>

      {/* RIGHT PANEL: 50% clean white enterprise form container */}
      <div className="stitch-auth-left-panel">
        {/* Top Header: Switch link */}
        <div className="stitch-auth-top-bar" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="stitch-switch-btn"
            onClick={onNavigateToLogin}
          >
            <span style={{ color: '#64748B' }}>Already have an account?</span>
            <span style={{ fontWeight: 600, color: '#0F172A', textDecoration: 'underline' }}>Sign in →</span>
          </button>
        </div>

        {/* Center Box */}
        <div className="stitch-auth-center-box" style={{ maxWidth: '500px' }}>
          <div className="stitch-auth-heading-group" style={{ marginBottom: '20px' }}>
            <h2 className="stitch-auth-main-title">
              Create your organization workspace
            </h2>
            <p className="stitch-auth-main-subtitle">
              Set up your continuous identity governance workspace in minutes.
            </p>
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

          {/* Form */}
          <form className="stitch-reg-form" onSubmit={handleSubmit} noValidate>
            {/* Work Email / Username */}
            <div className="stitch-form-field">
              <label className="stitch-field-label" htmlFor="reg-email">
                Work Email or Principal Username
              </label>
              <div className="stitch-input-icon-wrapper">
                <span className="material-symbols-outlined stitch-leading-icon">mail</span>
                <input
                  id="reg-email"
                  type="text"
                  className="stitch-reg-input"
                  placeholder="shreyashgautam2007 or name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Full Name & Security Role */}
            <div className="stitch-grid-2col">
              <div className="stitch-form-field">
                <label className="stitch-field-label" htmlFor="fullName">
                  Full Name
                </label>
                <div className="stitch-input-icon-wrapper">
                  <span className="material-symbols-outlined stitch-leading-icon">badge</span>
                  <input
                    id="fullName"
                    type="text"
                    className="stitch-reg-input"
                    placeholder="Security Lead Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="stitch-form-field">
                <label className="stitch-field-label" htmlFor="roleTitle">
                  Security Role
                </label>
                <div className="stitch-input-icon-wrapper">
                  <span className="material-symbols-outlined stitch-leading-icon">manage_accounts</span>
                  <select
                    id="roleTitle"
                    value={securityRole}
                    onChange={(e) => setSecurityRole(e.target.value)}
                    className="stitch-reg-select"
                  >
                    <option value="IAM Architect / Lead">IAM Architect / Lead</option>
                    <option value="Chief Information Security Officer (CISO)">Chief Information Security Officer (CISO)</option>
                    <option value="SecOps Incident Commander">SecOps Incident Commander</option>
                    <option value="DevSecOps / Cloud Architect">DevSecOps / Cloud Architect</option>
                    <option value="Compliance & GRC Director">Compliance &amp; GRC Director</option>
                  </select>
                  <span className="material-symbols-outlined stitch-trailing-icon">expand_more</span>
                </div>
              </div>
            </div>

            {/* Organization Entity Name */}
            <div className="stitch-form-field">
              <label className="stitch-field-label" htmlFor="orgName">
                Organization Entity Name
              </label>
              <div className="stitch-input-icon-wrapper" style={{ marginBottom: '6px' }}>
                <span className="material-symbols-outlined stitch-leading-icon">corporate_fare</span>
                <input
                  id="orgName"
                  type="text"
                  className="stitch-reg-input"
                  placeholder="Acme Federal Infrastructure"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  required
                />
              </div>

              {/* Workspace URL Live Preview */}
              <div className="stitch-slug-box">
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#475569' }}>link</span>
                <span style={{ color: '#64748B' }}>Workspace URL:</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                  identitylens.io/<span style={{ textDecoration: 'underline' }}>{slug}</span>
                </span>
              </div>
            </div>

            {/* Primary Cloud Footprint Selector */}
            <div className="stitch-form-field">
              <label className="stitch-field-label">
                Primary Cloud Footprint
              </label>
              <div className="stitch-cloud-grid">
                <button
                  type="button"
                  className={`stitch-cloud-pill ${cloudFootprint === 'AWS' ? 'active' : ''}`}
                  onClick={() => setCloudFootprint('AWS')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cloud</span>
                  <span>AWS</span>
                </button>

                <button
                  type="button"
                  className={`stitch-cloud-pill ${cloudFootprint === 'Azure' ? 'active' : ''}`}
                  onClick={() => setCloudFootprint('Azure')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cloud_queue</span>
                  <span>Azure</span>
                </button>

                <button
                  type="button"
                  className={`stitch-cloud-pill ${cloudFootprint === 'GCP' ? 'active' : ''}`}
                  onClick={() => setCloudFootprint('GCP')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>filter_drama</span>
                  <span>Google Cloud</span>
                </button>

                <button
                  type="button"
                  className={`stitch-cloud-pill ${cloudFootprint === 'Hybrid' ? 'active' : ''}`}
                  onClick={() => setCloudFootprint('Hybrid')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>hub</span>
                  <span>Hybrid Multi</span>
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="stitch-form-field">
              <label className="stitch-field-label" htmlFor="password">
                Enterprise Password / FIDO2 Passkey
              </label>
              <div className="stitch-input-icon-wrapper">
                <span className="material-symbols-outlined stitch-leading-icon">key</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="stitch-reg-input font-mono"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="stitch-trailing-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div style={{ paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="stitch-btn-submit"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span>
                    <span>Creating Organization Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Organization &amp; Continue →</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="stitch-auth-bottom-footer" style={{ flexDirection: 'column', gap: '6px' }}>
          <div>SOC 2 Type II • ISO 27001 • HIPAA Compliant</div>
          <div className="stitch-footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Security Policy</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>SLA Status</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy Notice</a>
          </div>
        </div>
      </div>
    </div>
  );
};

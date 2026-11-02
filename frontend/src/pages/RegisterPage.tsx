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
      // Error is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="stitch-split-auth-container">
      {/* LEFT PANEL: 50% dark slate-obsidian showcase matching Stitch */}
      <div className="stitch-auth-right-panel lg:border-r lg:border-slate-800/80">
        <div className="stitch-right-bg-grid" />

        {/* Top Header of Left Half */}
        <div className="stitch-right-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <span className="text-[18px] font-semibold tracking-tight text-white">IdentityLens</span>
          </div>
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            Identity Governance / Onboarding
          </span>
        </div>

        {/* Showcase Content */}
        <div className="stitch-showcase-box">
          <div className="stitch-showcase-titles">
            <h1 className="text-[26px] sm:text-[30px] font-semibold text-white tracking-tight leading-snug">
              Continuous Identity &amp; Access Governance
            </h1>
            <p className="stitch-showcase-desc">
              Autonomous visibility and zero-trust controls across enterprise identity providers, service principals, and infrastructure assets.
            </p>
          </div>

          {/* 3 Metric Cards */}
          <div className="stitch-showcase-metrics-grid">
            <div className="stitch-metric-tile">
              <div className="text-[24px] sm:text-[26px] font-bold text-white tracking-tight font-mono">3,420+</div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Monitored Entities</div>
            </div>
            <div className="stitch-metric-tile">
              <div className="text-[24px] sm:text-[26px] font-bold text-white tracking-tight font-mono">184</div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Connected Apps</div>
            </div>
            <div className="stitch-metric-tile">
              <div className="text-[24px] sm:text-[26px] font-bold text-emerald-400 tracking-tight font-mono">99.98%</div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">SLA Uptime</div>
            </div>
          </div>

          {/* Automated Pipeline Engine Card */}
          <div className="p-5 rounded-lg bg-slate-900/40 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Automated Pipeline Engine
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                Read-only OIDC
              </span>
            </div>
            <div className="space-y-2.5 text-slate-300 text-[12px] leading-relaxed">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[15px] text-blue-400">check_circle</span>
                <span>Instant IdP connector configuration across Okta, Entra ID, &amp; Ping</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[15px] text-blue-400">check_circle</span>
                <span>Continuous blast radius &amp; toxic triad triage engine</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[15px] text-blue-400">check_circle</span>
                <span>Full audit trace &amp; compliance mappings mapped to CIS benchmarks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom of Left Half */}
        <div className="stitch-right-bottom-footer">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Audited to SOC 2 Type II Standards • Enterprise Tier
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            End-to-End Encrypted
          </span>
        </div>
      </div>

      {/* RIGHT PANEL: 50% clean white enterprise form container */}
      <div className="stitch-auth-left-panel">
        {/* Top Header: Switch link */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <span className="text-[17px] font-semibold text-slate-900 tracking-tight">IdentityLens</span>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900 transition-colors bg-transparent border-0 cursor-pointer"
              onClick={onNavigateToLogin}
            >
              <span className="text-slate-500">Already have an account?</span>
              <span className="font-semibold text-slate-900 hover:underline">Sign in →</span>
            </button>
          </div>
        </div>

        {/* Center Box */}
        <div className="stitch-auth-center-box py-4">
          <div className="space-y-1.5 mb-6">
            <h2 className="text-[26px] sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Create your organization workspace
            </h2>
            <p className="text-[13.5px] text-slate-500 leading-relaxed">
              Set up your continuous identity governance workspace in minutes.
            </p>
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="stitch-auth-error-alert mb-4" role="alert">
              <span className="material-symbols-outlined text-[18px]">error</span>
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
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4 pt-1" onSubmit={handleSubmit} noValidate>
            {/* Work Email / Username */}
            <div className="stitch-form-field">
              <label className="block text-[12.5px] font-medium text-slate-800 mb-1.5" htmlFor="reg-email">
                Work Email or Principal Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                  mail
                </span>
                <input
                  id="reg-email"
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50/50 hover:bg-white text-slate-900 text-[13px] rounded-md border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[12.5px] font-medium text-slate-800 mb-1.5" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                    badge
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50/50 hover:bg-white text-slate-900 text-[13px] rounded-md border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                    placeholder="Security Lead Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-slate-800 mb-1.5" htmlFor="roleTitle">
                  Security Role
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                    manage_accounts
                  </span>
                  <select
                    id="roleTitle"
                    value={securityRole}
                    onChange={(e) => setSecurityRole(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50/50 hover:bg-white text-slate-900 text-[13px] rounded-md border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 appearance-none cursor-pointer transition-all"
                  >
                    <option value="IAM Architect / Lead">IAM Architect / Lead</option>
                    <option value="Chief Information Security Officer (CISO)">Chief Information Security Officer (CISO)</option>
                    <option value="SecOps Incident Commander">SecOps Incident Commander</option>
                    <option value="DevSecOps / Cloud Architect">DevSecOps / Cloud Architect</option>
                    <option value="Compliance & GRC Director">Compliance &amp; GRC Director</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Organization Entity Name */}
            <div>
              <label className="block text-[12.5px] font-medium text-slate-800 mb-1.5" htmlFor="orgName">
                Organization Entity Name
              </label>
              <div className="relative mb-1.5">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                  corporate_fare
                </span>
                <input
                  id="orgName"
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50/50 hover:bg-white text-slate-900 text-[13px] rounded-md border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
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
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-slate-500 font-mono text-[11.5px]">
                <span className="material-symbols-outlined text-[15px] text-slate-600">link</span>
                <span className="text-slate-500">Workspace URL:</span>
                <span className="text-slate-900 font-semibold">
                  identitylens.io/<span className="text-slate-900 underline">{slug}</span>
                </span>
              </div>
            </div>

            {/* Primary Cloud Footprint Selector */}
            <div>
              <label className="block text-[12.5px] font-medium text-slate-800 mb-1.5">
                Primary Cloud Footprint
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  className={`px-3 py-2 text-center rounded-md text-[12px] font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 border cursor-pointer ${
                    cloudFootprint === 'AWS'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setCloudFootprint('AWS')}
                >
                  <span className="material-symbols-outlined text-[16px]">cloud</span>
                  <span>AWS</span>
                </button>

                <button
                  type="button"
                  className={`px-3 py-2 text-center rounded-md text-[12px] font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 border cursor-pointer ${
                    cloudFootprint === 'Azure'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setCloudFootprint('Azure')}
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-500">cloud_queue</span>
                  <span>Azure</span>
                </button>

                <button
                  type="button"
                  className={`px-3 py-2 text-center rounded-md text-[12px] font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 border cursor-pointer ${
                    cloudFootprint === 'GCP'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setCloudFootprint('GCP')}
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-500">filter_drama</span>
                  <span>Google Cloud</span>
                </button>

                <button
                  type="button"
                  className={`px-3 py-2 text-center rounded-md text-[12px] font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 border cursor-pointer ${
                    cloudFootprint === 'Hybrid'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setCloudFootprint('Hybrid')}
                >
                  <span className="material-symbols-outlined text-[16px] text-slate-500">hub</span>
                  <span>Hybrid Multi</span>
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12.5px] font-medium text-slate-800 mb-1.5" htmlFor="password">
                Enterprise Password / FIDO2 Passkey
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                  key
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50/50 hover:bg-white text-slate-900 font-mono text-[12.5px] rounded-md border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
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
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-6 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-[14px] tracking-tight shadow hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Creating Organization Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Organization &amp; Continue</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="stitch-auth-bottom-footer flex-col items-center gap-2 text-center">
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

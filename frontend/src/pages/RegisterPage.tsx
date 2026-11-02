import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register, error, clearError } = useAuth();
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedOrg = organization.trim();
    if (!trimmedOrg) {
      setLocalError('Please enter your organization name.');
      return;
    }

    if (trimmedOrg.length < 2) {
      setLocalError('Organization name must be at least 2 characters.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter a work email address or username.');
      return;
    }

    if (!password) {
      setLocalError('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(trimmedOrg, trimmedEmail, password, displayName.trim() || undefined);
    } catch {
      // Error is stored in AuthContext state
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-badge">
            <span className="material-symbols-outlined text-[28px]">domain</span>
          </div>
          <h1 className="login-app-title">IdentityLens</h1>
          <span className="login-app-tagline">Enterprise IAM & Security Console</span>
        </div>

        {/* Card Body */}
        <div className="login-card">
          <div className="login-card-intro">
            <h2 className="login-heading">Register Organization</h2>
            <p className="login-subheading">
              Set up your organization tenant and provision administrator access.
            </p>
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="login-error-alert" role="alert">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="error-message-text">{displayError}</span>
              <button
                type="button"
                className="error-dismiss-btn"
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

          {/* Registration Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Organization Name */}
            <div className="form-group">
              <label htmlFor="organization" className="form-label">
                Organization / Company Name
              </label>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">corporate_fare</span>
                <input
                  id="organization"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Northstar Labs or Acme Corp"
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Email / Username */}
            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">
                Admin Work Email or Username
              </label>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">person</span>
                <input
                  id="reg-email"
                  type="text"
                  className="form-input"
                  placeholder="shreyashgautam2007 or admin@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Display Name (Optional) */}
            <div className="form-group">
              <label htmlFor="reg-display-name" className="form-label">
                Your Full Name (Optional)
              </label>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">badge</span>
                <input
                  id="reg-display-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Shreyash Gautam"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Admin Password
              </label>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">lock</span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="At least 6 characters"
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
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="reg-confirm-password" className="form-label">
                Confirm Password
              </label>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">check_circle</span>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="security-notice-badge">
              <span className="material-symbols-outlined text-[16px] text-[#64748B]">verified_user</span>
              <span>Organization creators are assigned full Administrator privileges.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Provisioning Organization...</span>
                </>
              ) : (
                <>
                  <span>Create Organization Account</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            {/* Switch to Sign In */}
            <div className="auth-switch-prompt">
              <span>Already registered? </span>
              <button
                type="button"
                className="auth-switch-link"
                onClick={onNavigateToLogin}
              >
                Sign In to Platform
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="login-footer-text">
            IdentityLens Platform · Multi-Tenant Identity Security & Governance
          </p>
        </div>
      </div>
    </div>
  );
};


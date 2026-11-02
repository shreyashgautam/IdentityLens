import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your corporate email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedEmail, password);
    } catch {
      // Error is set in AuthContext
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
            <span className="material-symbols-outlined text-[28px]">fingerprint</span>
          </div>
          <h1 className="login-app-title">IdentityLens</h1>
          <span className="login-app-tagline">Enterprise IAM & Security Console</span>
        </div>

        {/* Card Body */}
        <div className="login-card">
          <div className="login-card-intro">
            <h2 className="login-heading">Sign In</h2>
            <p className="login-subheading">
              Authenticate with your corporate credentials to access the identity discovery dashboard.
            </p>
          </div>

          {/* Error Banner */}
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

          {/* Sign In Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Corporate Email Address
              </label>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">mail</span>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@enterprise.io"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
              </div>
              <div className="input-icon-wrapper">
                <span className="material-symbols-outlined input-leading-icon">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="Enter your password"
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

            {/* Zero Trust Info Badge */}
            <div className="security-notice-badge">
              <span className="material-symbols-outlined text-[16px] text-[#64748B]">security</span>
              <span>Session protected by HttpOnly refresh tokens and Zero Trust policy.</span>
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Compliance Footer */}
        <div className="login-footer">
          <p className="login-footer-text">
            IdentityLens Platform · Protected by Single-Use Token Rotation & Audit Logging
          </p>
        </div>
      </div>
    </div>
  );
};


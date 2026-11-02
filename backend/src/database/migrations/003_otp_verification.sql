-- ==============================================================================
-- Migration: 003_otp_verification.sql
-- Description: Two-Factor Authentication (2FA) OTP Verification Table
-- Conforms strictly to: docs/data-model.md & docs/architecture.md
-- ==============================================================================

CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    mfa_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_mfa_token ON otp_verifications (mfa_token);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_verifications (user_id);


-- ==============================================================================
-- Migration: 002_authentication_schema.sql
-- Description: Authentication & Session Foundation for IdentityLens (M6 Phase 1)
-- Conforms strictly to: docs/data-model.md & docs/architecture.md
-- ==============================================================================

-- 1. USERS TABLE
-- Core local identity record and authorization boundary
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(64) NOT NULL DEFAULT 'password',
    role VARCHAR(32) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INT NOT NULL DEFAULT 1,
    tokens_valid_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    firebase_tokens_valid_after TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: users.email and users.firebase_uid already have unique btree indexes 
-- created automatically by their respective UNIQUE constraints.

-- 2. USER SESSIONS TABLE
-- Logical device sessions, stable across refresh-token rotation
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_refresh_token_hash VARCHAR(64) NOT NULL,
    user_agent TEXT NULL,
    ip_address VARCHAR(45) NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup ON user_sessions (id, is_revoked, expires_at);

-- 3. CONSUMED REFRESH TOKENS TABLE
-- Retains consumed refresh token hashes for deterministic replay detection
CREATE TABLE IF NOT EXISTS consumed_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumed_tokens_lookup ON consumed_refresh_tokens (session_id, token_hash);
CREATE INDEX IF NOT EXISTS idx_consumed_tokens_cleanup ON consumed_refresh_tokens (consumed_at);

-- 4. AUTH AUDIT LOG TABLE
-- Append-oriented security event trail (administrative promotions, account locks, security events)
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(64) NOT NULL,
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    operator VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log (action);

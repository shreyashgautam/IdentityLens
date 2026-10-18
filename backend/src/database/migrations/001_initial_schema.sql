-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema for IdentityLens (IVIP Mini)
-- Conforms strictly to: docs/data-model.md & docs/architecture.md
-- ==============================================================================

-- Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. IDENTITIES TABLE
-- Canonical human and non-human identity inventory
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(255) NOT NULL,
    identity_type VARCHAR(50) NOT NULL CHECK (identity_type IN ('human', 'service_account', 'bot', 'ai_agent')),
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'unknown')),
    owner_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    department VARCHAR(100),
    title VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_identities_not_self_owner CHECK (owner_id IS NULL OR owner_id <> id)
);

-- 2. APPLICATIONS TABLE
-- Target systems (SaaS, cloud, internal platforms)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    auth_type VARCHAR(50) DEFAULT 'password',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACCOUNTS TABLE
-- Target system accounts linked to canonical identities
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    external_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended', 'unknown')),
    last_login_at TIMESTAMPTZ,
    source VARCHAR(100) DEFAULT 'direct',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_accounts_app_external_id UNIQUE (application_id, external_id)
);

-- 4. ENTITLEMENTS TABLE
-- Application permissions, roles, groups, and access levels
CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    external_id VARCHAR(255),
    description TEXT,
    type VARCHAR(50) DEFAULT 'role' CHECK (type IN ('role', 'group', 'permission', 'license')),
    is_privileged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entitlements_app_name UNIQUE (application_id, name)
);

-- 5. ACCOUNT_ENTITLEMENTS TABLE
-- Many-to-many relationship assigning entitlements to accounts
CREATE TABLE IF NOT EXISTS account_entitlements (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, entitlement_id)
);

-- 6. RISK_FINDINGS TABLE
-- Deterministic risk findings detected across identities and accounts
CREATE TABLE IF NOT EXISTS risk_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID REFERENCES identities(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    rule_code VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'suppressed', 'dismissed')),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    remediation_guidance TEXT,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_risk_findings_entity_ref CHECK (identity_id IS NOT NULL OR account_id IS NOT NULL)
);

-- PERFORMANCE & SEARCH INDEXES (docs/data-model.md Section 8)
CREATE INDEX IF NOT EXISTS idx_identities_status ON identities(status);
CREATE INDEX IF NOT EXISTS idx_identities_email ON identities(email);
CREATE INDEX IF NOT EXISTS idx_identities_owner_id ON identities(owner_id);

CREATE INDEX IF NOT EXISTS idx_accounts_identity_id ON accounts(identity_id);
CREATE INDEX IF NOT EXISTS idx_accounts_application_id ON accounts(application_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

CREATE INDEX IF NOT EXISTS idx_entitlements_application_id ON entitlements(application_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_is_privileged ON entitlements(is_privileged);

CREATE INDEX IF NOT EXISTS idx_account_entitlements_entitlement_id ON account_entitlements(entitlement_id);

CREATE INDEX IF NOT EXISTS idx_risk_findings_rule_code ON risk_findings(rule_code);
CREATE INDEX IF NOT EXISTS idx_risk_findings_status ON risk_findings(status);
CREATE INDEX IF NOT EXISTS idx_risk_findings_severity ON risk_findings(severity);
CREATE INDEX IF NOT EXISTS idx_risk_findings_identity_id ON risk_findings(identity_id);
CREATE INDEX IF NOT EXISTS idx_risk_findings_account_id ON risk_findings(account_id);

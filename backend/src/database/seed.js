import { fileURLToPath } from 'url';
import { getClient, pool } from './connection.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * Fictional Organization: Northstar Labs
 * Synthetic Development Seed Dataset for IdentityLens
 * Conforms to docs/data-model.md & M3 Seed Specifications
 */

// 1. Identities (8 records: 6 humans, 1 service account, 1 bot)
export const SEED_IDENTITIES = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    display_name: 'Dr. Alice Morgan',
    identity_type: 'human',
    email: 'alice.morgan@northstarlabs.io',
    status: 'active',
    owner_id: null,
    department: 'Engineering Leadership',
    title: 'VP of Engineering'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    display_name: 'Ben Carter',
    identity_type: 'human',
    email: 'ben.carter@northstarlabs.io',
    status: 'active',
    owner_id: 'a0000000-0000-0000-0000-000000000001',
    department: 'Platform & Infrastructure',
    title: 'Principal DevOps Engineer'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    display_name: 'Nina Patel',
    identity_type: 'human',
    email: 'nina.patel@northstarlabs.io',
    status: 'active',
    owner_id: 'a0000000-0000-0000-0000-000000000001',
    department: 'Information Security',
    title: 'Staff Security Architect'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    display_name: 'David Kim',
    identity_type: 'human',
    email: 'david.kim@northstarlabs.io',
    status: 'active',
    owner_id: 'a0000000-0000-0000-0000-000000000001',
    department: 'Core Product Engineering',
    title: 'Senior Full-Stack Engineer'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    display_name: 'Elena Rostova',
    identity_type: 'human',
    email: 'elena.rostova@contractor.northstarlabs.io',
    status: 'suspended',
    owner_id: 'a0000000-0000-0000-0000-000000000003',
    department: 'Data Intelligence',
    title: 'Contract ML Researcher'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    display_name: 'Marcus Vance',
    identity_type: 'human',
    email: 'marcus.vance@northstarlabs.io',
    status: 'inactive',
    owner_id: 'a0000000-0000-0000-0000-000000000001',
    department: 'Product Management',
    title: 'Former Senior PM'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    display_name: 'Northstar CI/CD Deployment Engine',
    identity_type: 'service_account',
    email: 'svc-cicd@northstarlabs.io',
    status: 'active',
    owner_id: 'a0000000-0000-0000-0000-000000000002',
    department: 'DevOps & Tooling',
    title: 'Automated Pipeline Agent'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000008',
    display_name: 'Northstar SecOps Vulnerability Scanner',
    identity_type: 'bot',
    email: 'bot-scanner@northstarlabs.io',
    status: 'active',
    owner_id: 'a0000000-0000-0000-0000-000000000003',
    department: 'Cyber Defense',
    title: 'Automated Compliance Auditor'
  }
];

// 2. Applications (5 target systems)
export const SEED_APPLICATIONS = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'AWS Cloud Infrastructure',
    key: 'aws_cloud',
    description: 'Production & Staging Amazon Web Services tenant',
    status: 'active',
    auth_type: 'iam'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    name: 'GitHub Enterprise',
    key: 'github_enterprise',
    description: 'Version control, issue tracking, and CI/CD pipelines',
    status: 'active',
    auth_type: 'oauth2'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    name: 'Google Workspace',
    key: 'google_workspace',
    description: 'Corporate email, calendar, drive, and identity provider',
    status: 'active',
    auth_type: 'saml'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    name: 'Slack Enterprise',
    key: 'slack_enterprise',
    description: 'Real-time engineering collaboration and incident channels',
    status: 'active',
    auth_type: 'sso'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    name: 'Jira Software',
    key: 'jira_software',
    description: 'Sprint planning and sprint task tracking',
    status: 'active',
    auth_type: 'atlassian_access'
  }
];

// 3. Application Accounts (14 accounts across applications)
export const SEED_ACCOUNTS = [
  // AWS Accounts (App b01)
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    identity_id: 'a0000000-0000-0000-0000-000000000002', // Ben Carter
    external_id: 'usr-aws-bcarter',
    account_name: 'bcarter-admin',
    email: 'ben.carter@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-04-10T12:00:00Z',
    source: 'aws_iam_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    identity_id: 'a0000000-0000-0000-0000-000000000003', // Nina Patel
    external_id: 'usr-aws-npatel',
    account_name: 'npatel-audit',
    email: 'nina.patel@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-17T09:30:00Z',
    source: 'aws_iam_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    identity_id: 'a0000000-0000-0000-0000-000000000007', // CI/CD Engine
    external_id: 'usr-aws-cicd-svc',
    account_name: 'pipeline-deployer',
    email: 'svc-cicd@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T14:15:00Z',
    source: 'aws_iam_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    identity_id: null, // Simulated ORPHAN ACCOUNT
    external_id: 'usr-aws-legacy-ops',
    account_name: 'legacy-ops-admin',
    email: 'ops-temp-2024@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-02-14T18:20:00Z',
    source: 'aws_iam_scim'
  },

  // GitHub Accounts (App b02)
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    identity_id: 'a0000000-0000-0000-0000-000000000001', // Alice Morgan
    external_id: 'gh-amorgan-ns',
    account_name: 'amorgan-ns',
    email: 'alice.morgan@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T08:00:00Z',
    source: 'github_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000006',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    identity_id: 'a0000000-0000-0000-0000-000000000002', // Ben Carter
    external_id: 'gh-bcarter-dev',
    account_name: 'bcarter-dev',
    email: 'ben.carter@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T11:00:00Z',
    source: 'github_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000007',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    identity_id: 'a0000000-0000-0000-0000-000000000004', // David Kim
    external_id: 'gh-dkim-core',
    account_name: 'dkim-core',
    email: 'david.kim@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T13:45:00Z',
    source: 'github_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000008',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    identity_id: 'a0000000-0000-0000-0000-000000000007', // CI/CD Engine
    external_id: 'gh-northstar-builder',
    account_name: 'northstar-builder',
    email: 'svc-cicd@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T14:15:00Z',
    source: 'github_scim'
  },

  // Google Workspace Accounts (App b03)
  {
    id: 'c0000000-0000-0000-0000-000000000009',
    application_id: 'b0000000-0000-0000-0000-000000000003',
    identity_id: 'a0000000-0000-0000-0000-000000000001', // Alice Morgan
    external_id: 'gsuite-amorgan',
    account_name: 'alice.morgan',
    email: 'alice.morgan@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T07:45:00Z',
    source: 'google_directory'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000010',
    application_id: 'b0000000-0000-0000-0000-000000000003',
    identity_id: 'a0000000-0000-0000-0000-000000000002', // Ben Carter
    external_id: 'gsuite-bcarter',
    account_name: 'ben.carter',
    email: 'ben.carter@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T09:00:00Z',
    source: 'google_directory'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000011',
    application_id: 'b0000000-0000-0000-0000-000000000003',
    identity_id: 'a0000000-0000-0000-0000-000000000006', // Marcus Vance (INACTIVE IDENTITY!)
    external_id: 'gsuite-mvance',
    account_name: 'marcus.vance',
    email: 'marcus.vance@northstarlabs.io',
    status: 'active', // Active account linked to inactive user!
    last_login_at: '2026-03-01T10:00:00Z',
    source: 'google_directory'
  },

  // Slack Accounts (App b04)
  {
    id: 'c0000000-0000-0000-0000-000000000012',
    application_id: 'b0000000-0000-0000-0000-000000000004',
    identity_id: 'a0000000-0000-0000-0000-000000000003', // Nina Patel
    external_id: 'slack-U0123NINA',
    account_name: 'nina-security',
    email: 'nina.patel@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T10:15:00Z',
    source: 'slack_scim'
  },
  {
    id: 'c0000000-0000-0000-0000-000000000013',
    application_id: 'b0000000-0000-0000-0000-000000000004',
    identity_id: 'a0000000-0000-0000-0000-000000000008', // SecOps Scanner Bot
    external_id: 'slack-B0999SECOPS',
    account_name: 'secops-bot',
    email: 'bot-scanner@northstarlabs.io',
    status: 'active',
    last_login_at: '2026-10-18T14:00:00Z',
    source: 'slack_scim'
  },

  // Jira Accounts (App b05)
  {
    id: 'c0000000-0000-0000-0000-000000000014',
    application_id: 'b0000000-0000-0000-0000-000000000005',
    identity_id: 'a0000000-0000-0000-0000-000000000005', // Elena Rostova (Suspended)
    external_id: 'jira-usr-erostova',
    account_name: 'elena.rostova',
    email: 'elena.rostova@contractor.northstarlabs.io',
    status: 'disabled',
    last_login_at: '2026-08-20T16:00:00Z',
    source: 'atlassian_directory'
  }
];

// 4. Entitlements (10 roles & permissions strictly partitioned by application)
export const SEED_ENTITLEMENTS = [
  // AWS Entitlements (App b01)
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'AdministratorAccess',
    external_id: 'arn:aws:iam::aws:policy/AdministratorAccess',
    description: 'Full unconstrained administrative access across all AWS services',
    type: 'role',
    is_privileged: true
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'SecurityAudit',
    external_id: 'arn:aws:iam::aws:policy/SecurityAudit',
    description: 'Read-only access for security configurations and audit trails',
    type: 'role',
    is_privileged: false
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    application_id: 'b0000000-0000-0000-0000-000000000001',
    name: 'EC2FullAccess',
    external_id: 'arn:aws:iam::aws:policy/AmazonEC2FullAccess',
    description: 'Manage virtual server compute instances and security groups',
    type: 'role',
    is_privileged: false
  },

  // GitHub Entitlements (App b02)
  {
    id: 'd0000000-0000-0000-0000-000000000004',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    name: 'OrganizationOwner',
    external_id: 'gh-role-admin',
    description: 'Complete organizational administration, billing, and repository deletion rights',
    type: 'role',
    is_privileged: true
  },
  {
    id: 'd0000000-0000-0000-0000-000000000005',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    name: 'CoreMaintainersTeam',
    external_id: 'gh-team-core-maintainers',
    description: 'Write, pull-request merge, and branch management rights across primary repos',
    type: 'group',
    is_privileged: false
  },
  {
    id: 'd0000000-0000-0000-0000-000000000006',
    application_id: 'b0000000-0000-0000-0000-000000000002',
    name: 'SecOpsReviewers',
    external_id: 'gh-team-secops-reviewers',
    description: 'Secret-scanning and codeql security advisory triage rights',
    type: 'group',
    is_privileged: false
  },

  // Google Workspace Entitlements (App b03)
  {
    id: 'd0000000-0000-0000-0000-000000000007',
    application_id: 'b0000000-0000-0000-0000-000000000003',
    name: 'SuperAdmin',
    external_id: 'gw-role-super-admin',
    description: 'Global administrator with complete control over domain users, groups, and policies',
    type: 'role',
    is_privileged: true
  },
  {
    id: 'd0000000-0000-0000-0000-000000000008',
    application_id: 'b0000000-0000-0000-0000-000000000003',
    name: 'EngineeringTeamGroup',
    external_id: 'gw-grp-eng-all',
    description: 'Member of all-engineering distribution and shared document repositories',
    type: 'group',
    is_privileged: false
  },

  // Slack Entitlements (App b04)
  {
    id: 'd0000000-0000-0000-0000-000000000009',
    application_id: 'b0000000-0000-0000-0000-000000000004',
    name: 'WorkspaceAdmin',
    external_id: 'slack-role-workspace-admin',
    description: 'Workspace admin rights to manage public/private channels and workspace integrations',
    type: 'role',
    is_privileged: true
  },

  // Jira Entitlements (App b05)
  {
    id: 'd0000000-0000-0000-0000-000000000010',
    application_id: 'b0000000-0000-0000-0000-000000000005',
    name: 'JiraAdministrators',
    external_id: 'jira-grp-administrators',
    description: 'Global project administration, workflow scheme editing, and user permission management',
    type: 'role',
    is_privileged: true
  }
];

// 5. Account Entitlements (18 assignments strictly respecting application boundaries!)
export const SEED_ACCOUNT_ENTITLEMENTS = [
  // AWS Accounts (App b01)
  { account_id: 'c0000000-0000-0000-0000-000000000001', entitlement_id: 'd0000000-0000-0000-0000-000000000001' }, // Ben -> AdministratorAccess
  { account_id: 'c0000000-0000-0000-0000-000000000001', entitlement_id: 'd0000000-0000-0000-0000-000000000003' }, // Ben -> EC2FullAccess
  { account_id: 'c0000000-0000-0000-0000-000000000002', entitlement_id: 'd0000000-0000-0000-0000-000000000002' }, // Nina -> SecurityAudit
  { account_id: 'c0000000-0000-0000-0000-000000000003', entitlement_id: 'd0000000-0000-0000-0000-000000000003' }, // CI/CD Engine -> EC2FullAccess
  { account_id: 'c0000000-0000-0000-0000-000000000004', entitlement_id: 'd0000000-0000-0000-0000-000000000001' }, // Legacy Ops (Orphan) -> AdministratorAccess!

  // GitHub Accounts (App b02)
  { account_id: 'c0000000-0000-0000-0000-000000000005', entitlement_id: 'd0000000-0000-0000-0000-000000000004' }, // Alice -> OrganizationOwner
  { account_id: 'c0000000-0000-0000-0000-000000000005', entitlement_id: 'd0000000-0000-0000-0000-000000000005' }, // Alice -> CoreMaintainersTeam
  { account_id: 'c0000000-0000-0000-0000-000000000006', entitlement_id: 'd0000000-0000-0000-0000-000000000005' }, // Ben -> CoreMaintainersTeam
  { account_id: 'c0000000-0000-0000-0000-000000000007', entitlement_id: 'd0000000-0000-0000-0000-000000000005' }, // David -> CoreMaintainersTeam
  { account_id: 'c0000000-0000-0000-0000-000000000008', entitlement_id: 'd0000000-0000-0000-0000-000000000005' }, // CI/CD Engine -> CoreMaintainersTeam

  // Google Workspace Accounts (App b03)
  { account_id: 'c0000000-0000-0000-0000-000000000009', entitlement_id: 'd0000000-0000-0000-0000-000000000007' }, // Alice -> SuperAdmin
  { account_id: 'c0000000-0000-0000-0000-000000000009', entitlement_id: 'd0000000-0000-0000-0000-000000000008' }, // Alice -> EngineeringTeamGroup
  { account_id: 'c0000000-0000-0000-0000-000000000010', entitlement_id: 'd0000000-0000-0000-0000-000000000008' }, // Ben -> EngineeringTeamGroup
  { account_id: 'c0000000-0000-0000-0000-000000000011', entitlement_id: 'd0000000-0000-0000-0000-000000000007' }, // Marcus (Inactive user!) -> SuperAdmin!
  { account_id: 'c0000000-0000-0000-0000-000000000011', entitlement_id: 'd0000000-0000-0000-0000-000000000008' }, // Marcus -> EngineeringTeamGroup

  // Slack Accounts (App b04)
  { account_id: 'c0000000-0000-0000-0000-000000000012', entitlement_id: 'd0000000-0000-0000-0000-000000000009' }, // Nina -> WorkspaceAdmin
  { account_id: 'c0000000-0000-0000-0000-000000000013', entitlement_id: 'd0000000-0000-0000-0000-000000000009' }, // SecOps Scanner Bot -> WorkspaceAdmin!

  // Jira Accounts (App b05)
  { account_id: 'c0000000-0000-0000-0000-000000000014', entitlement_id: 'd0000000-0000-0000-0000-000000000010' }  // Elena (Suspended contractor) -> JiraAdministrators!
];

// 6. Synthetic Risk Findings (6 explicitly labeled synthetic detection scenarios)
export const SEED_RISK_FINDINGS = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    identity_id: null,
    account_id: 'c0000000-0000-0000-0000-000000000004',
    rule_code: 'ORPHAN_ACCOUNT',
    severity: 'high',
    title: '[Synthetic] Active AWS account legacy-ops-admin has no linked identity',
    description: '[Synthetic Development Record] Account usr-aws-legacy-ops is active with AdministratorAccess in AWS Cloud Infrastructure but is not linked to any canonical employee identity.',
    status: 'open',
    evidence: {
      account_id: 'c0000000-0000-0000-0000-000000000004',
      external_id: 'usr-aws-legacy-ops',
      application_name: 'AWS Cloud Infrastructure',
      last_login_at: '2026-02-14T18:20:00Z',
      days_since_activity: 246,
      assigned_entitlements: ['AdministratorAccess']
    },
    remediation_guidance: 'Verify whether legacy-ops-admin is legitimate. Reconcile to a designated engineer identity or disable the account in AWS IAM console.'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    identity_id: 'a0000000-0000-0000-0000-000000000006',
    account_id: 'c0000000-0000-0000-0000-000000000011',
    rule_code: 'INACTIVE_USER_ACTIVE_ACCOUNT',
    severity: 'critical',
    title: '[Synthetic] Inactive former employee retains active SuperAdmin Google Workspace access',
    description: '[Synthetic Development Record] Marcus Vance was marked inactive following departure, yet his corporate Google Workspace account remains active with global SuperAdmin privileges.',
    status: 'open',
    evidence: {
      identity_id: 'a0000000-0000-0000-0000-000000000006',
      identity_name: 'Marcus Vance',
      identity_status: 'inactive',
      account_id: 'c0000000-0000-0000-0000-000000000011',
      account_status: 'active',
      assigned_entitlements: ['SuperAdmin']
    },
    remediation_guidance: 'Immediately revoke SuperAdmin role in Google Workspace and suspend account gsuite-mvance in Google Admin Console.'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    identity_id: 'a0000000-0000-0000-0000-000000000008',
    account_id: 'c0000000-0000-0000-0000-000000000013',
    rule_code: 'PRIVILEGED_SERVICE_ACCOUNT',
    severity: 'medium',
    title: '[Synthetic] Automated vulnerability bot holds interactive WorkspaceAdmin role in Slack',
    description: '[Synthetic Development Record] Automated SecOps scanner bot account has been granted WorkspaceAdmin rights, exceeding least-privilege requirements for audit reporting.',
    status: 'acknowledged',
    evidence: {
      identity_type: 'bot',
      account_name: 'secops-bot',
      application_name: 'Slack Enterprise',
      assigned_privileged_entitlements: ['WorkspaceAdmin']
    },
    remediation_guidance: 'Demote Slack bot account to standard webhook-only bot role and revoke interactive administrative rights.'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    identity_id: 'a0000000-0000-0000-0000-000000000005',
    account_id: 'c0000000-0000-0000-0000-000000000014',
    rule_code: 'SUSPENDED_IDENTITY_ELEVATED_ACCESS',
    severity: 'high',
    title: '[Synthetic] Suspended contractor retains assigned JiraAdministrators entitlement',
    description: '[Synthetic Development Record] Contractor Elena Rostova has suspended identity status, but JiraAdministrators group assignment remains registered in the entitlement catalog.',
    status: 'open',
    evidence: {
      identity_id: 'a0000000-0000-0000-0000-000000000005',
      identity_status: 'suspended',
      account_id: 'c0000000-0000-0000-0000-000000000014',
      assigned_entitlements: ['JiraAdministrators']
    },
    remediation_guidance: 'Unassign JiraAdministrators entitlement in Atlassian Access and confirm de-provisioning ticket.'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000005',
    identity_id: 'a0000000-0000-0000-0000-000000000002',
    account_id: 'c0000000-0000-0000-0000-000000000001',
    rule_code: 'STALE_CREDENTIAL_INACTIVITY',
    severity: 'low',
    title: '[Synthetic] AWS administrator account has not logged in for over 180 days',
    description: '[Synthetic Development Record] Ben Carter holds active AdministratorAccess in AWS with no interactive console login recorded since April 2026.',
    status: 'open',
    evidence: {
      identity_name: 'Ben Carter',
      account_name: 'bcarter-admin',
      last_login_at: '2026-04-10T12:00:00Z',
      days_inactive: 191
    },
    remediation_guidance: 'Rotate AWS IAM access keys and evaluate whether persistent admin access is still required or should use just-in-time access.'
  },
  {
    id: 'e0000000-0000-0000-0000-000000000006',
    identity_id: 'a0000000-0000-0000-0000-000000000001',
    account_id: null,
    rule_code: 'UNMANAGED_ROOT_IDENTITY',
    severity: 'informational',
    title: '[Synthetic] Root executive identity operates without designated owner reference',
    description: '[Synthetic Development Record] Dr. Alice Morgan operates as VP of Engineering without an explicit supervisor or owner_id link registered in canonical identity inventory.',
    status: 'resolved',
    evidence: {
      identity_id: 'a0000000-0000-0000-0000-000000000001',
      identity_name: 'Dr. Alice Morgan',
      title: 'VP of Engineering',
      owner_id: null
    },
    remediation_guidance: 'Document executive leadership reporting exemption or assign Chief Executive Officer as canonical owner.'
  }
];

/**
 * Seed Runner Function
 * Validates development database environment and performs idempotent insertion.
 */
export const runSeed = async () => {
  // 1. Safety verification: never seed in production
  if (env.NODE_ENV === 'production') {
    throw new Error('[Safety Guardrail] Cannot run seed data in production environment (NODE_ENV=production).');
  }

  // 2. Safety verification: ensure target database is recognized development database
  const allowedDbs = ['identitylens', 'identitylens_dev', 'identitylens_test'];
  const currentDb = env.DB_NAME;
  if (!allowedDbs.includes(currentDb) && !currentDb.includes('dev') && !currentDb.includes('test')) {
    throw new Error(`[Safety Guardrail] Database '${currentDb}' is not a recognized development/test database.`);
  }

  const client = await getClient();
  console.log(`[Seed Runner] Connected to target database: ${currentDb}`);
  console.log('[Seed Runner] Commencing transaction for Northstar Labs synthetic dataset...');

  try {
    await client.query('BEGIN');

    // 1. Seed Identities (Parent records first)
    for (const ident of SEED_IDENTITIES) {
      await client.query(
        `INSERT INTO identities (id, display_name, identity_type, email, status, owner_id, department, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           identity_type = EXCLUDED.identity_type,
           email = EXCLUDED.email,
           status = EXCLUDED.status,
           owner_id = EXCLUDED.owner_id,
           department = EXCLUDED.department,
           title = EXCLUDED.title,
           updated_at = NOW();`,
        [ident.id, ident.display_name, ident.identity_type, ident.email, ident.status, ident.owner_id, ident.department, ident.title]
      );
    }
    console.log(`[Seed Runner] Processed ${SEED_IDENTITIES.length} canonical identities.`);

    // 2. Seed Applications
    for (const app of SEED_APPLICATIONS) {
      await client.query(
        `INSERT INTO applications (id, name, key, description, status, auth_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           key = EXCLUDED.key,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           auth_type = EXCLUDED.auth_type,
           updated_at = NOW();`,
        [app.id, app.name, app.key, app.description, app.status, app.auth_type]
      );
    }
    console.log(`[Seed Runner] Processed ${SEED_APPLICATIONS.length} target applications.`);

    // 3. Seed Accounts
    for (const acc of SEED_ACCOUNTS) {
      await client.query(
        `INSERT INTO accounts (id, application_id, identity_id, external_id, account_name, email, status, last_login_at, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           application_id = EXCLUDED.application_id,
           identity_id = EXCLUDED.identity_id,
           external_id = EXCLUDED.external_id,
           account_name = EXCLUDED.account_name,
           email = EXCLUDED.email,
           status = EXCLUDED.status,
           last_login_at = EXCLUDED.last_login_at,
           source = EXCLUDED.source,
           updated_at = NOW();`,
        [acc.id, acc.application_id, acc.identity_id, acc.external_id, acc.account_name, acc.email, acc.status, acc.last_login_at, acc.source]
      );
    }
    console.log(`[Seed Runner] Processed ${SEED_ACCOUNTS.length} application accounts.`);

    // 4. Seed Entitlements
    for (const ent of SEED_ENTITLEMENTS) {
      await client.query(
        `INSERT INTO entitlements (id, application_id, name, external_id, description, type, is_privileged)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           application_id = EXCLUDED.application_id,
           name = EXCLUDED.name,
           external_id = EXCLUDED.external_id,
           description = EXCLUDED.description,
           type = EXCLUDED.type,
           is_privileged = EXCLUDED.is_privileged,
           updated_at = NOW();`,
        [ent.id, ent.application_id, ent.name, ent.external_id, ent.description, ent.type, ent.is_privileged]
      );
    }
    console.log(`[Seed Runner] Processed ${SEED_ENTITLEMENTS.length} application entitlements.`);

    // 5. Seed Account Entitlements
    for (const ae of SEED_ACCOUNT_ENTITLEMENTS) {
      await client.query(
        `INSERT INTO account_entitlements (account_id, entitlement_id, assigned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (account_id, entitlement_id) DO NOTHING;`,
        [ae.account_id, ae.entitlement_id]
      );
    }
    console.log(`[Seed Runner] Processed ${SEED_ACCOUNT_ENTITLEMENTS.length} account-entitlement assignments.`);

    // 6. Seed Risk Findings
    for (const rf of SEED_RISK_FINDINGS) {
      await client.query(
        `INSERT INTO risk_findings (id, identity_id, account_id, rule_code, severity, title, description, status, evidence, remediation_guidance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           identity_id = EXCLUDED.identity_id,
           account_id = EXCLUDED.account_id,
           rule_code = EXCLUDED.rule_code,
           severity = EXCLUDED.severity,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           evidence = EXCLUDED.evidence,
           remediation_guidance = EXCLUDED.remediation_guidance,
           updated_at = NOW();`,
        [rf.id, rf.identity_id, rf.account_id, rf.rule_code, rf.severity, rf.title, rf.description, rf.status, JSON.stringify(rf.evidence), rf.remediation_guidance]
      );
    }
    console.log(`[Seed Runner] Processed ${SEED_RISK_FINDINGS.length} synthetic risk findings.`);

    await client.query('COMMIT');
    console.log('[Seed Runner] Transaction committed successfully. Seed dataset is ready.');

    return {
      identities: SEED_IDENTITIES.length,
      applications: SEED_APPLICATIONS.length,
      accounts: SEED_ACCOUNTS.length,
      entitlements: SEED_ENTITLEMENTS.length,
      account_entitlements: SEED_ACCOUNT_ENTITLEMENTS.length,
      risk_findings: SEED_RISK_FINDINGS.length
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed Runner Fatal Error] Transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

// If executed directly from CLI: node src/database/seed.js
if (process.argv[1] === __filename) {
  runSeed()
    .then(async (summary) => {
      console.log('\n--- Seed Execution Summary ---');
      console.table(summary);
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed Script Error]', err.message);
      await pool.end();
      process.exit(1);
    });
}

import type {
  InventoryMetric,
  SeverityStat,
  AppAccountDistribution,
  RelationshipHealthGauge,
  RiskFinding
} from '../types/dashboard';
import type { AuthUser } from '../types/auth';

export const API_BASE = 'http://localhost:5001';

// In-memory access token storage (avoids local storage XSS vulnerabilities)
let currentAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  currentAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return currentAccessToken;
};

export interface DashboardApiResponse {
  isLiveBackend: boolean;
  metrics: InventoryMetric[];
  severityStats: SeverityStat[];
  appDistribution: AppAccountDistribution[];
  healthGauges: RelationshipHealthGauge[];
  findings: RiskFinding[];
  totalFindings: number;
}

/**
 * Centralized Authenticated API Request Wrapper
 * Automatically attaches Bearer tokens, includes cookies for session refresh,
 * and intercepts 401 errors for silent token recovery.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (currentAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAccessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Sends & receives HttpOnly refresh cookies
  };

  let response = await fetch(url, fetchOptions);

  // If unauthorized due to expired token and not already attempting refresh/auth endpoints
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    try {
      const refreshed = await refreshApi();
      if (refreshed?.accessToken) {
        setAccessToken(refreshed.accessToken);
        headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
        response = await fetch(url, { ...fetchOptions, headers });
      }
    } catch {
      // Refresh failed; propagate original 401
    }
  }

  return response;
}

/**
 * Auth API Endpoints
 */
export async function loginApi(
  email: string,
  password: string
): Promise<{ accessToken: string; user: AuthUser }> {
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Login failed. Please check your credentials.');
  }

  return json.data;
}

export async function refreshApi(): Promise<{ accessToken: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function meApi(): Promise<{ user: AuthUser; sessionId: string }> {
  const res = await apiFetch('/api/v1/auth/me', {
    method: 'GET'
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Failed to retrieve current user session.');
  }

  return json.data;
}

export async function logoutApi(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', {
      method: 'POST'
    });
  } finally {
    setAccessToken(null);
  }
}

// Baseline Stitch design demonstration data
const BASELINE_METRICS: InventoryMetric[] = [
  {
    title: 'Total Identities',
    value: '4,892',
    badge: '+38',
    trendIcon: 'trending_up',
    icon: 'how_to_reg',
    breakdown: '3,410 Emp · 1,240 Contr · 242 Svcs',
    isLive: false
  },
  {
    title: 'Applications',
    value: '186',
    badge: '4 review',
    icon: 'layers',
    breakdown: '142 Cloud SaaS · 34 Infra · 10 On-Prem',
    isLive: false
  },
  {
    title: 'Accounts',
    value: '18,420',
    badge: '+112 sync',
    icon: 'badge',
    breakdown: '3.7 avg / id · 410 Dormant / Orphan',
    isLive: false
  },
  {
    title: 'Entitlements',
    value: '94,310',
    badge: '-420 revoked',
    icon: 'verified_user',
    breakdown: '1,840 Priv Admin · 8,920 High Risk',
    isLive: false
  }
];

const SEVERITY_STATS: SeverityStat[] = [
  {
    severity: 'Critical',
    count: 5,
    description: 'Immediate Action Required',
    volumePercentage: '8.1% of total risk volume',
    badgeBg: '#0F172A'
  },
  {
    severity: 'High',
    count: 14,
    description: 'Escalated Privileges & Orphan Admins',
    volumePercentage: '22.6% of total risk volume',
    badgeBg: '#1E293B'
  },
  {
    severity: 'Medium',
    count: 26,
    description: 'Inactive MFA & Stale Access',
    volumePercentage: '41.9% of total risk volume',
    badgeBg: '#475569'
  },
  {
    severity: 'Low',
    count: 17,
    description: 'Missing Metadata & Tags',
    volumePercentage: '27.4% of total risk volume',
    badgeBg: '#94A3B8'
  }
];

const APP_DISTRIBUTION: AppAccountDistribution[] = [
  {
    name: 'AWS Production',
    icon: 'cloud',
    totalAccounts: 3420,
    standardPercent: 50,
    privilegedPercent: 42,
    dormantPercent: 8,
    summaryText: '3,420 accounts · 42% Priv, 8% Dorm'
  },
  {
    name: 'Google Workspace',
    icon: 'mark_email_unread',
    totalAccounts: 4892,
    standardPercent: 92,
    privilegedPercent: 5,
    dormantPercent: 3,
    summaryText: '4,892 accounts · 5% Priv, 3% Dorm'
  },
  {
    name: 'GitHub Enterprise',
    icon: 'terminal',
    totalAccounts: 1840,
    standardPercent: 65,
    privilegedPercent: 24,
    dormantPercent: 11,
    summaryText: '1,840 accounts · 24% Priv, 11% Dorm'
  },
  {
    name: 'Salesforce CRM',
    icon: 'cloud_done',
    totalAccounts: 2150,
    standardPercent: 82,
    privilegedPercent: 12,
    dormantPercent: 6,
    summaryText: '2,150 accounts · 12% Priv, 6% Dorm'
  },
  {
    name: 'Okta IAM (Primary SSO)',
    icon: 'lock',
    totalAccounts: 4892,
    standardPercent: 98,
    privilegedPercent: 0,
    dormantPercent: 2,
    summaryText: '4,892 accounts · 100% Core SSO, 2% Stale'
  },
  {
    name: 'Microsoft Azure / Entra ID',
    icon: 'security',
    totalAccounts: 3120,
    standardPercent: 60,
    privilegedPercent: 31,
    dormantPercent: 9,
    summaryText: '3,120 accounts · 31% Priv, 9% Dorm'
  }
];

const HEALTH_GAUGES: RelationshipHealthGauge[] = [
  {
    label: 'Excessive Permissions Index',
    value: '14.2%',
    percentage: 28.4,
    colorClass: 'gauge-amber',
    goal: 'Enterprise Goal: < 5.0%',
    changeText: '-2.1% from last audit cycle',
    changePositive: true
  },
  {
    label: 'Orphan Accounts',
    value: '2.4%',
    percentage: 14.0,
    colorClass: 'gauge-red',
    goal: '410 accounts without active HR owner',
    changeText: '+14 new this week',
    changePositive: false
  },
  {
    label: 'MFA Coverage across Admins',
    value: '99.4%',
    percentage: 99.4,
    colorClass: 'gauge-emerald',
    goal: 'Hardware Token or FIDO2 enforced',
    changeText: '12 missing hardware key',
    changePositive: false
  }
];

const FINDINGS: RiskFinding[] = [
  {
    id: 'f-01',
    title: 'Standing Domain Admin Entitlement Detected',
    description: 'Unrestricted privilege granted without expiration',
    detectedAgo: 'Detected 12m ago',
    severity: 'Critical',
    relatedEntity: {
      name: 'Marcus Chen',
      emailOrIdentifier: 'm.chen@enterprise.io',
      initials: 'MC'
    },
    application: {
      name: 'AWS Prod (us-east-1)',
      icon: 'cloud'
    },
    status: 'Open',
    primaryAction: 'Review'
  },
  {
    id: 'f-02',
    title: 'Orphaned Admin Account with Active API Keys',
    description: 'HR identity deactivated 45 days ago',
    detectedAgo: 'Detected 34m ago',
    severity: 'Critical',
    relatedEntity: {
      name: 'svc_deployment_pipeline',
      emailOrIdentifier: 'sa-9982 · No Owner',
      isServiceAccount: true,
      icon: 'smart_toy'
    },
    application: {
      name: 'GitHub Enterprise',
      icon: 'terminal'
    },
    status: 'In Review',
    primaryAction: 'Review'
  },
  {
    id: 'f-03',
    title: 'Excessive Privilege Creep Across Departments',
    description: 'Access retained after marketing -> sales transfer',
    detectedAgo: 'Detected 2h ago',
    severity: 'High',
    relatedEntity: {
      name: 'Sarah Jenkins',
      emailOrIdentifier: 's.jenkins@enterprise.io',
      initials: 'SJ'
    },
    application: {
      name: 'Salesforce CRM',
      icon: 'cloud_done'
    },
    status: 'Open',
    primaryAction: 'Review'
  },
  {
    id: 'f-04',
    title: 'Inactive Account Holding Privileged IAM Role',
    description: 'No login activity detected for 92 consecutive days',
    detectedAgo: 'Detected 3h ago',
    severity: 'High',
    relatedEntity: {
      name: 'DevOps Contractor',
      emailOrIdentifier: 'ext.devops@partner.io',
      initials: 'DC'
    },
    application: {
      name: 'Microsoft Entra ID',
      icon: 'security'
    },
    status: 'Remediating',
    primaryAction: 'Inspect'
  },
  {
    id: 'f-05',
    title: 'Multi-Factor Authentication Bypass Configuration',
    description: 'Legacy auth protocol allowed without conditional access',
    detectedAgo: 'Detected 5h ago',
    severity: 'Medium',
    relatedEntity: {
      name: 'legacy_imap_relay',
      emailOrIdentifier: 'sa-1044 · Daemon',
      isServiceAccount: true,
      icon: 'sync_alt'
    },
    application: {
      name: 'Google Workspace',
      icon: 'mark_email_unread'
    },
    status: 'Open',
    primaryAction: 'Enforce'
  },
  {
    id: 'f-06',
    title: 'Stale Shadow Access Token Unrotated > 180 Days',
    description: 'Secret token rotation policy violation',
    detectedAgo: 'Detected 8h ago',
    severity: 'Low',
    relatedEntity: {
      name: 'Integration Bot (Jira)',
      emailOrIdentifier: 'bot-jira-sync@enterprise.io',
      isServiceAccount: true,
      icon: 'vpn_key'
    },
    application: {
      name: 'Atlassian Jira',
      icon: 'developer_board'
    },
    status: 'In Review',
    primaryAction: 'Rotate'
  }
];

export async function fetchDashboardData(): Promise<DashboardApiResponse> {
  let isLive = false;
  const metrics = [...BASELINE_METRICS];

  try {
    const healthRes = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (healthRes.ok) {
      isLive = true;
    }
  } catch {
    isLive = false;
  }

  // Fetch real inventory counts from PostgreSQL via authenticated apiFetch
  if (isLive) {
    try {
      const [identitiesRes, appsRes, accountsRes, entitlementsRes] = await Promise.allSettled([
        apiFetch('/api/v1/identities?limit=1'),
        apiFetch('/api/v1/applications?limit=1'),
        apiFetch('/api/v1/accounts?limit=1'),
        apiFetch('/api/v1/entitlements?limit=1')
      ]);

      if (identitiesRes.status === 'fulfilled' && identitiesRes.value.ok) {
        const idData = await identitiesRes.value.json();
        if (idData.pagination?.total !== undefined) {
          metrics[0] = {
            ...metrics[0],
            value: idData.pagination.total.toLocaleString(),
            badge: 'Live DB',
            isLive: true
          };
        }
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
        const appData = await appsRes.value.json();
        if (appData.pagination?.total !== undefined) {
          metrics[1] = {
            ...metrics[1],
            value: appData.pagination.total.toLocaleString(),
            badge: 'Live DB',
            isLive: true
          };
        }
      }

      if (accountsRes.status === 'fulfilled' && accountsRes.value.ok) {
        const accData = await accountsRes.value.json();
        if (accData.pagination?.total !== undefined) {
          metrics[2] = {
            ...metrics[2],
            value: accData.pagination.total.toLocaleString(),
            badge: 'Live DB',
            isLive: true
          };
        }
      }

      if (entitlementsRes.status === 'fulfilled' && entitlementsRes.value.ok) {
        const entData = await entitlementsRes.value.json();
        if (entData.pagination?.total !== undefined) {
          metrics[3] = {
            ...metrics[3],
            value: entData.pagination.total.toLocaleString(),
            badge: 'Live DB',
            isLive: true
          };
        }
      }
    } catch {
      // Retain baseline metrics if session is invalid or pending
    }
  }

  return {
    isLiveBackend: isLive,
    metrics,
    severityStats: SEVERITY_STATS,
    appDistribution: APP_DISTRIBUTION,
    healthGauges: HEALTH_GAUGES,
    findings: FINDINGS,
    totalFindings: 62
  };
}

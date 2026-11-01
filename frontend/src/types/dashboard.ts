export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface InventoryMetric {
  title: string;
  value: string | number;
  badge: string;
  badgeType?: 'neutral' | 'info' | 'success' | 'warning';
  trendIcon?: string;
  icon: string;
  breakdown: string;
  isLive?: boolean;
}

export interface SeverityStat {
  severity: Severity;
  count: number;
  description: string;
  volumePercentage: string;
  badgeBg: string;
}

export interface AppAccountDistribution {
  name: string;
  icon: string;
  totalAccounts: number;
  standardPercent: number;
  privilegedPercent: number;
  dormantPercent: number;
  summaryText: string;
}

export interface RelationshipHealthGauge {
  label: string;
  value: string;
  percentage: number;
  colorClass: string;
  goal: string;
  changeText: string;
  changePositive?: boolean;
}

export interface RiskFinding {
  id: string;
  title: string;
  description: string;
  detectedAgo: string;
  severity: Severity;
  relatedEntity: {
    name: string;
    emailOrIdentifier: string;
    initials?: string;
    isServiceAccount?: boolean;
    icon?: string;
  };
  application: {
    name: string;
    icon: string;
  };
  status: 'Open' | 'In Review' | 'Remediating';
  primaryAction: string;
}


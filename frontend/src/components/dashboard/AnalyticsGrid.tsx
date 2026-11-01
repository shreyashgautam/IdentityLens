import React from 'react';
import type { AppAccountDistribution, RelationshipHealthGauge } from '../../types/dashboard';

interface AnalyticsGridProps {
  appDistribution: AppAccountDistribution[];
  healthGauges: RelationshipHealthGauge[];
  onQuickRemediate: () => void;
  onConfigureAppPolicies: () => void;
}

export const AnalyticsGrid: React.FC<AnalyticsGridProps> = ({
  appDistribution,
  healthGauges,
  onQuickRemediate,
  onConfigureAppPolicies
}) => {
  return (
    <section aria-label="Analytics & Insights" className="analytics-grid">
      {/* Column 1: Account Distribution Across Applications */}
      <div className="analytics-card app-distribution-card">
        <div>
          <div className="analytics-card-header">
            <div>
              <h3 className="analytics-card-title">
                Account Distribution Across Applications
              </h3>
              <p className="analytics-card-subtitle">
                Breakdown of standard, privileged, and dormant account states
              </p>
            </div>
            {/* Chart Legend */}
            <div className="chart-legend" aria-label="Account status legend">
              <span className="legend-item">
                <span className="legend-swatch legend-standard" />
                Standard
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-privileged" />
                Privileged
              </span>
              <span className="legend-item">
                <span className="legend-swatch legend-dormant" />
                Dormant
              </span>
            </div>
          </div>

          {/* Stacked Progress Bars */}
          <div className="app-bars-container">
            {appDistribution.map((app, index) => (
              <div key={index} className="app-bar-row">
                <div className="app-bar-meta">
                  <span className="app-bar-name">
                    <span className="material-symbols-outlined text-[16px] text-[#64748B]">
                      {app.icon}
                    </span>
                    {app.name}
                  </span>
                  <span className="app-bar-counts font-mono">{app.summaryText}</span>
                </div>
                <div
                  className="stacked-progress-track"
                  role="progressbar"
                  aria-label={`${app.name} account distribution`}
                >
                  <div
                    className="progress-slice slice-standard"
                    style={{ width: `${app.standardPercent}%` }}
                    title={`Standard: ${app.standardPercent}%`}
                  />
                  <div
                    className="progress-slice slice-privileged"
                    style={{ width: `${app.privilegedPercent}%` }}
                    title={`Privileged: ${app.privilegedPercent}%`}
                  />
                  <div
                    className="progress-slice slice-dormant"
                    style={{ width: `${app.dormantPercent}%` }}
                    title={`Dormant: ${app.dormantPercent}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card-footer">
          <span className="footer-meta-text">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Calculated across 18 connected connectors
          </span>
          <button
            type="button"
            className="footer-action-link"
            onClick={onConfigureAppPolicies}
          >
            Configure App Policies
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Column 2: Access Relationship Health */}
      <div className="analytics-card health-gauges-card">
        <div>
          <div className="analytics-card-header">
            <div>
              <h3 className="analytics-card-title">Access Relationship Health</h3>
              <p className="analytics-card-subtitle">
                Zero Trust posture index against baseline IAM policies
              </p>
            </div>
          </div>

          <div className="health-gauges-container">
            {healthGauges.map((gauge, idx) => (
              <div key={idx} className="gauge-box">
                <div className="gauge-header">
                  <span className="gauge-label">{gauge.label}</span>
                  <span className={`gauge-value ${gauge.colorClass}`}>{gauge.value}</span>
                </div>
                <div className="gauge-track">
                  <div
                    className={`gauge-fill ${gauge.colorClass}`}
                    style={{ width: `${Math.min(gauge.percentage, 100)}%` }}
                  />
                </div>
                <div className="gauge-footer">
                  <span className="gauge-goal">{gauge.goal}</span>
                  <span
                    className={`gauge-change ${
                      gauge.changePositive ? 'change-positive' : 'change-warning'
                    }`}
                  >
                    {gauge.changeText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Recommendation Callout */}
        <div className="quick-action-callout">
          <div className="callout-text-col">
            <p className="callout-title">Remediate 14 Overprivileged AWS Roles</p>
            <p className="callout-subtitle">
              Right-size unused CloudFormation & Admin policies
            </p>
          </div>
          <button
            type="button"
            className="btn-callout"
            onClick={onQuickRemediate}
          >
            Remediate
          </button>
        </div>
      </div>
    </section>
  );
};

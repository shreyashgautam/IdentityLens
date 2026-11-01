import React from 'react';
import type { Severity, SeverityStat } from '../../types/dashboard';

interface RiskSeverityStripProps {
  stats: SeverityStat[];
  totalCount: number;
  selectedSeverity: Severity | 'all';
  onSelectSeverity: (severity: Severity | 'all') => void;
}

export const RiskSeverityStrip: React.FC<RiskSeverityStripProps> = ({
  stats,
  totalCount,
  selectedSeverity,
  onSelectSeverity
}) => {
  return (
    <section aria-label="Risk Severity Summary" className="risk-strip-section">
      <div className="risk-strip-header">
        <div className="risk-strip-title-row">
          <span className="material-symbols-outlined text-[20px] text-[#0F172A]">gshield</span>
          <h2 className="risk-strip-title">Active Risk Findings</h2>
          <span className="risk-strip-total-badge">{totalCount} Total</span>
        </div>
        <span className="risk-strip-subtitle">
          Identified across active IAM connectors & audit feeds
        </span>
      </div>

      <div className="severity-cards-grid">
        {stats.map((stat) => {
          const isSelected = selectedSeverity === stat.severity;
          return (
            <div
              key={stat.severity}
              className={`severity-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSeverity(isSelected ? 'all' : stat.severity)}
              tabIndex={0}
              role="button"
              aria-label={`Filter by ${stat.severity} severity findings`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectSeverity(isSelected ? 'all' : stat.severity);
                }
              }}
            >
              <div className="severity-card-top">
                <span
                  className="severity-pill"
                  style={{ backgroundColor: stat.badgeBg, color: '#FFFFFF' }}
                >
                  {stat.severity.toUpperCase()}
                </span>
                <span className="severity-card-count">{stat.count}</span>
              </div>

              <div className="severity-card-middle">
                <div className="severity-desc-title">{stat.description}</div>
                <p className="severity-desc-percentage">{stat.volumePercentage}</p>
              </div>

              <div className="severity-card-footer">
                <span>View {stat.count} {stat.severity}</span>
                <span className="material-symbols-outlined text-[16px] transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

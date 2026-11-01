import React from 'react';
import type { InventoryMetric } from '../../types/dashboard';

interface SummaryCardsProps {
  metrics: InventoryMetric[];
  loading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ metrics, loading = false }) => {
  return (
    <section aria-label="Inventory Metrics Summary" className="summary-cards-grid">
      {metrics.map((metric, idx) => (
        <div key={idx} className="metric-card">
          <div className="metric-card-top">
            <div className="metric-info-col">
              <span className="metric-label">{metric.title}</span>
              <div className="metric-value-row">
                {loading ? (
                  <span className="metric-value skeleton">---</span>
                ) : (
                  <span className="metric-value">{metric.value}</span>
                )}
                <span
                  className={`metric-badge ${
                    metric.isLive ? 'metric-badge-live' : 'metric-badge-neutral'
                  }`}
                >
                  {metric.trendIcon && (
                    <span className="material-symbols-outlined text-[13px] mr-0.5">
                      {metric.trendIcon}
                    </span>
                  )}
                  {metric.badge}
                </span>
              </div>
            </div>
            <div className="metric-icon-box">
              <span className="material-symbols-outlined text-[20px]">{metric.icon}</span>
            </div>
          </div>
          <div className="metric-card-bottom truncate">
            <span className="breakdown-text">{metric.breakdown}</span>
          </div>
        </div>
      ))}
    </section>
  );
};

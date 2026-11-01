import React, { useState, useMemo } from 'react';
import type { RiskFinding, Severity } from '../../types/dashboard';

interface RecentFindingsTableProps {
  findings: RiskFinding[];
  selectedSeverity: Severity | 'all';
  onSelectSeverity: (severity: Severity | 'all') => void;
  onActionClick: (findingTitle: string, actionType: string) => void;
  onBulkRemediate: () => void;
  onExportCsv: () => void;
}

export const RecentFindingsTable: React.FC<RecentFindingsTableProps> = ({
  findings,
  selectedSeverity,
  onSelectSeverity,
  onActionClick,
  onBulkRemediate,
  onExportCsv
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter findings based on search and selected severity pill
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesSeverity =
        selectedSeverity === 'all' || f.severity === selectedSeverity;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.relatedEntity.name.toLowerCase().includes(q) ||
        f.relatedEntity.emailOrIdentifier.toLowerCase().includes(q) ||
        f.application.name.toLowerCase().includes(q);

      return matchesSeverity && matchesQuery;
    });
  }, [findings, selectedSeverity, searchQuery]);

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };
    findings.forEach((f) => {
      if (counts[f.severity] !== undefined) {
        counts[f.severity]++;
      }
    });
    return counts;
  }, [findings]);

  const getSeverityBadgeClass = (severity: Severity) => {
    switch (severity) {
      case 'Critical':
        return 'severity-badge-critical';
      case 'High':
        return 'severity-badge-high';
      case 'Medium':
        return 'severity-badge-medium';
      case 'Low':
        return 'severity-badge-low';
    }
  };

  return (
    <section aria-label="Recent Risk Findings Table" className="table-section-card" id="findingsTableSection">
      {/* Table Header & Action Controls */}
      <div className="table-controls-header">
        <div className="table-title-row">
          <div>
            <h2 className="table-title">Recent Risk Findings</h2>
            <p className="table-subtitle">
              Continuous posture evaluation and anomaly detection across active IAM connectors
            </p>
          </div>
          <div className="table-global-actions">
            <button
              type="button"
              className="btn-table-action"
              onClick={onBulkRemediate}
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>Bulk Remediate</span>
            </button>
            <button
              type="button"
              className="btn-table-action"
              onClick={onExportCsv}
            >
              <span className="material-symbols-outlined text-[16px] text-[#64748B]">table_view</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Search + Severity Filter Pills */}
        <div className="table-filter-bar">
          <div className="table-search-box">
            <span className="material-symbols-outlined table-search-icon">search</span>
            <input
              type="text"
              className="table-search-input"
              placeholder="Filter findings by title, identity or app..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter findings by title, identity or app"
            />
          </div>

          <div className="severity-pills-group" role="tablist" aria-label="Filter by severity">
            <button
              type="button"
              className={`pill-btn ${selectedSeverity === 'all' ? 'active' : ''}`}
              onClick={() => onSelectSeverity('all')}
            >
              All Severities
            </button>
            <button
              type="button"
              className={`pill-btn ${selectedSeverity === 'Critical' ? 'active' : ''}`}
              onClick={() => onSelectSeverity('Critical')}
            >
              Critical ({severityCounts.Critical})
            </button>
            <button
              type="button"
              className={`pill-btn ${selectedSeverity === 'High' ? 'active' : ''}`}
              onClick={() => onSelectSeverity('High')}
            >
              High ({severityCounts.High})
            </button>
            <button
              type="button"
              className={`pill-btn ${selectedSeverity === 'Medium' ? 'active' : ''}`}
              onClick={() => onSelectSeverity('Medium')}
            >
              Medium ({severityCounts.Medium})
            </button>
            <button
              type="button"
              className={`pill-btn ${selectedSeverity === 'Low' ? 'active' : ''}`}
              onClick={() => onSelectSeverity('Low')}
            >
              Low ({severityCounts.Low})
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="table-responsive-wrapper">
        <table className="enterprise-data-table" id="findingsTable">
          <thead>
            <tr>
              <th scope="col" className="col-finding">Finding</th>
              <th scope="col" className="col-severity">Severity</th>
              <th scope="col" className="col-entity">Related Entity</th>
              <th scope="col" className="col-app">Application</th>
              <th scope="col" className="col-status">Status</th>
              <th scope="col" className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFindings.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state-cell">
                  <div className="empty-state-box">
                    <span className="material-symbols-outlined text-[32px] text-[#94A3B8]">
                      search_off
                    </span>
                    <p className="empty-state-title">No matching risk findings</p>
                    <p className="empty-state-desc">
                      Try adjusting your search terms or severity filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFindings.map((finding) => (
                <tr key={finding.id} className="finding-row">
                  {/* Finding Column */}
                  <td className="cell-finding">
                    <div className="finding-title-col">
                      <span
                        className="finding-title truncate"
                        title={finding.title}
                      >
                        {finding.title}
                      </span>
                      <span className="finding-desc truncate">{finding.description}</span>
                      <span className="finding-timestamp font-mono">
                        {finding.detectedAgo}
                      </span>
                    </div>
                  </td>

                  {/* Severity Column */}
                  <td className="cell-severity">
                    <span className={`table-severity-pill ${getSeverityBadgeClass(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </td>

                  {/* Related Entity Column */}
                  <td className="cell-entity">
                    <div className="entity-cell-content">
                      {finding.relatedEntity.isServiceAccount ? (
                        <div className="entity-avatar service-account">
                          <span className="material-symbols-outlined text-[15px]">
                            {finding.relatedEntity.icon || 'smart_toy'}
                          </span>
                        </div>
                      ) : (
                        <div className="entity-avatar user-initials">
                          {finding.relatedEntity.initials}
                        </div>
                      )}
                      <div className="entity-meta min-w-0">
                        <span className="entity-name truncate">
                          {finding.relatedEntity.name}
                        </span>
                        <span className="entity-sub truncate">
                          {finding.relatedEntity.emailOrIdentifier}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Application Column */}
                  <td className="cell-app">
                    <div className="app-cell-content">
                      <span className="material-symbols-outlined text-[16px] text-[#64748B] shrink-0">
                        {finding.application.icon}
                      </span>
                      <span className="app-name truncate">{finding.application.name}</span>
                    </div>
                  </td>

                  {/* Status Column */}
                  <td className="cell-status">
                    <span className="status-indicator-pill">
                      <span
                        className={`status-circle ${
                          finding.status === 'Open' ? 'circle-open' : 'circle-review'
                        }`}
                      />
                      {finding.status}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="cell-actions">
                    <div className="actions-cluster">
                      <button
                        type="button"
                        className={`btn-row-action ${
                          finding.severity === 'Critical' ? 'btn-action-primary' : 'btn-action-secondary'
                        }`}
                        onClick={() => onActionClick(finding.title, finding.primaryAction)}
                      >
                        {finding.primaryAction}
                      </button>
                      <button
                        type="button"
                        className="btn-row-more"
                        onClick={() => onActionClick(finding.title, 'Options')}
                        aria-label="More options"
                      >
                        <span className="material-symbols-outlined text-[16px]">more_vert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination-footer">
        <span className="pagination-summary">
          Showing <strong>1-{Math.min(filteredFindings.length, 6)}</strong> of{' '}
          <strong>{filteredFindings.length}</strong> findings
        </span>
        <div className="pagination-controls" aria-label="Pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            Previous
          </button>
          <button
            type="button"
            className={`pagination-num-btn ${currentPage === 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>
          <button
            type="button"
            className={`pagination-num-btn ${currentPage === 2 ? 'active' : ''}`}
            onClick={() => setCurrentPage(2)}
          >
            2
          </button>
          <button
            type="button"
            className={`pagination-num-btn ${currentPage === 3 ? 'active' : ''}`}
            onClick={() => setCurrentPage(3)}
          >
            3
          </button>
          <span className="pagination-ellipsis">...</span>
          <button
            type="button"
            className="pagination-num-btn"
            onClick={() => setCurrentPage(11)}
          >
            11
          </button>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { RiskSeverityStrip } from '../components/dashboard/RiskSeverityStrip';
import { AnalyticsGrid } from '../components/dashboard/AnalyticsGrid';
import { RecentFindingsTable } from '../components/dashboard/RecentFindingsTable';
import { Toast } from '../components/dashboard/Toast';
import { fetchDashboardData, type DashboardApiResponse } from '../services/api';
import type { Severity } from '../types/dashboard';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    const timer = setTimeout(() => {
      setToastVisible(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch {
      // Handled gracefully in fetchDashboardData
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('Inventory synchronization complete across all 18 connectors.');
    }, 1800);
  };

  const handleExportReport = () => {
    showToast('Generating enterprise executive audit PDF report...');
  };

  const handleExportCsv = () => {
    showToast('Exported 62 findings to CSV successfully.');
  };

  const handleBulkRemediate = () => {
    showToast('Triggering batch remediation for matching filtered findings.');
  };

  const handleQuickRemediate = () => {
    showToast('Queued remediation workflow for 14 overprivileged AWS roles.');
  };

  const handleConfigureAppPolicies = () => {
    showToast('Navigating to Application Policy Configuration...');
  };

  const handleActionClick = (findingTitle: string, actionType: string) => {
    showToast(`Opened remediation drawer for: ${findingTitle} (${actionType})`);
  };

  const handleSelectSeverity = (severity: Severity | 'all') => {
    setSelectedSeverity(severity);
    const tableElem = document.getElementById('findingsTableSection');
    if (tableElem && severity !== 'all') {
      tableElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="dashboard-page-container">
      {/* 1. Page Header */}
      <header className="page-header-row">
        <div className="page-title-block">
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">
            Explore identities, access relationships, and potential security risks across cloud infrastructure and SaaS.
          </p>
        </div>

        {/* Action Controls in One Aligned Line */}
        <div className="page-actions-cluster">
          {/* Time Range Selector */}
          <div className="select-wrapper">
            <select
              className="time-range-select"
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                const optText = e.target.options[e.target.selectedIndex].text;
                showToast(`Updated metrics window to: ${optText}`);
              }}
              aria-label="Select metrics time range"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <span className="material-symbols-outlined select-chevron">expand_more</span>
          </div>

          {/* Export Report Button */}
          <button
            type="button"
            className="btn-export-report"
            onClick={handleExportReport}
          >
            <span className="material-symbols-outlined text-[18px] text-[#64748B]">download</span>
            <span>Export Report</span>
          </button>

          {/* Run Inventory Sync (Primary CTA) */}
          <button
            type="button"
            className="btn-run-sync"
            onClick={handleRunSync}
            disabled={isSyncing}
          >
            <span
              className={`material-symbols-outlined text-[18px] text-white ${
                isSyncing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Run Inventory Sync'}</span>
          </button>
        </div>
      </header>

      {/* 2. Inventory Metrics Summary (4 Dense Cards) */}
      <SummaryCards
        metrics={data?.metrics || []}
        loading={loading}
      />

      {/* 3. Risk Overview & Severity Strip */}
      <RiskSeverityStrip
        stats={data?.severityStats || []}
        totalCount={data?.totalFindings || 62}
        selectedSeverity={selectedSeverity}
        onSelectSeverity={handleSelectSeverity}
      />

      {/* 4. Analytics & Insights Grid */}
      <AnalyticsGrid
        appDistribution={data?.appDistribution || []}
        healthGauges={data?.healthGauges || []}
        onQuickRemediate={handleQuickRemediate}
        onConfigureAppPolicies={handleConfigureAppPolicies}
      />

      {/* 5. Recent Risk Findings (Data Table) */}
      <RecentFindingsTable
        findings={data?.findings || []}
        selectedSeverity={selectedSeverity}
        onSelectSeverity={handleSelectSeverity}
        onActionClick={handleActionClick}
        onBulkRemediate={handleBulkRemediate}
        onExportCsv={handleExportCsv}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  );
};

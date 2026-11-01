import React from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${
          mobileOpen ? 'mobile-open' : ''
        }`}
        aria-label="Main Navigation"
      >
        {/* Brand / Logo Header */}
        <div className="sidebar-brand-header">
          <div className="brand-badge-row">
            <div className="brand-logo-icon">
              <span className="material-symbols-outlined text-[22px]">fingerprint</span>
            </div>
            {!collapsed && (
              <div className="brand-text-column">
                <span className="brand-title">IdentityLens</span>
                <span className="brand-subtitle">Enterprise IAM</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-toggle-btn hidden lg:flex"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
          </button>
          <button
            type="button"
            className="sidebar-toggle-btn lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation List */}
        <div className="sidebar-nav-container">
          <div className="nav-section-label">
            {!collapsed ? <span>Governance</span> : <span>•••</span>}
          </div>
          <nav className="nav-menu" aria-label="Governance">
            <a
              href="#overview"
              className="nav-item active"
              aria-current="page"
              title="Overview"
            >
              <div className="nav-item-content">
                <span className="material-symbols-outlined nav-icon">dashboard</span>
                {!collapsed && <span className="nav-label">Overview</span>}
              </div>
            </a>
            <a
              href="#identities"
              className="nav-item"
              title="Identities"
              onClick={(e) => e.preventDefault()}
            >
              <div className="nav-item-content">
                <span className="material-symbols-outlined nav-icon">group</span>
                {!collapsed && <span className="nav-label">Identities</span>}
              </div>
            </a>
            <a
              href="#applications"
              className="nav-item"
              title="Applications"
              onClick={(e) => e.preventDefault()}
            >
              <div className="nav-item-content">
                <span className="material-symbols-outlined nav-icon">apps</span>
                {!collapsed && <span className="nav-label">Applications</span>}
              </div>
            </a>
            <a
              href="#accounts"
              className="nav-item"
              title="Accounts"
              onClick={(e) => e.preventDefault()}
            >
              <div className="nav-item-content">
                <span className="material-symbols-outlined nav-icon">badge</span>
                {!collapsed && <span className="nav-label">Accounts</span>}
              </div>
            </a>
            <a
              href="#entitlements"
              className="nav-item"
              title="Entitlements"
              onClick={(e) => e.preventDefault()}
            >
              <div className="nav-item-content">
                <span className="material-symbols-outlined nav-icon">vpn_key</span>
                {!collapsed && <span className="nav-label">Entitlements</span>}
              </div>
            </a>
            <a
              href="#risk-findings"
              className="nav-item"
              title="Risk Findings"
              onClick={(e) => e.preventDefault()}
            >
              <div className="nav-item-content">
                <span className="material-symbols-outlined nav-icon">gshield</span>
                {!collapsed && <span className="nav-label">Risk Findings</span>}
              </div>
              {!collapsed && (
                <span className="nav-badge">14</span>
              )}
            </a>
          </nav>
        </div>

        {/* Footer / Environment Widget */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="environment-box">
              <div className="env-header">
                <span className="env-title">Environment</span>
                <span className="env-dot"></span>
              </div>
              <div className="env-selector">
                <span className="env-name truncate">Production US-East</span>
                <span className="material-symbols-outlined text-[16px] text-[#64748B]">
                  unfold_more
                </span>
              </div>
              <div className="env-status">
                <span className="status-ping"></span>
                <span className="status-text">All Connectors Synced</span>
              </div>
            </div>
          )}

          <div className="sidebar-secondary-links">
            <a
              href="#settings"
              className="secondary-link"
              title="Settings"
              onClick={(e) => e.preventDefault()}
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              {!collapsed && <span>Settings</span>}
            </a>
            <a
              href="#docs"
              className="secondary-link"
              title="Documentation"
              onClick={(e) => e.preventDefault()}
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
              {!collapsed && (
                <>
                  <span>Documentation</span>
                  <span className="material-symbols-outlined text-[14px] ml-auto text-[#94A3B8]">
                    north_east
                  </span>
                </>
              )}
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};


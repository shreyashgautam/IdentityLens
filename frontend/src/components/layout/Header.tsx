import React from 'react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onSyncStatusClick: () => void;
  onScanNowClick: () => void;
  onNotificationClick: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  collapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onSyncStatusClick,
  onScanNowClick,
  onNotificationClick,
  theme,
  onToggleTheme,
  collapsed
}) => {
  return (
    <header className={`app-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {/* Breadcrumb */}
        <div className="header-breadcrumbs">
          <span className="breadcrumb-item">Home</span>
          <span className="material-symbols-outlined breadcrumb-separator">chevron_right</span>
          <span className="breadcrumb-current">Overview</span>
        </div>

        {/* Global Search Bar */}
        <div className="global-search-container hidden md:block">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="search"
            className="search-input"
            placeholder="Search identities, accounts, apps, entitlements (Press / or ⌘K)"
            aria-label="Search identities, accounts, apps, entitlements"
          />
          <kbd className="search-shortcut">⌘K</kbd>
        </div>
      </div>

      <div className="header-right">
        {/* Sync Status Button */}
        <button
          type="button"
          className="btn-primary-header hidden sm:inline-flex"
          onClick={onSyncStatusClick}
        >
          <span className="material-symbols-outlined text-[18px]">sync</span>
          <span>Sync Status</span>
        </button>

        {/* Scan Now Button */}
        <button
          type="button"
          className="btn-secondary-header hidden sm:inline-flex"
          onClick={onScanNowClick}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Scan Now</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="icon-btn"
          onClick={onNotificationClick}
          aria-label="Alert notifications"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="notification-dot" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
          title="Toggle color theme"
        >
          <span className="material-symbols-outlined text-[22px]">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>

        <div className="header-divider" />

        {/* User Profile */}
        <div className="user-profile-widget" tabIndex={0} role="button" aria-label="User Profile Menu">
          <div className="user-avatar">
            <span>EV</span>
          </div>
          <div className="user-meta hidden xl:flex">
            <span className="user-name">Elena Vance</span>
            <span className="user-role">Security Lead</span>
          </div>
          <span className="material-symbols-outlined text-[18px] text-[#94A3B8]">
            expand_more
          </span>
        </div>
      </div>
    </header>
  );
};


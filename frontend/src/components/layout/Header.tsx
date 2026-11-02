import React, { useState, useRef, useEffect } from 'react';
import type { AuthUser } from '../../types/auth';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onSyncStatusClick: () => void;
  onScanNowClick: () => void;
  onNotificationClick: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  collapsed: boolean;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onSyncStatusClick,
  onScanNowClick,
  onNotificationClick,
  theme,
  onToggleTheme,
  collapsed,
  user,
  onLogout
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'EV';

  const displayName = user?.email
    ? user.email.split('@')[0]
    : 'Elena Vance';

  const roleLabel = user?.role === 'admin' ? 'Security Admin' : 'Security Analyst';

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

        {/* User Profile Widget */}
        <div className="relative" ref={profileRef}>
          <div
            className="user-profile-widget"
            tabIndex={0}
            role="button"
            aria-label="User Profile Menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setProfileOpen((prev) => !prev);
              }
            }}
          >
            <div className="user-avatar">
              <span>{initials}</span>
            </div>
            <div className="user-meta hidden xl:flex">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{roleLabel}</span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-[#94A3B8]">
              {profileOpen ? 'expand_less' : 'expand_more'}
            </span>
          </div>

          {/* User Dropdown Menu */}
          {profileOpen && (
            <div className="user-profile-dropdown" role="menu">
              <div className="dropdown-user-info">
                <span className="dropdown-email">{user?.email || 'operator@identitylens.io'}</span>
                <span className="dropdown-role">{user?.role?.toUpperCase() || 'VIEWER'}</span>
              </div>
              <div className="dropdown-divider" />
              {onLogout && (
                <button
                  type="button"
                  className="dropdown-item dropdown-logout-btn"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import './Dashboard.css';

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('identitylens_theme') as 'light' | 'dark') || 'light';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('identitylens_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleOpenMobileSidebar = () => {
    setMobileSidebarOpen(true);
  };

  const handleCloseMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  // Initial session restoration state (prevents unauthenticated page flashing)
  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner-box">
          <div className="brand-logo-icon animate-pulse">
            <span className="material-symbols-outlined text-[24px]">fingerprint</span>
          </div>
          <span className="auth-loading-text">Verifying secure session...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, show the Login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // If authenticated, render the enterprise application shell
  return (
    <div className="identitylens-app-shell">
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={handleCloseMobileSidebar}
      />

      {/* Main Content Area */}
      <div className={`content-viewport ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Header */}
        <Header
          collapsed={sidebarCollapsed}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMobileSidebar={handleOpenMobileSidebar}
          onSyncStatusClick={() => {}}
          onScanNowClick={() => {}}
          onNotificationClick={() => {}}
          user={user}
          onLogout={logout}
        />

        {/* Dashboard Main View */}
        <main className="dashboard-main-view">
          <DashboardPage />
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

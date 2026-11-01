import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import './Dashboard.css';

export function App() {
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
        />

        {/* Dashboard Main View */}
        <main className="dashboard-main-view">
          <DashboardPage />
        </main>
      </div>
    </div>
  );
}

export default App;

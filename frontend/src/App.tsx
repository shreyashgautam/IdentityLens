import { useState, useEffect, useCallback } from 'react';
import './App.css';

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ivip_theme') as 'light' | 'dark') || 'light';
  });

  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ivip_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: HealthData = await response.json();
      setHealth(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to backend';
      setError(message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">I</div>
          <div>
            <h1 className="brand-title">IVIP Mini</h1>
            <p className="brand-subtitle">Identity Discovery & Risk Explorer</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="card">
          <h2 className="card-title">Backend Health & Connectivity</h2>
          <p className="card-description">
            Verifying communication with the Express backend service on port 5001.
          </p>

          {loading && (
            <div className="status-badge checking">
              <span className="status-indicator-dot"></span>
              Checking connection...
            </div>
          )}

          {!loading && health && (
            <div>
              <div className="status-badge online">
                <span className="status-indicator-dot"></span>
                Backend Online ({health.service} v{health.version})
              </div>
              <pre className="health-details">
                {JSON.stringify(health, null, 2)}
              </pre>
            </div>
          )}

          {!loading && error && (
            <div>
              <div className="status-badge offline">
                <span className="status-indicator-dot"></span>
                Connection Failed
              </div>
              <p className="card-description" style={{ marginTop: '0.75rem', color: 'var(--error)' }}>
                {error}. Make sure the backend server is running on http://localhost:5001.
              </p>
              <button className="retry-btn" onClick={checkHealth}>
                Retry Connection
              </button>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">System Architecture Status</h2>
          <p className="card-description">
            Foundational components established according to project roadmap.
          </p>
          <div className="grid-cards">
            <div className="info-tile">
              <div className="info-label">Architecture</div>
              <div className="info-value">Modular Monolith</div>
            </div>
            <div className="info-tile">
              <div className="info-label">Backend Service</div>
              <div className="info-value">Express (ES Modules)</div>
            </div>
            <div className="info-tile">
              <div className="info-label">Frontend Client</div>
              <div className="info-value">React 18 + TypeScript + Vite</div>
            </div>
            <div className="info-tile">
              <div className="info-label">Database Target</div>
              <div className="info-value">PostgreSQL (Milestone 3)</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        IVIP Mini &copy; {new Date().getFullYear()} — Identity Discovery & Risk Explorer
      </footer>
    </div>
  );
}

export default App;

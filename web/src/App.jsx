import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from './api';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TestPage from './pages/TestPage';
import ResultsPage from './pages/ResultsPage';
import TimelinePage from './pages/TimelinePage';
import PassportPage from './pages/PassportPage';
import SessionsPage from './pages/SessionsPage';
import AdminPage from './pages/AdminPage';
import ScenarioPage from './pages/ScenarioPage';
import { useTranslation } from 'react-i18next';

// Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wat_token');
    const stored = localStorage.getItem('wat_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('wat_token', token);
    localStorage.setItem('wat_user', JSON.stringify(userData));
    setUser(userData);
  };
  const logout = () => {
    localStorage.removeItem('wat_token');
    localStorage.removeItem('wat_user');
    setUser(null);
  };

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="min-h-screen bg-surface-950">
        {user && <NavBar />}
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/test/:module" element={user ? <TestPage /> : <Navigate to="/login" />} />
          <Route path="/results/:sessionId" element={user ? <ResultsPage /> : <Navigate to="/login" />} />
          <Route path="/sessions" element={user ? <SessionsPage /> : <Navigate to="/login" />} />
          <Route path="/timeline" element={user ? <TimelinePage /> : <Navigate to="/login" />} />
          <Route path="/passport" element={user ? <PassportPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user ? <AdminPage /> : <Navigate to="/login" />} />
          <Route path="/scenario" element={user ? <ScenarioPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  const links = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/sessions', label: 'Sessions', icon: '📋' },
    { to: '/timeline', label: 'Timeline', icon: '📈' },
    { to: '/passport', label: 'Passport', icon: '🎫' },
    { to: '/scenario', label: 'Roleplay', icon: '🎭' },
    { to: '/admin', label: 'Admin', icon: '⚙️' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10 border-t-0 border-x-0 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold text-white">W</div>
            <span className="font-display font-bold text-lg hidden sm:block">{t('app.name')}</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} className={`nav-link ${location.pathname === l.to ? 'active' : ''}`}>
                <span>{l.icon}</span><span>{l.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleLanguage} className="btn-ghost text-sm font-medium mr-2">
              {i18n.language === 'en' ? 'हिंदी' : 'EN'}
            </button>
            <span className="text-sm text-white/50 hidden sm:block">Hi, {user?.username}</span>
            <button onClick={logout} className="btn-ghost text-sm">Logout</button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden btn-ghost p-2">
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 p-3 space-y-1 animate-slide-up">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
              className={`nav-link w-full ${location.pathname === l.to ? 'active' : ''}`}>
              <span>{l.icon}</span><span>{l.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 animate-pulse flex items-center justify-center text-2xl font-bold text-white">W</div>
        <p className="text-white/50 animate-pulse">Loading WAT Analyzer Pro...</p>
      </div>
    </div>
  );
}

export default App;

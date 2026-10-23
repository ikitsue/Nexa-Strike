import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import { usersAPI } from '../api/supabaseApi';
import Footer from './Footer';
import './Layout.css';

const THEME_STORAGE_KEY = 'nexastrike-theme';

const Layout = () => {
  const { user, logout, setUser } = useAuthStore();
  const { language, setLanguage, t, languages } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
  });
  const isBanned = Boolean(user?.banned);
  const banReason = user?.ban_reason || '';
  const bannedAt = user?.banned_at || '';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!user?.email && !user?.id) return;

    let cancelled = false;

    const syncUser = async () => {
      try {
        const { data } = await usersAPI.getProfile();
        if (!cancelled && data) {
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to sync user info:', error);
      }
    };

    syncUser();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, setUser]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <img src="/nexastrike-icon.png" alt="NexaStrike" className="nav-logo-icon" />
            NexaStrike
          </Link>

          <button
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t('toggleNavigation')}
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      <div className={`sidebar-backdrop ${menuOpen ? 'show' : ''}`} onClick={closeMenu} />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <p className="sidebar-title">{t('navigation')}</p>
            <span className="sidebar-subtitle">{t('quickAccess')}</span>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('light') : t('dark')}
          >
            {theme === 'dark' ? `☀️ ${t('light')}` : `🌙 ${t('dark')}`}
          </button>
        </div>

        <div className="language-section">
          <label className="language-label" htmlFor="language-select">{t('language')}</label>
          <select id="language-select" className="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <ul className="sidebar-menu">
          <li>
            <Link to="/" className="sidebar-link" onClick={closeMenu}>{t('home')}</Link>
          </li>
          <li>
            <Link to="/maps" className="sidebar-link" onClick={closeMenu}>{t('maps')}</Link>
          </li>
          <li>
            <Link to="/suggestions" className="sidebar-link" onClick={closeMenu}>{t('suggestions')}</Link>
          </li>
          <li>
            <Link to="/download" className="sidebar-link" onClick={closeMenu}>{t('download')}</Link>
          </li>
          {user ? (
            <>
              {user.role === 'admin' && (
                <>
                  <li>
                    <Link to="/admin" className="sidebar-link" onClick={closeMenu}>⚙️ {t('admin')}</Link>
                  </li>
                  <li>
                    <Link to="/admin/tickets" className="sidebar-link" onClick={closeMenu}>🎫 {t('ticketManagement')}</Link>
                  </li>
                  <li>
                    <Link to="/utility-manager" className="sidebar-link" onClick={closeMenu}>🎯 {t('utilityManager')}</Link>
                  </li>
                </>
              )}
              <li>
                <Link to="/my-tickets" className="sidebar-link" onClick={closeMenu}>🎫 {t('myTickets')}</Link>
              </li>
              <li>
                <Link to="/profile" className="sidebar-link" onClick={closeMenu}>{user.username || t('profile')}</Link>
              </li>
              <li>
                <button onClick={handleLogout} className="sidebar-link btn-logout">{t('logout')}</button>
              </li>
            </>
          ) : (
            <li className="sidebar-auth-row">
              <Link to="/login" className="sidebar-link sidebar-auth-button" onClick={closeMenu}>{t('login')}</Link>
              <Link to="/register" className="sidebar-link sidebar-auth-button" onClick={closeMenu}>{t('register')}</Link>
            </li>
          )}
        </ul>
      </aside>

      {isBanned && (
        <div className="banned-banner" role="alert">
          <div className="banned-banner__title">🚫 {t('accountBlocked')}</div>
          <div className="banned-banner__text">
            {t('bannedMessage')} {banReason ? `${t('reason')}: ${banReason}` : ''}
          </div>
          {bannedAt && (
            <div className="banned-banner__meta">
              {t('bannedOn')} {new Date(bannedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;

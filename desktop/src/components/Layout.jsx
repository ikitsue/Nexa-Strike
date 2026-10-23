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
  const [isMaximized, setIsMaximized] = useState(false);
  const windowControls = window.electron?.windowControls;
  const updates = window.electron?.updates;
  const [updateStatus, setUpdateStatus] = useState({ status: 'idle' });
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
    if (!windowControls) return undefined;

    let cancelled = false;
    const unsubscribe = windowControls.onMaximizeChange(setIsMaximized);
    windowControls.isMaximized().then((maximized) => {
      if (!cancelled) setIsMaximized(maximized);
    }).catch((error) => {
      console.error('Failed to read desktop window state:', error);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [windowControls]);

  useEffect(() => {
    if (!updates) return undefined;

    let cancelled = false;
    const unsubscribe = updates.onStatus(setUpdateStatus);
    updates.getStatus().then((status) => {
      if (!cancelled) setUpdateStatus(status);
    }).catch((error) => {
      console.error('Failed to read desktop update status:', error);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [updates]);

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
        {windowControls && (
          <div className="window-control-bar">
            <div className="window-controls">
              <button
                className="window-control"
                onClick={windowControls.minimize}
                aria-label={t('minimizeWindow')}
                title={t('minimizeWindow')}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" /></svg>
              </button>
              <button
                className="window-control"
                onClick={windowControls.toggleMaximize}
                aria-label={isMaximized ? t('restoreWindow') : t('maximizeWindow')}
                title={isMaximized ? t('restoreWindow') : t('maximizeWindow')}
              >
                {isMaximized
                  ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M8 4H2v6h6z" /></svg>
                  : <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" /></svg>}
              </button>
              <button
                className="window-control window-control-close"
                onClick={windowControls.close}
                aria-label={t('closeWindow')}
                title={t('closeWindow')}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6m0-6L3 9" /></svg>
              </button>
            </div>
          </div>
        )}

        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <img src={`${import.meta.env.BASE_URL}nexastrike-icon.png`} alt="" className="nav-logo-icon" />
            NexaStrike
          </Link>

          <div className="nav-actions">
            {updates && updateStatus.status === 'available' && (
              <button className="update-button" onClick={updates.download}>
                {`⬇ ${t('downloadUpdate')}`}
              </button>
            )}
            {updates && updateStatus.status === 'downloading' && (
              <button className="update-button" disabled>
                {`${t('downloadingUpdate')} ${updateStatus.percent}%`}
              </button>
            )}
            {updates && updateStatus.status === 'downloaded' && (
              <button className="update-button" onClick={updates.install}>
                {`↻ ${t('restartToUpdate')}`}
              </button>
            )}
            {updates && updateStatus.status === 'error' && (
              <button className="update-button update-button-error" onClick={updates.check}>
                {t('retryUpdateCheck')}
              </button>
            )}
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

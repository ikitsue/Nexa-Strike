import React, { useState, useEffect, useCallback } from 'react';
import { suggestionsAPI, mapsAPI, usersAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import './Admin.css';

const Admin = () => {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [activeTab, setActiveTab] = useState('suggestions'); // 'suggestions' or 'users'
  const [banReason, setBanReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  

  const fetchMaps = useCallback(async () => {
    try {
      const response = await mapsAPI.getAll();
      setMaps(response.data);
    } catch (error) {
      console.error('Error fetching maps:', error);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await suggestionsAPI.getAll();
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(t('errorFetchingUsers'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    if (activeTab === 'suggestions') {
      fetchSuggestions();
      fetchMaps();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [user, navigate, activeTab, fetchSuggestions, fetchMaps, fetchUsers]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await suggestionsAPI.update(id, { status });
      // Update local state
      setSuggestions(
        suggestions.map((s) =>
          s.id === id ? { ...s, status } : s
        )
      );
    } catch (error) {
      console.error('Error updating suggestion:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update suggestion';
      alert(errorMsg);
    }
  };

  const handleBanUser = async (userId) => {
    if (!banReason.trim()) {
      alert(t('enterBanReason'));
      return;
    }

    try {
      await usersAPI.ban(userId, banReason);
      // Update local state
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, banned: true, ban_reason: banReason } : u
        )
      );
      setBanReason('');
      setSelectedUserId(null);
      alert(t('bannedSuccessfully'));
    } catch (error) {
      console.error('Error banning user:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to ban user';
      alert(errorMsg);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await usersAPI.unban(userId);
      // Update local state
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, banned: false, ban_reason: null } : u
        )
      );
      alert(t('unbannedSuccessfully'));
    } catch (error) {
      console.error('Error unbanning user:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to unban user';
      alert(errorMsg);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) => filter === 'all' || s.status === filter
  );

  if (loading) return <div className="loading">{t('loading')}</div>;

  return (
    <div className="admin-panel">
      <h1>{t('adminPanel')}</h1>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          📋 {t('suggestions')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 {t('users')} ({users.length})
        </button>
      </div>

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="suggestions-section">
          <h2>{t('suggestionManagement')}</h2>
          
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              {t('all')} ({suggestions.length})
            </button>
            <button
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              {t('pending')} ({suggestions.filter((s) => s.status === 'pending').length})
            </button>
            <button
              className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
              onClick={() => setFilter('approved')}
            >
              {t('approved')} ({suggestions.filter((s) => s.status === 'approved').length})
            </button>
            <button
              className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
              onClick={() => setFilter('rejected')}
            >
              {t('rejected')} ({suggestions.filter((s) => s.status === 'rejected').length})
            </button>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="empty-state">
              <p>{filter !== 'all' ? t(filter) : t('noSuggestionsFound')}</p>
            </div>
          ) : (
            <div className="suggestions-table">
              {filteredSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-row">
                  <div className="suggestion-details">
                    <h3>{suggestion.title}</h3>
                    <p>{suggestion.description}</p>
                    <div className="suggestion-badges">
                      {suggestion.utility_type && (
                        <span className="badge">🎯 {suggestion.utility_type}</span>
                      )}
                      {suggestion.map_id && maps.length > 0 && (
                        <span className="badge">🗺️ {maps.find(m => m.id === suggestion.map_id)?.name || t('unknownMap')}</span>
                      )}
                    </div>
                    <div className="suggestion-info">
                      <span className="info-item">
                        <strong>{t('by')}:</strong> {suggestion.users?.username || t('unknown')}
                      </span>
                      <span className="info-item">
                        <strong>{t('date')}:</strong> {new Date(suggestion.created_at).toLocaleDateString()}
                      </span>
                      <span className={`status ${suggestion.status}`}>
                        {t(suggestion.status)}
                      </span>
                    </div>
                  </div>

                  <div className="suggestion-actions">
                    {suggestion.status !== 'approved' && (
                      <button
                        className="btn-approve"
                        onClick={() => handleUpdateStatus(suggestion.id, 'approved')}
                      >
                        ✓ {t('approve')}
                      </button>
                    )}
                    {suggestion.status !== 'rejected' && (
                      <button
                        className="btn-reject"
                        onClick={() => handleUpdateStatus(suggestion.id, 'rejected')}
                      >
                        ✗ {t('reject')}
                      </button>
                    )}
                    {suggestion.status !== 'pending' && (
                      <button
                        className="btn-pending"
                        onClick={() => handleUpdateStatus(suggestion.id, 'pending')}
                      >
                        ⟲ {t('pending')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="users-section">
          <h2>{t('userManagement')}</h2>
          
          {users.length === 0 ? (
            <div className="empty-state">
              <p>{t('noUsersFound')}</p>
            </div>
          ) : (
            <div className="users-table">
              <div className="users-header">
                <div className="user-col-name">{t('username')}</div>
                <div className="user-col-email">{t('email')}</div>
                <div className="user-col-role">{t('role')}</div>
                <div className="user-col-created">{t('created')}</div>
                <div className="user-col-status">{t('status')}</div>
                <div className="user-col-actions">{t('actions')}</div>
              </div>
              
              {users.map((u) => (
                <div key={u.id} className={`user-row ${u.banned ? 'banned' : ''}`}>
                  <div className="user-col-name">
                    <strong>{u.username}</strong>
                  </div>
                  <div className="user-col-email">{u.email}</div>
                  <div className="user-col-role">
                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                  </div>
                  <div className="user-col-created">
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                  <div className="user-col-status">
                    {u.banned ? (
                      <span className="status-banned">🚫 {t('banned')}</span>
                    ) : (
                      <span className="status-active">✓ {t('active')}</span>
                    )}
                  </div>
                  <div className="user-col-actions">
                    {u.banned ? (
                      <button
                        className="btn-unban"
                        onClick={() => handleUnbanUser(u.id)}
                      >
                        ↻ {t('unban')}
                      </button>
                    ) : (
                      <button
                        className="btn-ban"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        🚫 {t('ban')}
                      </button>
                    )}
                  </div>

                  {/* Ban Reason Input */}
                  {selectedUserId === u.id && !u.banned && (
                    <div className="ban-input-section">
                      <input
                        type="text"
                        placeholder={t('enterBanReason')}
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        className="ban-reason-input"
                      />
                      <button
                        className="btn-confirm-ban"
                        onClick={() => handleBanUser(u.id)}
                      >
                        {t('confirmBan')}
                      </button>
                      <button
                        className="btn-cancel-ban"
                        onClick={() => setSelectedUserId(null)}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  )}

                  {/* Ban Reason Display */}
                  {u.banned && u.ban_reason && (
                    <div className="ban-reason-display">
                      <strong>{t('reason')}:</strong> {u.ban_reason}
                      <br />
                      <strong>{t('date')}:</strong> {new Date(u.banned_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;

import React, { useState, useEffect } from 'react';
import { usersAPI, suggestionsAPI, achievementsAPI } from '../api/supabaseApi';
import { useLanguage } from '../i18n';
import './Profile.css';

const Profile = () => {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [achievementsError, setAchievementsError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileResponse = await usersAPI.getProfile();
        setProfile(profileResponse.data);

        const [suggestionsResponse, achievementsResponse] = await Promise.all([
          suggestionsAPI.getAll(),
          achievementsAPI.getMine().catch((error) => {
            console.error('Error fetching achievements:', error);
            setAchievementsError(true);
            return { data: [] };
          }),
        ]);
        const userSuggestions = suggestionsResponse.data.filter(
          (s) => s.user_id === profileResponse.data.id
        );
        setSuggestions(userSuggestions);
        setAchievements(achievementsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteSuggestion = async (id) => {
    if (!window.confirm(t('confirmDelete'))) {
      return;
    }

    try {
      await suggestionsAPI.delete(id);
      setSuggestions(suggestions.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      alert(t('deleteFailed'));
    }
  };

  if (loading) return <div className="loading">{t('loadingProfile')}</div>;
  if (!profile) return <div className="loading">{t('profileNotFound')}</div>;

  return (
    <div className="profile">
      <h1>{t('profile')}</h1>

      <div className="profile-card">
        <div className="profile-header">
          <h2>{profile.username}</h2>
          <p>{profile.email}</p>
        </div>

        <div className="profile-info">
          <div className="info-group">
            <label>{t('username')}:</label>
            <span>{profile.username}</span>
          </div>

          <div className="info-group">
            <label>{t('email')}:</label>
            <span>{profile.email}</span>
          </div>

          {profile.steam_id && (
            <div className="info-group">
              <label>{t('steamId')}:</label>
              <span>{profile.steam_id}</span>
            </div>
          )}

          {profile.role && (
            <div className="info-group">
              <label>{t('role')}:</label>
              <span style={{ textTransform: 'capitalize', fontWeight: profile.role === 'admin' ? 'bold' : 'normal', color: profile.role === 'admin' ? '#ff6b6b' : 'inherit' }}>
                {profile.role}
              </span>
            </div>
          )}

          <div className="info-group">
            <label>{t('memberSince')}:</label>
            <span>{new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <details className="profile-achievements">
        <summary className="profile-achievements__summary">
          <span>{t('achievements')}</span>
          <span className="profile-achievements__count">{achievements.length}</span>
        </summary>
        <div className="profile-achievements__content">
          {achievementsError ? (
            <p className="profile-achievements__empty" role="alert">{t('achievementsLoadFailed')}</p>
          ) : achievements.length === 0 ? (
            <p className="profile-achievements__empty">{t('noAchievements')}</p>
          ) : (
            <ul className="profile-achievements__list">
              {achievements.map((achievement) => (
                <li className="profile-achievements__item" key={achievement.achievement_id}>
                  <span className="profile-achievements__icon" aria-hidden="true">★</span>
                  <span>
                    <strong>{t('achievementUnlockedPrefix')}</strong>
                    {' '}
                    {t(`achievement${achievement.achievement_id[0].toUpperCase()}${achievement.achievement_id.slice(1)}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <div className="profile-suggestions">
        <h2>{t('mySuggestions')} ({suggestions.length})</h2>
        {suggestions.length === 0 ? (
          <p className="no-suggestions">{t('noSuggestions')}</p>
        ) : (
          <div className="suggestions-list">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="suggestion-item">
                <div className="suggestion-content">
                  <h3>{suggestion.title}</h3>
                  <p>{suggestion.description}</p>
                  <div className="suggestion-meta">
                    <span className={`status ${suggestion.status}`}>{suggestion.status}</span>
                    <small>{new Date(suggestion.created_at).toLocaleDateString()}</small>
                  </div>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteSuggestion(suggestion.id)}
                >
                  {t('delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

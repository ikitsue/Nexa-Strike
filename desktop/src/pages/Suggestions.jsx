import React, { useState, useEffect } from 'react';
import { suggestionsAPI, mapsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import { Link } from 'react-router-dom';
import './Suggestions.css';

const Suggestions = () => {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [utilityType, setUtilityType] = useState('smoke');
  const [mapId, setMapId] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchSuggestions();
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      const response = await mapsAPI.getAll();
      setMaps(response.data);
      if (response.data.length > 0) {
        setMapId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching maps:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await suggestionsAPI.getAll();
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert(t('loginToSuggest'));
      return;
    }

    if (user?.banned) {
      alert(t('accountBlockedMessage'));
      return;
    }

    try {
      if (!title.trim() || !description.trim() || !mapId) {
        alert(t('fillAllFields'));
        return;
      }
      
      await suggestionsAPI.create({
        title,
        description,
        map_id: parseInt(mapId),
        utility_type: utilityType,
      });
      setTitle('');
      setDescription('');
      setUtilityType('smoke');
      setMapId(maps.length > 0 ? maps[0].id : '');
      fetchSuggestions();
    } catch (error) {
      console.error('Error creating suggestion:', error);
    }
  };

  if (loading) return <div className="loading">{t('loadingSuggestions')}</div>;

  return (
    <div className="suggestions">
      <h1>{t('suggestions')}</h1>

      {user ? (
        user.banned ? (
          <div className="ban-notice" role="alert">{t('accountBlockedMessage')}</div>
        ) : (
          <form className="suggestion-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">{t('title')}</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">{t('description')}</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="utilityType">{t('utilityType')}</label>
              <select
                id="utilityType"
                value={utilityType}
                onChange={(e) => setUtilityType(e.target.value)}
                required
              >
                <option value="smoke">{t('smoke')}</option>
                <option value="flash">{t('flash')}</option>
                <option value="molotov">{t('molotov')}</option>
                <option value="grenade">{t('grenade')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="mapId">{t('map')}</label>
              <select
                id="mapId"
                value={mapId}
                onChange={(e) => setMapId(e.target.value)}
                required
              >
                <option value="">{t('selectMap')}</option>
                {maps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="suggestion-privacy-note">
              {t('suggestionPrivacyNotice')}
              <Link to="/privacy">{t('privacyPolicy')}</Link>
            </p>

            <p className="form-note suggestion-warning">{t('suggestionLanguageWarning')}</p>

            <button type="submit" className="btn-submit">{t('submitSuggestion')}</button>
          </form>
        )
      ) : (
        <p className="login-prompt">{t('loginToSubmit')}</p>
      )}

      <div className="suggestions-list">
        <h2>{t('communitySuggestions')}</h2>
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="suggestion-card">
            <h3>{suggestion.title}</h3>
            <p>{suggestion.description}</p>
            <div className="suggestion-info">
              {suggestion.utility_type && (
                <span className="info-badge">🎯 {suggestion.utility_type}</span>
              )}
              {suggestion.map_id && maps.length > 0 && (
                <span className="info-badge">🗺️ {maps.find(m => m.id === suggestion.map_id)?.name || t('unknownMap')}</span>
              )}
            </div>
            <div className="suggestion-meta">
              <span className={`status ${suggestion.status}`}>{t(suggestion.status)}</span>
              <small>{t('by')} {suggestion.users?.username || t('unknown')}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;

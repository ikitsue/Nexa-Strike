import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { achievementsAPI } from '../api/supabaseApi';
import { useLanguage } from '../i18n';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import './EasterEgg.css';

const EasterEgg = () => {
  const { language, t } = useLanguage();
  const { user, authReady } = useAuthStore();
  const [suggesters, setSuggesters] = useState([]);
  const [loadingSuggesters, setLoadingSuggesters] = useState(true);
  const [suggestersError, setSuggestersError] = useState(false);
  const [realtimeError, setRealtimeError] = useState(false);
  const [explorerUnlocked, setExplorerUnlocked] = useState(false);
  const [mobileUnlocked, setMobileUnlocked] = useState(false);
  const [achievementLoading, setAchievementLoading] = useState(false);
  const [achievementError, setAchievementError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSuggesters = async () => {
      try {
        const contributors = new Map();
        const pageSize = 1000;
        let offset = 0;
        let page;

        do {
          const { data, error } = await supabase
            .from('utility_points')
            .select('id,suggested_by')
            .order('id', { ascending: true })
            .range(offset, offset + pageSize - 1);

          if (error) throw error;

          page = data || [];
          for (const row of page) {
            const name = row.suggested_by?.trim();
            if (name) {
              const key = name.toLocaleLowerCase();
              const contributor = contributors.get(key);
              if (contributor) {
                contributor.count += 1;
              } else {
                contributors.set(key, { name, count: 1 });
              }
            }
          }
          offset += pageSize;
        } while (page.length === pageSize);

        if (!cancelled) {
          setSuggesters([...contributors.values()].sort((a, b) => a.name.localeCompare(b.name, language)));
          setSuggestersError(false);
        }
      } catch (error) {
        console.error('Failed to load suggestion contributors:', error);
        if (!cancelled) setSuggestersError(true);
      } finally {
        if (!cancelled) setLoadingSuggesters(false);
      }
    };

    const channel = supabase
      .channel('easter-egg-suggestion-contributors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'utility_points' },
        loadSuggesters
      )
      .subscribe((status) => {
        if (!cancelled) {
          setRealtimeError(status !== 'SUBSCRIBED' && status !== 'CLOSED');
        }
      });

    loadSuggesters();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.authUserId) {
      setExplorerUnlocked(false);
      setMobileUnlocked(false);
      setAchievementLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setExplorerUnlocked(false);
    setMobileUnlocked(false);
    setAchievementError(false);
    setAchievementLoading(true);
    achievementsAPI.getMine()
      .then(({ data }) => {
        if (!cancelled) {
          setExplorerUnlocked(data.some(({ achievement_id }) => achievement_id === 'explorer'));
          setMobileUnlocked(data.some(({ achievement_id }) => achievement_id === 'mobile'));
          setAchievementError(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load achievement status:', error);
        if (!cancelled) setAchievementError(true);
      })
      .finally(() => {
        if (!cancelled) setAchievementLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.authUserId]);

  const handleUnlockExplorer = async () => {
    setAchievementLoading(true);
    setAchievementError(false);

    try {
      await achievementsAPI.unlock('explorer');
      setExplorerUnlocked(true);
    } catch (error) {
      console.error('Failed to unlock explorer achievement:', error);
      setAchievementError(true);
    } finally {
      setAchievementLoading(false);
    }
  };

  return (
    <section className="easter-egg">
      <div className="easter-egg__card">
        <div className="easter-egg__intro">
          <span className="easter-egg__eyebrow">
            {t('easterEggSecretFound')}
          </span>
          <div className="easter-egg__icon" aria-hidden="true">🎯</div>
          <h1>{t('easterEggGreeting')}</h1>
          <p>{t('easterEggDescription')}</p>
          {!authReady ? (
            <button className="easter-egg__badge" type="button" disabled>
              <span aria-hidden="true">★</span>
              {t('easterEggCheckingSignIn')}
            </button>
          ) : user?.authUserId ? (
            <button
              className="easter-egg__badge"
              type="button"
              onClick={handleUnlockExplorer}
              disabled={achievementLoading || explorerUnlocked}
              aria-pressed={explorerUnlocked}
            >
              <span aria-hidden="true">★</span>
              {t('easterEggUnlockExplorer')}
            </button>
          ) : (
            <Link className="easter-egg__badge" to="/login">
              <span aria-hidden="true">★</span>
              {t('easterEggSignInToUnlock')}
            </Link>
          )}
          {achievementError && (
            <p className="easter-egg__message easter-egg__message--error" role="alert">
              {t('easterEggUnlockError')}
            </p>
          )}
          {explorerUnlocked && (
            <p className="easter-egg__message" role="status">
              {t('easterEggSavedToProfile')}
            </p>
          )}
          {mobileUnlocked && (
            <p className="easter-egg__message" role="status">
              {t('achievementUnlockedPrefix')} {t('achievementMobile')}
            </p>
          )}
          <Link to="/" className="easter-egg__link">
            {t('easterEggReturnToBase')}
          </Link>
        </div>

        <section className="easter-egg__contributors" aria-labelledby="easter-egg-contributors-title">
          <h2 id="easter-egg-contributors-title">
            {t('easterEggContributors')}
          </h2>
          {loadingSuggesters ? (
            <p className="easter-egg__message" role="status">
              {t('easterEggLoadingContributors')}
            </p>
          ) : suggestersError ? (
            <p className="easter-egg__message easter-egg__message--error" role="alert">
              {t('easterEggContributorsError')}
            </p>
          ) : suggesters.length === 0 ? (
            <p className="easter-egg__message">
              {t('easterEggNoContributors')}
            </p>
          ) : (
            <ul className="easter-egg__list">
              {suggesters.map(({ name, count }) => (
                <li key={name}>
                  <span>{name}</span>
                  <span
                    className="easter-egg__contributor-count"
                    aria-label={t('easterEggContributionCount').replace('{count}', count.toLocaleString(language))}
                  >
                    × {count.toLocaleString(language)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {realtimeError && (
            <p className="easter-egg__message easter-egg__message--notice" role="status">
              {t('easterEggRealtimeUnavailable')}
            </p>
          )}
        </section>
      </div>
    </section>
  );
};

export default EasterEgg;

import React from 'react';
import { achievementsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './Download.css';

const Download = () => {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [achievementError, setAchievementError] = React.useState(false);
  const [release, setRelease] = React.useState({ status: 'loading' });
  const [reloadAttempt, setReloadAttempt] = React.useState(0);

  const loadLatestRelease = React.useCallback(async (signal) => {
    setRelease({ status: 'loading' });

    try {
      const response = await fetch('https://api.github.com/repos/ikitsue/Nexa-Strike/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to load the latest desktop release (${response.status}).`);
      }

      const latestRelease = await response.json();
      const version = /^v?(\d+\.\d+\.\d+)$/.exec(latestRelease.tag_name || '')?.[1];
      const installer = version
        ? latestRelease.assets?.find((asset) => asset.name === `NexaStrike-Setup-${version}.exe`)
        : null;

      if (!installer || !/^https:\/\/github\.com\/ikitsue\/Nexa-Strike\/releases\/download\//.test(installer.browser_download_url)) {
        setRelease({ status: 'unavailable' });
        return;
      }

      setRelease({
        status: 'available',
        version,
        downloadUrl: installer.browser_download_url,
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Could not load the latest NexaStrike desktop release:', error);
      setRelease({ status: 'error' });
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    loadLatestRelease(controller.signal);
    return () => controller.abort();
  }, [loadLatestRelease, reloadAttempt]);

  const handleDesktopClick = async () => {
    if (!user?.authUserId) return;

    setAchievementError(false);
    try {
      await achievementsAPI.unlock('desktop');
    } catch (error) {
      console.error('Could not unlock desktop download achievement:', error);
      setAchievementError(true);
    }
  };

  return (
    <div className="download-container">
      <div className="download-content">
        <h1>📥 {t('downloadTitle')}</h1>
        
        <div className="download-section">
          <h2>{t('getDesktopApp')}</h2>
          <p>{t('desktopDescription')}</p>

          <div className="download-buttons">
            {achievementError && (
              <p className="download-notice" role="alert">{t('desktopAchievementError')}</p>
            )}
            {release.status === 'loading' && (
              <p className="download-release-status" role="status">{t('checkingDesktopRelease')}</p>
            )}
            {release.status === 'available' && (
              <div className="download-release-card">
                <div>
                  <span className="download-platform">{t('windows')}</span>
                  <span className="download-version">{t('latestDesktopVersion').replace('{version}', release.version)}</span>
                </div>
                <a
                  href={release.downloadUrl}
                  className="btn-download"
                  onClick={handleDesktopClick}
                >
                  📦 {t('downloadForWindows')}
                </a>
              </div>
            )}
            {release.status === 'unavailable' && (
              <p className="download-notice" role="status">{t('desktopReleaseUnavailable')}</p>
            )}
            {release.status === 'error' && (
              <div className="download-release-error" role="alert">
                <p>{t('desktopReleaseLoadError')}</p>
                <button
                  type="button"
                  className="btn-download"
                  onClick={() => setReloadAttempt((attempt) => attempt + 1)}
                >
                  {t('retryDesktopRelease')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="download-section">
          <h2>{t('features')}</h2>
          <ul className="features-list">
            <li>✅ {t('directSystemIntegration')}</li>
            <li>✅ {t('improvedPerformance')}</li>
            <li>✅ {t('nativeNotifications')}</li>
            <li>✅ {t('autoUpdates')}</li>
          </ul>
        </div>

        <div className="download-section">
          <h2>{t('systemRequirements')}</h2>
          <div className="requirements">
            <div className="req-item">
              <h3>{t('windows')}</h3>
              <p>{t('windowsRequirement')}</p>
            </div>
            <div className="req-item">
              <h3>{t('macos')}</h3>
              <p>{t('macosRequirement')}</p>
            </div>
            <div className="req-item">
              <h3>{t('linux')}</h3>
              <p>{t('linuxRequirement')}</p>
            </div>
          </div>
        </div>

        <div className="download-section faq">
          <h2>{t('faq')}</h2>
          <div className="faq-item">
            <h3>{t('isFree')}</h3>
            <p>{t('freeAnswer')}</p>
          </div>
          <div className="faq-item">
            <h3>{t('installQuestion')}</h3>
            <p>{t('installAnswer')}</p>
          </div>
          <div className="faq-item">
            <h3>{t('accountQuestion')}</h3>
            <p>{t('accountAnswer')}</p>
          </div>
        </div>

        <div className="download-section">
          <p className="footer-text">
            {t('helpText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Download;

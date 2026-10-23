import React from 'react';
import { achievementsAPI } from '../api/supabaseApi';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../i18n';
import './Download.css';

const Download = () => {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const [achievementError, setAchievementError] = React.useState(false);
  const desktopUrl = 'https://github.com/ikitsue/NexaStrike/releases';

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

          <p className="download-notice" role="status">
            {t('desktopNotReady')}
          </p>
          
          <div className="download-buttons">
            {achievementError && (
              <p className="download-notice" role="alert">{t('desktopAchievementError')}</p>
            )}
            <a 
              href={`${desktopUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-download"
              onClick={handleDesktopClick}
            >
              📦 Windows
            </a>
            <a 
              href={`${desktopUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-download"
              onClick={handleDesktopClick}
            >
              🍎 macOS
            </a>
            <a 
              href={`${desktopUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-download"
              onClick={handleDesktopClick}
            >
              🐧 Linux
            </a>
          </div>
        </div>

        <div className="download-section">
          <h2>{t('features')}</h2>
          <ul className="features-list">
            <li>✅ {t('offlineFunctionality')}</li>
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

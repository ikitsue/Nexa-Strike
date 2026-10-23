import React from 'react';
import { useLanguage } from '../i18n';
import './Credits.css';

const Credits = () => {
  const { t } = useLanguage();
  return (
    <div className="credits-page">
      <div className="credits-container">
        <h1>{t('creditsTitle')}</h1>
        <p className="credits-intro">{t('creditsIntro')}</p>

        {/* Team Section */}
        <section className="credits-section">
          <h2>👥 {t('team')}</h2>
          <div className="credits-grid">
            <div className="credit-card">
              <h3>{t('leadDeveloper')}</h3>
              <p className="credit-name">ikitsue</p>
              <p className="credit-role">{t('fullStack')}</p>
              <a href="https://github.com/ikitsue" target="_blank" rel="noopener noreferrer">{t('github')}</a>
            </div>
          </div>
        </section>

        {/* Technologies Section */}
        <section className="credits-section">
          <h2>⚙️ {t('technologies')}</h2>
          <div className="tech-list">
            <div className="tech-category">
              <h3>{t('frontend')}</h3>
              <ul>
                <li><strong>React</strong> - {t('uiLibrary')}</li>
                <li><strong>React Router</strong> - {t('navigationLibrary')}</li>
                <li><strong>Electron</strong> - {t('desktopApplication')}</li>
                <li><strong>Supabase JS</strong> - {t('backendIntegration')}</li>
              </ul>
            </div>

            <div className="tech-category">
              <h3>{t('backend')}</h3>
              <ul>
                <li><strong>Node.js</strong> - {t('runtimeEnvironment')}</li>
                <li><strong>Express.js</strong> - {t('webFramework')}</li>
                <li><strong>PostgreSQL</strong> - {t('database')}</li>
                <li><strong>Supabase</strong> - {t('backendAsService')}</li>
              </ul>
            </div>

            <div className="tech-category">
              <h3>{t('additionalTools')}</h3>
              <ul>
                <li><strong>npm</strong> - {t('packageManager')}</li>
                <li><strong>Git</strong> - {t('versionControl')}</li>
                <li><strong>GitHub</strong> - {t('repositoryHosting')}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="credits-section">
          <h2>🔓 {t('openSource')}</h2>
          <p>{t('openSourceText')}</p>
          <p className="license-info">
            <strong>{t('license')}:</strong> ISC
          </p>
          <p className="source-code">
            <strong>{t('sourceCode')}:</strong> <a href="https://github.com/ikitsue/cs2-utility-web-site" target="_blank" rel="noopener noreferrer">{t('github')}</a>
          </p>
        </section>

        {/* Community Section */}
        <section className="credits-section">
          <h2>🎮 {t('communityText')}</h2>
          <p>{t('communityText')}</p>
        </section>

        {/* Special Thanks Section */}
        <section className="credits-section">
          <h2>✨ {t('specialThanks')}</h2>
          <ul className="thanks-list">
            <li>{t('communityThanks')}</li>
            <li>{t('contributorsThanks')}</li>
            <li>{t('supabaseThanks')}</li>
            <li>{t('reactCommunityThanks')}</li>
            <li>{t('opensourceThanks')}</li>
          </ul>
        </section>

        {/* Made With Section */}
        <section className="credits-section made-with">
          <h2>❤️ {t('madeWithLove')}</h2>
          <p>
            {t('supportText')}
          </p>
          <ul className="support-list">
            <li>⭐ {t('starGitHub')}</li>
            <li>🐛 {t('reportBugs')}</li>
            <li>📢 {t('shareApp')}</li>
            <li>💬 {t('joinCommunity')}</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Credits;

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import './Home.css';

const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="home">
      <aside className="home-announcement" role="note">
        <span className="home-announcement-icon" aria-hidden="true">ℹ️</span>
        <div>
          <h2>{t('homeAnnouncementTitle')}</h2>
          <p>{t('homeAnnouncementMessage')}</p>
        </div>
      </aside>

      {/* Hero Section */}
      <section
        className="hero-section"
        style={{ '--hero-image': `url("${import.meta.env.BASE_URL}images/ancient.jpg")` }}
      >
        <div className="hero-content">
          <h1 className="hero-title">{t('appTitle')}</h1>
          <p className="hero-subtitle">{t('footerBrandDescription')}</p>
          <p className="hero-description">
            {t('homePageDescription')}
          </p>
          <Link to="/maps" className="btn-primary">
            🗺️ {t('maps')}
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>{t('features')}</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>{t('homeProfessionalUtilities')}</h3>
            <p>{t('homeProfessionalUtilitiesDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>{t('homeAllMaps')}</h3>
            <p>{t('homeAllMapsDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔧</div>
            <h3>{t('homePracticeTool')}</h3>
            <p>{t('homePracticeToolDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>{t('homeDesktopVersion')}</h3>
            <p>{t('homeDesktopVersionDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>{t('homeCommunity')}</h3>
            <p>{t('homeCommunityDesc')}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>{t('homeUpdates')}</h3>
            <p>{t('homeUpdatesDesc')}</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>{t('homeReadyToDominate')}</h2>
        <p>{t('homeJoinThousands')}</p>
        <Link to="/maps" className="btn-large">
          {t('homeStartExplore')}
        </Link>
      </section>

      {/* Quick Links Section */}
      <section className="quick-links-section">
        <h2>{t('quickLinks')}</h2>
        <div className="quick-links-grid">
          <Link to="/maps" className="quick-link-card">
            <h3>🗺️ {t('maps')}</h3>
            <p>{t('homeMapStrategies')}</p>
          </Link>
          <Link to="/suggestions" className="quick-link-card">
            <h3>💡 {t('suggestions')}</h3>
            <p>{t('homeShareStrategies')}</p>
          </Link>
          <Link to="/contact" className="quick-link-card">
            <h3>📧 {t('contact')}</h3>
            <p>{t('homeContactBug')}</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

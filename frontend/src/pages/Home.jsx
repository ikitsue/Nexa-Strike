import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import './Home.css';

const Home = () => {
  const { t } = useLanguage();
  const [tutorialStep, setTutorialStep] = useState(0);
  const tutorialSteps = [1, 2, 3, 4, 5];
  const currentTutorialStep = tutorialSteps[tutorialStep];
  const tutorialVideo = `/videos/tutorial/${currentTutorialStep === 5 ? 'step%20-5' : `step-${currentTutorialStep}`}.mp4`;

  const goToNextTutorialStep = () => {
    setTutorialStep((currentStep) => (
      currentStep === tutorialSteps.length - 1 ? 0 : currentStep + 1
    ));
  };

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
      <section className="hero-section">
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

      <section className="home-tutorial" aria-labelledby="home-tutorial-title">
        <div className="home-tutorial-heading">
          <div>
            <h2 id="home-tutorial-title">{t('homeTutorialTitle')}</h2>
            <p>{t('homeTutorialIntro')}</p>
          </div>
        </div>
        <div className="home-tutorial-panel">
          <div className="home-tutorial-screenshot">
            <video
              key={tutorialVideo}
              className="home-tutorial-video"
              controls
              playsInline
              preload="metadata"
              aria-label={`${t('homeTutorialStepLabel')} ${tutorialStep + 1}: ${t(`homeTutorialStep${currentTutorialStep}Title`)}`}
            >
              <source src={tutorialVideo} type="video/mp4" />
            </video>
          </div>
          <div className="home-tutorial-guide" aria-live="polite">
            <div className="home-tutorial-bot">
              <span className="home-tutorial-bot-avatar" aria-hidden="true">🤖</span>
              <div className="home-tutorial-bot-message">
                <span className="home-tutorial-bot-name">{t('homeTutorialBotName')}</span>
                <span className="home-tutorial-step-count">
                  {t('homeTutorialStepLabel')} {tutorialStep + 1} / {tutorialSteps.length}
                </span>
                <h3>{t(`homeTutorialStep${currentTutorialStep}Title`)}</h3>
                <p>{t(`homeTutorialStep${currentTutorialStep}Desc`)}</p>
              </div>
            </div>
            <div className="home-tutorial-progress" aria-hidden="true">
              {tutorialSteps.map((step, index) => (
                <span
                  className={`home-tutorial-progress-segment${index <= tutorialStep ? ' is-active' : ''}`}
                  key={step}
                />
              ))}
            </div>
            <div className="home-tutorial-controls">
              <button
                type="button"
                className="home-tutorial-button home-tutorial-button--secondary"
                onClick={() => setTutorialStep((currentStep) => Math.max(0, currentStep - 1))}
                disabled={tutorialStep === 0}
              >
                ← {t('homeTutorialPrevious')}
              </button>
              {tutorialStep === tutorialSteps.length - 1 ? (
                <Link to="/maps" className="home-tutorial-button home-tutorial-button--primary">
                  🗺️ {t('maps')}
                </Link>
              ) : (
                <button
                  type="button"
                  className="home-tutorial-button home-tutorial-button--primary"
                  onClick={goToNextTutorialStep}
                >
                  {t('homeTutorialNext')} →
                </button>
              )}
            </div>
          </div>
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
          <Link to="/download" className="quick-link-card">
            <h3>⬇️ {t('download')}</h3>
            <p>{t('homeDesktopFree')}</p>
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

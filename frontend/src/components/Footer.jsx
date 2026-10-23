import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { useCookieConsent } from '../../../shared/consent/CookieConsent';
import './Footer.css';

const Footer = () => {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const appVersion = window.__APP_VERSION__ || 'dev';
  const { openSettings } = useCookieConsent();
  const legalLabels = {
    en: { notice: 'Legal notice', cookies: 'Cookies', settings: 'Cookie settings', contactOptions: 'Choose an email service' },
    fr: { notice: 'Mentions légales', cookies: 'Cookies', settings: 'Paramètres des cookies', contactOptions: 'Choisir un service e-mail' },
    ru: { notice: 'Юридическая информация', cookies: 'Файлы cookie', settings: 'Настройки файлов cookie', contactOptions: 'Выберите почтовый сервис' },
    es: { notice: 'Aviso legal', cookies: 'Cookies', settings: 'Configuración de cookies', contactOptions: 'Elegir un servicio de correo' },
    zh: { notice: '法律声明', cookies: 'Cookie 政策', settings: 'Cookie 设置', contactOptions: '选择电子邮件服务' },
  }[language] || { notice: 'Legal notice', cookies: 'Cookies', settings: 'Cookie settings', contactOptions: 'Choose an email service' };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Section 1: Brand & Description */}
        <div className="footer-section">
          <div className="footer-brand">
            <h3>🎮 NexaStrike</h3>
            <p>{t('footerBrandDescription')}</p>
          </div>
        </div>

        {/* Section 2: Quick Links */}
        <div className="footer-section">
          <h4>{t('quickLinks')}</h4>
          <ul>
            <li><Link to="/maps">{t('maps')}</Link></li>
            <li><Link to="/suggestions">{t('suggestions')}</Link></li>
            <li><Link to="/download">{t('download')}</Link></li>
            <li><a href="https://github.com/ikitsue" target="_blank" rel="noopener noreferrer">{t('github')}</a></li>
          </ul>
        </div>

        {/* Section 3: Legal */}
        <div className="footer-section">
          <h4>{t('legalInfo')}</h4>
          <ul>
            <li><Link to="/privacy">{t('privacyPolicy')}</Link></li>
            <li><Link to="/terms">{t('terms')}</Link></li>
            <li><Link to="/legal">{legalLabels.notice}</Link></li>
            <li><Link to="/cookies">{legalLabels.cookies}</Link></li>
            <li><Link to="/contact">{t('contact')}</Link></li>
            <li><Link to="/credits">{t('credits')}</Link></li>
            <li>
              <button type="button" className="footer-preferences" onClick={openSettings}>
                {legalLabels.settings}
              </button>
            </li>
          </ul>
        </div>

        {/* Section 4: About */}
        <div className="footer-section">
          <h4>{t('about')}</h4>
          <ul>
            <li>{t('version')}: <span className="version">{appVersion}</span></li>
            <li>{t('license')}: <span className="license">ISC</span></li>
            <li>{t('status')}: <span className="status">✓ {t('active')}</span></li>
            <li>{t('builtWith')}</li>
          </ul>
        </div>
      </div>

      {/* Divider */}
      <div className="footer-divider"></div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <div className="footer-copyright">
            <p>&copy; {currentYear} <strong>NexaStrike</strong>. {t('allRightsReserved')}</p>
            <p className="footer-credits">{t('footerCredits')} <span className="heart">❤️</span> {t('footerCommunity')} | {t('footerPoweredBy')}</p>
          </div>
          
          <div className="footer-social">
            <a href="https://github.com/ikitsue" target="_blank" rel="noopener noreferrer" aria-label={t('github')}>
              <i className="fab fa-github" aria-hidden="true"></i> {t('github')}
            </a>
            <details className="footer-contact-menu">
              <summary aria-label={legalLabels.contactOptions}>
                <i className="fas fa-envelope" aria-hidden="true"></i> {t('contact')}
              </summary>
              <div className="footer-contact-options">
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=ikitsue.contact%40gmail.com" target="_blank" rel="noopener noreferrer">Gmail</a>
                <a href="https://outlook.office.com/mail/deeplink/compose?to=ikitsue.contact%40gmail.com" target="_blank" rel="noopener noreferrer">Outlook</a>
              </div>
            </details>
            <button
              type="button"
              className="scroll-to-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label={t('backToTop')}
              title={t('backToTop')}
            >
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

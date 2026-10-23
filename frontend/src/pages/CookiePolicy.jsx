import React from 'react';
import { useLanguage } from '../i18n';
import { useCookieConsent } from '../../../shared/consent/CookieConsent';
import { getLegalUi } from '../../../shared/legalUi';
import './Privacy.css';

const CookiePolicy = () => {
  const { language } = useLanguage();
  const { preferences, openSettings } = useCookieConsent();
  const ui = getLegalUi(language);
  const date = new Intl.DateTimeFormat({ en: 'en-US', fr: 'fr-FR', ru: 'ru-RU', es: 'es-ES', zh: 'zh-CN' }[language] || 'en-US', { dateStyle: 'long' })
    .format(new Date('2026-10-12'));

  return (
    <article className="policy-page">
      <div className="policy-container">
        <h1>{ui.cookieTitle}</h1>
        <p className="last-updated">{ui.updated}: {date}</p>
        <p>{ui.cookieIntro}</p>
        <section>
          <h2>{ui.necessary}</h2>
          <ul>
            <li><strong>{ui.authSession}:</strong> {ui.authDescription}</li>
            <li><strong>{ui.language}:</strong> {ui.languageDescription}</li>
            <li><strong>{ui.localTickets}:</strong> {ui.ticketsDescription}</li>
            <li><strong>{ui.privacyChoices}:</strong> {ui.choicesDescription}</li>
          </ul>
        </section>
        <section>
          <h2>{ui.optionalTrackers}</h2>
          <ul>
            <li><strong>{ui.performance}:</strong> {ui.performanceState(preferences.performance)}</li>
            <li><strong>{ui.externalMedia}:</strong> {ui.mediaState(preferences.externalMedia)}</li>
          </ul>
        </section>
        <section>
          <h2>{ui.hcaptchaTitle}</h2>
          <p>{ui.hcaptcha}</p>
        </section>
        <section>
          <h2>{ui.changeTitle}</h2>
          <p>{ui.changeDescription}</p>
          <button type="button" className="policy-action" onClick={openSettings}>
            {ui.settingsButton}
          </button>
        </section>
      </div>
    </article>
  );
};

export default CookiePolicy;

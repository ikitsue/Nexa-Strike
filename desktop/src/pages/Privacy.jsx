import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { legalCopy } from '../../../shared/legalCopy';
import { getLegalUi } from '../../../shared/legalUi';
import './Privacy.css';

const Privacy = () => {
  const { language } = useLanguage();
  const copy = legalCopy[language] || legalCopy.en;
  const ui = getLegalUi(language);
  const date = new Intl.DateTimeFormat({ en: 'en-US', fr: 'fr-FR', ru: 'ru-RU', es: 'es-ES', zh: 'zh-CN' }[language] || 'en-US', { dateStyle: 'long' })
    .format(new Date('2026-10-16'));

  return (
    <article className="policy-page">
      <div className="policy-container">
        <h1>{copy.privacyTitle}</h1>
        <p className="last-updated">
          {ui.updated}: {date}
        </p>
        <p className="policy-notice">
          {ui.privacyNotice}
        </p>
        {copy.privacy.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <section>
          <h2>{ui.privacyManageTitle}</h2>
          <p>
            {ui.privacyManage}
            {' '}
            <Link to="/cookies">{ui.privacyCookiesLink}</Link>
          </p>
          <p>
            {ui.privacyContact}
            {' '}
            <Link to="/legal">{ui.legalLink}</Link>.
          </p>
        </section>
      </div>
    </article>
  );
};

export default Privacy;

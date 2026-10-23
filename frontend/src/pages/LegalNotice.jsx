import React from 'react';
import { useLanguage } from '../i18n';
import { legalNoticeCopy } from '../../../shared/legalCopy';
import { getLegalUi } from '../../../shared/legalUi';
import './Privacy.css';

const LegalNotice = () => {
  const { language } = useLanguage();
  const copy = legalNoticeCopy[language] || legalNoticeCopy.en;
  const ui = getLegalUi(language);
  const date = new Intl.DateTimeFormat({ en: 'en-US', fr: 'fr-FR', ru: 'ru-RU', es: 'es-ES', zh: 'zh-CN' }[language] || 'en-US', { dateStyle: 'long' })
    .format(new Date('2026-10-12'));

  return (
    <article className="policy-page">
      <div className="policy-container">
        <h1>{copy.title}</h1>
        <p className="last-updated">
          {ui.updated}: {date}
        </p>
        <p className="policy-notice">
          {ui.legalNoticeNotice}
        </p>
        {copy.sections.map(([heading, text]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
    </article>
  );
};

export default LegalNotice;

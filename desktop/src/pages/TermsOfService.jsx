import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { termsCopy } from '../../../shared/legalCopy';
import { getLegalUi } from '../../../shared/legalUi';
import './TermsOfService.css';

const TermsOfService = () => {
  const { language } = useLanguage();
  const copy = termsCopy[language] || termsCopy.en;
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
          {ui.termsNotice}
        </p>
        {copy.sections.map(([heading, text], index) => (
          <section key={heading}>
            <h2>{index + 1}. {heading}</h2>
            <p>{text}</p>
          </section>
        ))}
        <section>
          <h2>{ui.questions}</h2>
          <p>
            {ui.see}
            {' '}
            <Link to="/legal">{ui.legalLink}</Link>
            {' '}{ui.forContact}
          </p>
        </section>
      </div>
    </article>
  );
};

export default TermsOfService;

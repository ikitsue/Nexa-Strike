import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import './NotFound.css';

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h1>{t('pageNotFoundTitle')}</h1>
        <p>{t('pageNotFoundMessage')}</p>
        <Link to="/" className="btn-primary notfound-button">
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

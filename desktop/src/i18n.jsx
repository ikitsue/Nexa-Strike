import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../../shared/i18nTranslations';
import { availableLanguages, formatTranslation, getInitialLanguage, normalizeLanguage } from '../../shared/i18nRuntime';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const setLanguage = useCallback((nextLanguage) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);
    if (!normalizedLanguage) {
      console.error(`Unsupported language preference: ${nextLanguage}`);
      return;
    }

    setLanguageState(normalizedLanguage);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('nexastrike-language', language);
      } catch (error) {
        console.error('Could not save the language preference:', error);
      }

      document.documentElement.lang = language;
      document.documentElement.setAttribute('data-language', language);
    }
  }, [language]);

  const t = useCallback((key, values) => (
    formatTranslation(translations, language, key, values)
  ), [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    languages: availableLanguages
  }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

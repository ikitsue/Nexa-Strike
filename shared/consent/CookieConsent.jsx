import React, { createContext, useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const STORAGE_KEY = 'nexastrike_cookie_consent';
const CONSENT_VERSION = 1;
const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const defaultPreferences = { performance: false, externalMedia: false };
const CookieConsentContext = createContext(null);
const consentCopy = {
  en: {
    title: 'Your privacy choices',
    essential: 'Essential features remain active.',
    performanceOnly: 'Vercel performance measurement loads only with your permission.',
    performanceAndMedia: 'Vercel performance measurement and embedded YouTube videos load only with your permission.',
    choose: 'You can refuse optional items or choose them separately.',
    details: 'Read the cookie policy.',
    purpose: 'Choose by purpose',
    performance: 'Performance measurement (Vercel)',
    performanceDescription: 'Technical measurements of website performance.',
    media: 'Embedded videos (YouTube)',
    mediaDescription: 'Allows embedded YouTube players to load.',
    saveError: 'Your choice could not be saved. Optional features remain disabled.',
    refuse: 'Refuse optional',
    customize: 'Customize',
    accept: 'Accept all',
    save: 'Save my choices',
  },
  fr: {
    title: 'Vos choix de confidentialité',
    essential: 'Les fonctions indispensables restent actives.',
    performanceOnly: 'Les mesures de performance Vercel ne sont chargées qu’avec votre accord.',
    performanceAndMedia: 'Les mesures de performance Vercel et les vidéos YouTube intégrées ne sont chargées qu’avec votre accord.',
    choose: 'Vous pouvez refuser les options ou les régler séparément.',
    details: 'Détails dans la politique de cookies.',
    purpose: 'Choix par finalité',
    performance: 'Mesure de performance (Vercel)',
    performanceDescription: 'Mesures techniques de performance du site.',
    media: 'Vidéos intégrées (YouTube)',
    mediaDescription: 'Autorise le chargement de lecteurs YouTube intégrés.',
    saveError: 'Votre choix n’a pas pu être enregistré. Les fonctions facultatives restent désactivées.',
    refuse: 'Tout refuser',
    customize: 'Personnaliser',
    accept: 'Tout accepter',
    save: 'Enregistrer mes choix',
  },
  ru: {
    title: 'Настройки конфиденциальности',
    essential: 'Необходимые функции остаются включёнными.',
    performanceOnly: 'Измерение производительности Vercel включается только с вашего разрешения.',
    performanceAndMedia: 'Измерение производительности Vercel и встроенные видео YouTube включаются только с вашего разрешения.',
    choose: 'Вы можете отказаться от необязательных функций или выбрать их отдельно.',
    details: 'Подробнее в политике использования файлов cookie.',
    purpose: 'Выберите цели',
    performance: 'Измерение производительности (Vercel)',
    performanceDescription: 'Технические измерения производительности сайта.',
    media: 'Встроенные видео (YouTube)',
    mediaDescription: 'Разрешает загрузку встроенных проигрывателей YouTube.',
    saveError: 'Не удалось сохранить ваш выбор. Необязательные функции остаются отключёнными.',
    refuse: 'Отклонить необязательные',
    customize: 'Настроить',
    accept: 'Принять все',
    save: 'Сохранить выбор',
  },
  es: {
    title: 'Tus opciones de privacidad',
    essential: 'Las funciones necesarias permanecen activas.',
    performanceOnly: 'La medición del rendimiento de Vercel solo se carga con tu permiso.',
    performanceAndMedia: 'La medición del rendimiento de Vercel y los vídeos de YouTube integrados solo se cargan con tu permiso.',
    choose: 'Puedes rechazar las opciones o elegirlas por separado.',
    details: 'Consulta la política de cookies.',
    purpose: 'Elige por finalidad',
    performance: 'Medición del rendimiento (Vercel)',
    performanceDescription: 'Mediciones técnicas del rendimiento del sitio.',
    media: 'Vídeos integrados (YouTube)',
    mediaDescription: 'Permite cargar reproductores integrados de YouTube.',
    saveError: 'No se pudo guardar tu elección. Las funciones opcionales permanecen desactivadas.',
    refuse: 'Rechazar opcionales',
    customize: 'Personalizar',
    accept: 'Aceptar todo',
    save: 'Guardar mi elección',
  },
  zh: {
    title: '隐私选项',
    essential: '必要功能仍会保持启用。',
    performanceOnly: '只有在您同意后才会加载 Vercel 性能分析。',
    performanceAndMedia: '只有在您同意后才会加载 Vercel 性能分析和嵌入式 YouTube 视频。',
    choose: '您可以拒绝可选功能，也可以分别选择。',
    details: '阅读 Cookie 政策。',
    purpose: '按用途选择',
    performance: '性能分析（Vercel）',
    performanceDescription: '网站性能的技术测量。',
    media: '嵌入式视频（YouTube）',
    mediaDescription: '允许加载嵌入式 YouTube 播放器。',
    saveError: '无法保存您的选择。可选功能将保持关闭。',
    refuse: '拒绝可选项',
    customize: '自定义',
    accept: '全部接受',
    save: '保存我的选择',
  },
};

const readConsent = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (
      saved?.version !== CONSENT_VERSION ||
      !saved?.expiresAt ||
      saved.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      performance: saved.preferences?.performance === true,
      externalMedia: saved.preferences?.externalMedia === true,
    };
  } catch (error) {
    console.error('Could not read cookie preferences:', error);
    return null;
  }
};

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
};

export const CookieConsentProvider = ({
  children,
  language = 'en',
  externalMediaEnabled = true,
}) => {
  const [preferences, setPreferences] = useState(readConsent);
  const [settingsOpen, setSettingsOpen] = useState(() => readConsent() === null);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState(() => readConsent() || defaultPreferences);
  const [storageError, setStorageError] = useState(false);
  const copy = consentCopy[language] || consentCopy.en;
  const description = externalMediaEnabled ? copy.performanceAndMedia : copy.performanceOnly;

  const savePreferences = (nextPreferences) => {
    const normalizedPreferences = {
      performance: nextPreferences.performance === true,
      externalMedia: externalMediaEnabled && nextPreferences.externalMedia === true,
    };
    const record = {
      version: CONSENT_VERSION,
      savedAt: Date.now(),
      expiresAt: Date.now() + CONSENT_LIFETIME_MS,
      preferences: normalizedPreferences,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      setPreferences(normalizedPreferences);
      setDraft(normalizedPreferences);
      setStorageError(false);
      setSettingsOpen(false);
      setCustomizing(false);
      return true;
    } catch (error) {
      console.error('Could not save cookie preferences:', error);
      setStorageError(true);
      setPreferences(defaultPreferences);
      return false;
    }
  };

  const openSettings = () => {
    setDraft(preferences || defaultPreferences);
    setStorageError(false);
    setCustomizing(true);
    setSettingsOpen(true);
  };

  const value = useMemo(() => ({
    preferences: preferences || defaultPreferences,
    openSettings,
  }), [preferences]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {settingsOpen && (
        <aside className="cookie-consent" aria-labelledby="cookie-consent-title">
          <div className="cookie-consent__content">
            <h2 id="cookie-consent-title">
              {copy.title}
            </h2>
            <p>
              {copy.essential} {description} {copy.choose}
              {' '}
              <Link to="/cookies">
                {copy.details}
              </Link>
            </p>
            {customizing && (
              <fieldset className="cookie-consent__options">
                <legend>{copy.purpose}</legend>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.performance}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      performance: event.target.checked,
                    }))}
                  />
                  <span>
                    <strong>{copy.performance}</strong>
                    <small>{copy.performanceDescription}</small>
                  </span>
                </label>
                {externalMediaEnabled && (
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.externalMedia}
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        externalMedia: event.target.checked,
                      }))}
                    />
                    <span>
                      <strong>{copy.media}</strong>
                      <small>{copy.mediaDescription}</small>
                    </span>
                  </label>
                )}
              </fieldset>
            )}
            {storageError && (
              <p className="cookie-consent__error" role="alert">
                {copy.saveError}
              </p>
            )}
            <div className="cookie-consent__actions">
              {!customizing ? (
                <>
                  <button type="button" onClick={() => savePreferences(defaultPreferences)}>
                    {copy.refuse}
                  </button>
                  <button type="button" onClick={() => setCustomizing(true)}>
                    {copy.customize}
                  </button>
                  <button
                    type="button"
                    className="cookie-consent__primary"
                    onClick={() => savePreferences({ performance: true, externalMedia: externalMediaEnabled })}
                  >
                    {copy.accept}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => savePreferences(defaultPreferences)}>
                    {copy.refuse}
                  </button>
                  <button
                    type="button"
                    className="cookie-consent__primary"
                    onClick={() => savePreferences(draft)}
                  >
                    {copy.save}
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      )}
    </CookieConsentContext.Provider>
  );
};

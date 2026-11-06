export const availableLanguages = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ru', label: 'Русский' },
  { value: 'es', label: 'Español' },
  { value: 'zh', label: '中文' }
];

const languageCodes = new Set(availableLanguages.map(({ value }) => value));
const apiMessageKeys = new Map([
  ['invalid credentials', 'invalidCredentials'],
  ['invalid login credentials', 'invalidCredentials'],
  ['your account has been banned', 'accountBlocked'],
  ['email not confirmed', 'emailNotConfirmed'],
  ['email or username already exists', 'accountAlreadyExists'],
  ['user already registered', 'accountAlreadyExists'],
  ['email already registered', 'accountAlreadyExists'],
  ['invalid email format', 'invalidEmailFormat'],
  ['unable to validate email address: invalid format', 'invalidEmailFormat'],
  ['username must be between 3 and 30 characters', 'usernameLengthValidation'],
  ['username can only contain alphanumeric characters, underscores, and hyphens', 'usernameCharactersValidation'],
  ['password must contain uppercase, lowercase, number, and special character', 'passwordRequirementsValidation']
]);

export const normalizeLanguage = (locale) => {
  if (typeof locale !== 'string') return null;

  const code = locale.trim().toLowerCase().split(/[-_]/, 1)[0];
  return languageCodes.has(code) ? code : null;
};

export const formatTranslation = (translations, language, key, values = {}) => {
  const localeTranslations = translations[language] || {};
  const fallbackTranslations = translations.en || {};
  const parameters = values && typeof values === 'object' ? { ...values } : {};
  let message = localeTranslations[key] ?? fallbackTranslations[key] ?? key;

  if (Object.prototype.hasOwnProperty.call(parameters, 'count')) {
    const count = Number(parameters.count);
    if (Number.isFinite(count)) {
      const pluralForm = new Intl.PluralRules(language).select(count);
      message = localeTranslations[`${key}_${pluralForm}`]
        ?? fallbackTranslations[`${key}_${pluralForm}`]
        ?? localeTranslations[`${key}_other`]
        ?? fallbackTranslations[`${key}_other`]
        ?? message;
      parameters.count = new Intl.NumberFormat(language).format(count);
    }
  }

  return String(message).replace(/\{(\w+)\}/g, (placeholder, name) => (
    Object.prototype.hasOwnProperty.call(parameters, name)
      ? String(parameters[name])
      : placeholder
  ));
};

export const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en';

  try {
    const savedLanguage = window.localStorage.getItem('nexastrike-language');
    const normalizedSavedLanguage = normalizeLanguage(savedLanguage);
    if (normalizedSavedLanguage) return normalizedSavedLanguage;
  } catch (error) {
    console.error('Could not read the saved language preference:', error);
  }

  const browserLanguages = typeof navigator === 'undefined'
    ? []
    : Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language];

  return browserLanguages.map(normalizeLanguage).find(Boolean) || 'en';
};

export const localizeApiMessage = (message, t, fallbackKey) => {
  const normalizedMessage = typeof message === 'string' ? message.trim().toLowerCase() : '';
  const passwordLength = normalizedMessage.match(/^(?:password must be at least|password should be at least) (\d+) characters(?: long)?$/);

  if (passwordLength) {
    return t('passwordLengthValidation', { min: passwordLength[1] });
  }

  return t(apiMessageKeys.get(normalizedMessage) || fallbackKey);
};

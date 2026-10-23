const getIsProduction = (env = process.env) => (env.NODE_ENV || '').toLowerCase() === 'production';

const getCookieOptions = (env = process.env, { maxAgeMs = 24 * 60 * 60 * 1000, path = '/' } = {}) => {
  const isProduction = getIsProduction(env);

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path,
  };
};

const getCookieClearOptions = (env = process.env, path = '/') => {
  const isProduction = getIsProduction(env);

  return {
    path,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  };
};

module.exports = {
  getCookieOptions,
  getCookieClearOptions,
};

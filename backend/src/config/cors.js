const DEVELOPMENT_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const PRODUCTION_ALLOWED_ORIGINS = [
  'https://nexa-strike.com',
  'https://www.nexa-strike.com',
  'https://nexa-strike.vercel.app',
  'https://www.nexa-strike.vercel.app',
];

const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const isLocalOrigin = (origin) => {
  try {
    const parsedOrigin = new URL(origin);
    return ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);
  } catch {
    return false;
  }
};

const getAllowedOrigins = (env = process.env) => {
  const isProduction = (env.NODE_ENV || '').toLowerCase() === 'production';
  const configuredOrigins = [
    ...parseAllowedOrigins(env.CORS_ORIGIN || ''),
    ...parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS || ''),
  ].filter((origin) => !isProduction || !isLocalOrigin(origin));

  return [...new Set([
    ...PRODUCTION_ALLOWED_ORIGINS,
    ...(isProduction ? [] : DEVELOPMENT_ALLOWED_ORIGINS),
    ...configuredOrigins,
  ])];
};

const isAllowedOrigin = (origin, env = process.env) =>
  getAllowedOrigins(env).includes(origin);

const originProtection = (env = process.env) => (req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !isAllowedOrigin(origin, env)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const isStateChangingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const hasAuthCookie = /(?:^|;)\s*(?:token|refreshToken)=/.test(req.headers.cookie || '');
  if (isStateChangingMethod && hasAuthCookie && !origin) {
    return res.status(403).json({ error: 'Origin required for cookie-authenticated requests' });
  }

  next();
};

const getCorsOptions = (env = process.env) => {
  const allowedOrigins = getAllowedOrigins(env);

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
};

module.exports = {
  DEVELOPMENT_ALLOWED_ORIGINS,
  PRODUCTION_ALLOWED_ORIGINS,
  getAllowedOrigins,
  getCorsOptions,
  isAllowedOrigin,
  originProtection,
  parseAllowedOrigins,
};

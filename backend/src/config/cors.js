const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
  'http://127.0.0.1:3005',
  'https://nexa-strike.vercel.app',
  'https://www.nexa-strike.vercel.app',
];

const parseAllowedOrigins = (value = '') => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const getCorsOptions = (env = process.env) => {
  const configuredOrigins = [
    ...parseAllowedOrigins(env.CORS_ORIGIN),
    ...parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS),
    ...DEFAULT_ALLOWED_ORIGINS,
  ];

  const allowedOrigins = [...new Set(configuredOrigins)];

  return {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const hostname = new URL(origin).hostname;
        const isLocalhost = ['localhost', '127.0.0.1'].includes(hostname);

        if (isLocalhost) {
          return callback(null, true);
        }
      } catch (error) {
        // Ignore invalid origins and reject them below.
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
  DEFAULT_ALLOWED_ORIGINS,
  parseAllowedOrigins,
  getCorsOptions,
};

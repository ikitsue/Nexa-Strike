const { createMediaHandler } = require('./lib/media');

const DEFAULT_ORIGINS = [
  'https://nexa-strike.com',
  'https://nexa-strike-mbktdm3te-axel4.vercel.app',
  'http://127.0.0.1:43127',
];

const getAllowedOrigins = () => {
  const configured = process.env.MEDIA_ALLOWED_ORIGINS;
  const origins = configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ORIGINS;
  if (origins.some((origin) => origin.includes('*'))) {
    throw new Error('MEDIA_ALLOWED_ORIGINS must not contain wildcards');
  }
  return new Set(origins);
};

const mediaHandler = createMediaHandler();

module.exports = async (req, res) => {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  let allowedOrigins;
  try {
    allowedOrigins = getAllowedOrigins();
  } catch (error) {
    console.error('Media API origin configuration is invalid', { name: error?.name });
    return res.status(503).json({ error: 'Media service is not configured' });
  }

  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  return mediaHandler(req, res);
};

const rateLimit = require('express-rate-limit');

// Rate limiter général
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requêtes
  message: 'Trop de requêtes, veuillez réessayer plus tard',
  standardHeaders: true, // Retourne les informations de rate limit dans `RateLimit-*` headers
  legacyHeaders: false, // Désactive `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Utilise l'IP de l'utilisateur pour générer la clé
    return req.ip || req.connection.remoteAddress;
  }
});

// Rate limiter strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5'), // 5 tentatives
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
  skipFailedRequests: false, // Compter les requêtes échouées
  keyGenerator: (req, res) => {
    return req.body.email || req.ip || req.connection.remoteAddress;
  }
});

// Rate limiter pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 uploads par heure
  message: 'Trop d\'uploads, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.user?.userId || req.ip || req.connection.remoteAddress;
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter
};

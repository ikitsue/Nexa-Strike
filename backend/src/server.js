const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { getCorsOptions } = require('./config/cors');

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`${varName} environment variable is required`);
  }
});

const app = express();

// Security middleware - Helmet
app.use(helmet());

// Import rate limiters
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

// Middleware - CORS with origin whitelist
const corsOptions = getCorsOptions(process.env);
app.use(cors(corsOptions));

// Apply general rate limiter
app.use(generalLimiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/maps', require('./routes/maps'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/clips', require('./routes/clips'));
app.use('/api/users', require('./routes/users'));

// Apply CORS to static file routes BEFORE serving
app.options('/uploads/*', cors(corsOptions));
app.options('/images/*', cors(corsOptions));

// Serve uploads folder (with CORS enabled)
app.use('/uploads', cors(corsOptions), express.static('uploads', {
  maxAge: '1h',
  etag: false
}));

// Serve public images folder (with CORS enabled)
app.use('/images', cors(corsOptions), express.static('public/images', {
  maxAge: '1h',
  etag: false
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorMessage = isDevelopment ? err.message : 'Internal server error';
  
  res.status(err.status || 500).json({ 
    error: errorMessage,
    ...(isDevelopment && { details: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

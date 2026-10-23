const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (!key) return cookies;
    cookies[key] = rest.join('=');
    return cookies;
  }, {});
};

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    let token;

    if (authorization && authorization.startsWith('Bearer ')) {
      token = authorization.split(' ')[1];
    } else if (req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER || 'NexaStrike'
    });
    req.user = decoded;

    // Check if user is banned
    const userResult = await pool.query('SELECT banned, ban_reason FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.banned) {
      return res.status(403).json({ 
        error: 'Your account has been banned',
        ban_reason: user.ban_reason
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;

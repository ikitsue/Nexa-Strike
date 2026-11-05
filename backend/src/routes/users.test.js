const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../services/emailService', () => ({
  sendBanNotification: jest.fn(),
}));

const pool = require('../config/database');
const usersRouter = require('./users');

describe('GET /api/users/:id', () => {
  let server;
  let originalJwtSecret;

  const request = (path, token) => new Promise((resolve, reject) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path,
      method: 'GET',
      headers,
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(body) });
      });
    });
    req.on('error', reject);
    req.end();
  });

  const tokenForUser = (userId) => jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { issuer: process.env.JWT_ISSUER || 'NexaStrike' }
  );

  beforeAll(async () => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'users-route-test-secret';

    const app = express();
    app.use('/api/users', usersRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  beforeEach(() => {
    pool.query.mockReset();
  });

  test('rejects requests without authentication', async () => {
    const response = await request('/api/users/1');

    expect(response.status).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('denies access to another user profile', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ banned: false, ban_reason: null }] });

    const response = await request('/api/users/2', tokenForUser(1));

    expect(response.status).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('allows an authenticated user to access their own profile', async () => {
    const profile = {
      id: 1,
      email: 'user@example.com',
      username: 'player',
      steam_id: 'steam-id',
      profile_picture: null,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    pool.query
      .mockResolvedValueOnce({ rows: [{ banned: false, ban_reason: null }] })
      .mockResolvedValueOnce({ rows: [profile] });

    const response = await request('/api/users/1', tokenForUser(1));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(profile);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

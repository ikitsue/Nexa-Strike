const { getCorsOptions, isAllowedOrigin, originProtection } = require('./cors');

const checkOrigin = (origin, env = {}) => new Promise((resolve) => {
  getCorsOptions(env).origin(origin, (error, allowed) => {
    resolve({ error, allowed });
  });
});

describe('CORS origin allowlist', () => {
  test.each([
    'https://nexa-strike.com',
    'https://www.nexa-strike.com',
  ])('allows the custom production frontend origin %s', async (origin) => {
    const result = await checkOrigin(origin, { NODE_ENV: 'production' });

    expect(result).toEqual({ error: null, allowed: true });
  });

  test('allows the configured production frontend origin', async () => {
    const result = await checkOrigin('https://nexa-strike.vercel.app', { NODE_ENV: 'production' });

    expect(result).toEqual({ error: null, allowed: true });
  });

  test('preserves localhost access for development', async () => {
    const result = await checkOrigin('http://localhost:3001', { NODE_ENV: 'development' });

    expect(result).toEqual({ error: null, allowed: true });
  });

  test('rejects unneeded localhost ports in development', () => {
    expect(isAllowedOrigin('http://localhost:3000', { NODE_ENV: 'development' })).toBe(false);
  });

  test('rejects localhost origins in production, including configured origins', () => {
    expect(isAllowedOrigin('http://localhost:3001', {
      NODE_ENV: 'production',
      CORS_ORIGIN: 'http://localhost:3001',
    })).toBe(false);
    expect(isAllowedOrigin('http://127.0.0.1:5173', { NODE_ENV: 'production' })).toBe(false);
  });

  test('rejects unconfigured Vercel preview origins', async () => {
    const result = await checkOrigin('https://attacker-preview.vercel.app');

    expect(result.error).toEqual(new Error('Not allowed by CORS'));
    expect(result.allowed).toBeUndefined();
  });

  test('allows Vercel origins explicitly listed in the environment', async () => {
    const result = await checkOrigin('https://preview.example.vercel.app', {
      CORS_ORIGIN: 'https://preview.example.vercel.app',
    });

    expect(result).toEqual({ error: null, allowed: true });
  });

  test('blocks state-changing cookie requests without an Origin header', () => {
    const req = {
      method: 'POST',
      headers: { cookie: 'token=session' },
      get: () => undefined,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    originProtection({ NODE_ENV: 'production' })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects disallowed origins before a request reaches its route', () => {
    const req = {
      method: 'GET',
      headers: {},
      get: () => 'https://attacker.example',
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    originProtection({ NODE_ENV: 'production' })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows cookie-authenticated mutations from the configured frontend origin', () => {
    const req = {
      method: 'POST',
      headers: { cookie: 'token=session' },
      get: () => 'https://nexa-strike.com',
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    originProtection({ NODE_ENV: 'production' })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

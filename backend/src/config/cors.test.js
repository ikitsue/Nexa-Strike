const { getCorsOptions } = require('./cors');

const checkOrigin = (origin, env = {}) => new Promise((resolve) => {
  getCorsOptions(env).origin(origin, (error, allowed) => {
    resolve({ error, allowed });
  });
});

describe('CORS origin allowlist', () => {
  test('allows the configured production frontend origin', async () => {
    const result = await checkOrigin('https://nexa-strike.vercel.app');

    expect(result).toEqual({ error: null, allowed: true });
  });

  test('preserves localhost access for development', async () => {
    const result = await checkOrigin('http://localhost:3000');

    expect(result).toEqual({ error: null, allowed: true });
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
});

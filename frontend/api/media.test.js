const { test } = require('node:test');
const assert = require('node:assert/strict');
const mediaApi = require('./media');
const vercelConfig = require('../vercel.json');

const makeResponse = () => ({
  headers: {},
  statusCode: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  end() {
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('allows only the production, Preview, and packaged desktop origins by default', async () => {
  const previous = process.env.MEDIA_ALLOWED_ORIGINS;
  delete process.env.MEDIA_ALLOWED_ORIGINS;

  try {
    for (const origin of [
      'https://nexa-strike.com',
      'https://nexa-strike-mbktdm3te-axel4.vercel.app',
      'http://127.0.0.1:43127',
    ]) {
      const req = { method: 'OPTIONS', headers: { origin } };
      const res = makeResponse();
      await mediaApi(req, res);
      assert.equal(res.statusCode, 204);
      assert.equal(res.headers['Access-Control-Allow-Origin'], origin);
      assert.equal(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
      assert.equal(res.headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type');
      assert.equal(res.headers['Access-Control-Max-Age'], '600');
    }

    for (const origin of [
      '*',
      'https://other-project.vercel.app',
      'https://nexa-strike-mbktdm3te-axel4.vercel.app.evil.example',
    ]) {
      const req = { method: 'OPTIONS', headers: { origin } };
      const res = makeResponse();
      await mediaApi(req, res);
      assert.equal(res.statusCode, 403);
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.MEDIA_ALLOWED_ORIGINS;
    else process.env.MEDIA_ALLOWED_ORIGINS = previous;
  }
});

test('allows CORS for Preview requests without bypassing authentication or method checks', async () => {
  const origin = 'https://nexa-strike-mbktdm3te-axel4.vercel.app';

  const getRes = makeResponse();
  await mediaApi({ method: 'GET', headers: { origin } }, getRes);
  assert.equal(getRes.statusCode, 405);
  assert.equal(getRes.headers.Allow, 'POST');
  assert.equal(getRes.headers['Access-Control-Allow-Origin'], origin);

  const postRes = makeResponse();
  await mediaApi({ method: 'POST', headers: { origin }, body: {} }, postRes);
  assert.equal(postRes.statusCode, 401);
  assert.equal(postRes.headers['Access-Control-Allow-Origin'], origin);

  const postWithoutOriginRes = makeResponse();
  await mediaApi({ method: 'POST', headers: {}, body: {} }, postWithoutOriginRes);
  assert.equal(postWithoutOriginRes.statusCode, 401);

  for (const method of ['GET', 'PUT']) {
    const res = makeResponse();
    await mediaApi({ method, headers: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.Allow, 'POST');
  }
});

test('rejects wildcard entries in the configured origin allowlist', async () => {
  const previous = process.env.MEDIA_ALLOWED_ORIGINS;

  try {
    for (const configuredOrigin of ['*', 'https://*.vercel.app']) {
      process.env.MEDIA_ALLOWED_ORIGINS = configuredOrigin;
      const res = makeResponse();
      await mediaApi({
        method: 'OPTIONS',
        headers: { origin: 'https://other-project.vercel.app' },
      }, res);
      assert.equal(res.statusCode, 503);
      assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.MEDIA_ALLOWED_ORIGINS;
    else process.env.MEDIA_ALLOWED_ORIGINS = previous;
  }
});

test('keeps the media handler auto-detectable outside the SPA rewrite', () => {
  assert.equal(typeof mediaApi, 'function');
  assert.equal(vercelConfig.outputDirectory, 'build');
  assert.equal(vercelConfig.builds, undefined);
  assert.ok(vercelConfig.rewrites.every(
    ({ source }) => source.includes('(?!_vercel/|api/)'),
  ));
});

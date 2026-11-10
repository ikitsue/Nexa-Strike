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

test('allows only the production and packaged desktop origins by default', async () => {
  const previous = process.env.MEDIA_ALLOWED_ORIGINS;
  delete process.env.MEDIA_ALLOWED_ORIGINS;

  try {
    for (const origin of ['https://nexa-strike.com', 'http://127.0.0.1:43127']) {
      const req = { method: 'OPTIONS', headers: { origin } };
      const res = makeResponse();
      await mediaApi(req, res);
      assert.equal(res.statusCode, 204);
      assert.equal(res.headers['Access-Control-Allow-Origin'], origin);
    }

    const req = { method: 'OPTIONS', headers: { origin: 'https://evil.example' } };
    const res = makeResponse();
    await mediaApi(req, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  } finally {
    if (previous === undefined) delete process.env.MEDIA_ALLOWED_ORIGINS;
    else process.env.MEDIA_ALLOWED_ORIGINS = previous;
  }
});

test('routes POST to authentication and rejects unsupported methods explicitly', async () => {
  const postRes = makeResponse();
  await mediaApi({ method: 'POST', headers: {}, body: {} }, postRes);
  assert.equal(postRes.statusCode, 401);

  for (const method of ['GET', 'PUT']) {
    const res = makeResponse();
    await mediaApi({ method, headers: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.Allow, 'POST');
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

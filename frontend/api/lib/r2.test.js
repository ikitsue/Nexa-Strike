const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createR2Client,
  createR2MediaStorageFromEnv,
  createR2Storage,
  createPublicImageKey,
  getAllowedImage,
  getR2Config,
} = require('./r2');

const R2_ENV = {
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  R2_BUCKET_NAME: 'nexa-images',
  R2_STAGING_ACCESS_KEY_ID: 'staging-access-key',
  R2_STAGING_SECRET_ACCESS_KEY: 'staging-secret-key',
  R2_STAGING_BUCKET_NAME: 'nexa-images-staging',
  R2_PUBLIC_KEY_SECRET: 'test-public-key-secret-that-is-long-enough',
  R2_ENDPOINT: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
  R2_PUBLIC_URL: 'https://images.example.com',
};

test('requires the exact HTTPS Cloudflare account endpoint', () => {
  assert.throws(() => getR2Config({
    ...R2_ENV,
    CLOUDFLARE_ACCOUNT_ID: 'not-an-account-id',
  }), /CLOUDFLARE_ACCOUNT_ID/);
  assert.throws(() => getR2Config({
    ...R2_ENV,
    R2_ENDPOINT: 'https://attacker.example.com',
  }), /R2_ENDPOINT/);
  assert.throws(() => getR2Config({
    ...R2_ENV,
    R2_ENDPOINT: `${R2_ENV.R2_ENDPOINT}/?token=unexpected`,
  }), /R2_ENDPOINT/);
});

test('accepts only supported image formats and bounded sizes', () => {
  assert.deepEqual(getAllowedImage({
    extension: '.png',
    contentType: 'image/png',
    size: 1024,
  }), { extension: '.png', contentType: 'image/png' });
  assert.deepEqual(getAllowedImage({
    extension: '.png',
    contentType: 'image/png',
    size: 50 * 1024 * 1024,
  }), { extension: '.png', contentType: 'image/png' });
  assert.equal(getAllowedImage({
    extension: '.svg',
    contentType: 'image/svg+xml',
    size: 10,
  }), null);
  assert.equal(getAllowedImage({
    extension: '.jpg',
    contentType: 'image/jpeg',
    size: 50 * 1024 * 1024 + 1,
  }), null);
});

test('binds presigned R2 PUT requests to the file size and content type', async () => {
  const config = getR2Config(R2_ENV);
  const storage = createR2Storage(createR2Client(config), config.bucket, config.publicUrl);
  const url = new URL(await storage.presign({
    key: 'maps/123e4567-e89b-42d3-a456-426614174000/123e4567-e89b-42d3-a456-426614174001.jpg',
    contentType: 'image/jpeg',
    size: 123,
  }));
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /content-length/);
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /cache-control/);
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /content-type/);
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /if-none-match/);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '60');
  assert.equal(url.searchParams.has('x-amz-checksum-crc32'), false);
});

test('presigns staging uploads with the staging-only key and keeps public keys opaque', async () => {
  const stageKey = 'maps/123e4567-e89b-42d3-a456-426614174000/123e4567-e89b-42d3-a456-426614174001.png';
  const storage = createR2MediaStorageFromEnv(R2_ENV);
  const url = new URL(await storage.presign({
    key: stageKey,
    contentType: 'image/png',
    size: 123,
  }));
  const credential = decodeURIComponent(url.searchParams.get('X-Amz-Credential'));
  const publicKey = storage.publicKey(stageKey);

  assert.ok(url.hostname.startsWith('nexa-images-staging.'));
  assert.ok(credential.startsWith('staging-access-key/'));
  assert.notEqual(publicKey, stageKey);
  assert.equal(storage.publicKey(stageKey), publicKey);
  assert.match(publicKey, /^maps\/123e4567-e89b-42d3-a456-426614174000\/[0-9a-f-]+\.png$/);
  assert.notEqual(
    createPublicImageKey(stageKey, 'a-different-secret'),
    publicKey,
  );
});

test('requires separate staging bucket and R2 credentials', () => {
  assert.throws(() => createR2MediaStorageFromEnv({
    ...R2_ENV,
    R2_STAGING_BUCKET_NAME: R2_ENV.R2_BUCKET_NAME,
  }), /must be different/);
  assert.throws(() => createR2MediaStorageFromEnv({
    ...R2_ENV,
    R2_STAGING_ACCESS_KEY_ID: R2_ENV.R2_ACCESS_KEY_ID,
  }), /credentials must be different/);
  assert.throws(() => createR2MediaStorageFromEnv({
    ...R2_ENV,
    R2_STAGING_SECRET_ACCESS_KEY: R2_ENV.R2_SECRET_ACCESS_KEY,
  }), /secrets must be different/);
  assert.throws(() => createR2MediaStorageFromEnv({
    ...R2_ENV,
    R2_STAGING_SECRET_ACCESS_KEY: undefined,
  }), /R2_STAGING_SECRET_ACCESS_KEY/);
  assert.throws(() => createR2MediaStorageFromEnv({
    ...R2_ENV,
    R2_PUBLIC_KEY_SECRET: 'too-short',
  }), /at least 32 bytes/);
});

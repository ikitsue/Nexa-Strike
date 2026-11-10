const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { createMediaHandler } = require('./media');
const { UPLOAD_URL_TTL_SECONDS } = require('./r2');
const { MAX_IMAGE_PIXELS, isValidImage } = require('./image');

const ENV = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'test-publishable-key',
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'nexa-images',
  R2_STAGING_ACCESS_KEY_ID: 'test-staging-access-key',
  R2_STAGING_SECRET_ACCESS_KEY: 'test-staging-secret-key',
  R2_STAGING_BUCKET_NAME: 'nexa-images-staging',
  R2_PUBLIC_KEY_SECRET: 'test-public-key-secret-that-is-long-enough',
  R2_ENDPOINT: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
  R2_PUBLIC_URL: 'https://images.example.com',
};
const USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const PUBLIC_IMAGE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let VALID_IMAGE;

before(async () => {
  VALID_IMAGE = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 20, g: 40, b: 60, alpha: 1 },
    },
  }).png().toBuffer();
});

const makeResponse = () => ({
  headers: {},
  statusCode: null,
  body: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const makeStorage = (overrides = {}) => {
  const publicObjects = new Map();
  let stagingExists = true;
  const notFound = () => {
    const error = new Error('Object not found');
    error.name = 'NotFound';
    error.$metadata = { httpStatusCode: 404 };
    return error;
  };
  return {
    presign: async () => 'https://r2.example/signed-upload',
    headStaging: async () => {
      if (!stagingExists) throw notFound();
      return { ContentLength: VALID_IMAGE.length, ContentType: 'image/png' };
    },
    readStagingImage: async () => VALID_IMAGE,
    deleteStaging: async () => { stagingExists = false; },
    putPublic: async ({ key, bytes, contentType, sha256, stagingKeyHash }) => {
      if (publicObjects.has(key)) {
        const error = new Error('Precondition failed');
        error.name = 'PreconditionFailed';
        error.$metadata = { httpStatusCode: 412 };
        throw error;
      }
      publicObjects.set(key, {
        bytes,
        ContentLength: bytes.length,
        ContentType: contentType,
        Metadata: { sha256, stagingkeysha256: stagingKeyHash },
      });
    },
    headPublic: async (key) => {
      const object = publicObjects.get(key);
      if (!object) throw notFound();
      return object;
    },
    readPublicImage: async (key) => publicObjects.get(key).bytes,
    deletePublic: async (key) => {
      if (!publicObjects.has(key)) throw notFound();
      publicObjects.delete(key);
    },
    publicKey: (key) => key.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\.(jpg|jpeg|png|gif|webp)$)/i,
      PUBLIC_IMAGE_ID,
    ),
    publicUrl: (key) => `https://images.example.com/${key}`,
    ...overrides,
  };
};

const makeExistingPublicStorage = (overrides = {}) => makeStorage({
  headPublic: async () => ({ ContentLength: VALID_IMAGE.length, ContentType: 'image/png' }),
  ...overrides,
});

const defaultRpc = async (name) => {
  if (name === 'consume_r2_upload_rate_limit') return { data: true, error: null };
  if (name === 'begin_r2_image_deletion') return { data: 'ready', error: null };
  if (name === 'complete_r2_image_deletion') return { data: true, error: null };
  throw new Error(`Unexpected RPC: ${name}`);
};

const runHandler = async ({
  body,
  role = 'admin',
  banned = false,
  authorization = 'Bearer valid-token',
  storage = makeStorage(),
  rpc = defaultRpc,
  consumeRateLimit,
} = {}) => {
  const handler = createMediaHandler({
    env: ENV,
    createSupabaseClient: () => ({
      auth: {
        getUser: async (token) => (
          token === 'valid-token'
            ? { data: { user: { id: USER_ID, email: 'user@example.com' } }, error: null }
            : { data: { user: null }, error: new Error('invalid') }
        ),
      },
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          single: async () => ({ data: { id: 1, role, banned }, error: null }),
        };
        return query;
      },
      rpc,
    }),
    createStorage: () => storage,
    consumeRateLimit,
  });
  const req = { method: 'POST', headers: { authorization }, body };
  const res = makeResponse();
  await handler(req, res);
  return { res, storage };
};

test('rejects uploads without a verified Supabase token', async () => {
  const { res } = await runHandler({ body: { action: 'presign' }, authorization: '' });
  assert.equal(res.statusCode, 401);
});

test('rejects restricted uploads from non-admin profiles', async () => {
  const { res } = await runHandler({
    role: 'user',
    body: { action: 'presign', kind: 'map', extension: '.png', contentType: 'image/png', size: 10 },
  });
  assert.equal(res.statusCode, 403);
});

test('rejects banned profiles before accessing the rate limiter', async () => {
  let rateLimitCalls = 0;
  const { res } = await runHandler({
    banned: true,
    consumeRateLimit: async () => { rateLimitCalls += 1; return true; },
    body: { action: 'presign', kind: 'map', extension: '.png', contentType: 'image/png', size: 10 },
  });
  assert.equal(res.statusCode, 403);
  assert.equal(rateLimitCalls, 0);
});

test('creates a short-lived URL for an authenticated map image with fixed constraints', async () => {
  let presigned;
  const { res } = await runHandler({
    body: {
      action: 'presign',
      kind: 'map',
      extension: '.png',
      contentType: 'image/png',
      size: VALID_IMAGE.length,
      filename: '../../untrusted.png',
    },
    storage: makeStorage({
      presign: async (input) => {
        presigned = input;
        return 'https://r2.example/signed-upload';
      },
    }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.uploadUrl, 'https://r2.example/signed-upload');
  assert.match(res.body.key, new RegExp(`^maps/${USER_ID}/[0-9a-f-]{36}\\.png$`));
  assert.equal(res.body.headers['Content-Type'], 'image/png');
  assert.equal(res.body.headers['Cache-Control'], 'no-store');
  assert.equal(res.body.headers['If-None-Match'], '*');
  assert.equal(presigned.size, VALID_IMAGE.length);
  assert.equal(res.body.expiresIn, UPLOAD_URL_TTL_SECONDS);
});

test('rejects unsupported extensions and oversized images before presigning', async () => {
  let presignCalls = 0;
  const storage = makeStorage({ presign: async () => { presignCalls += 1; return 'unused'; } });
  const invalidType = await runHandler({
    storage,
    body: { action: 'presign', kind: 'map', extension: '.svg', contentType: 'image/svg+xml', size: 20 },
  });
  assert.equal(invalidType.res.statusCode, 400);

  const oversized = await runHandler({
    storage,
    body: {
      action: 'presign',
      kind: 'map',
      extension: '.png',
      contentType: 'image/png',
      size: 50 * 1024 * 1024 + 1,
    },
  });
  assert.equal(oversized.res.statusCode, 400);
  assert.equal(presignCalls, 0);
});

test('accepts the exact 50 MiB limit and signs that exact length', async () => {
  let signedSize;
  const { res } = await runHandler({
    body: {
      action: 'presign',
      kind: 'map',
      extension: '.png',
      contentType: 'image/png',
      size: 50 * 1024 * 1024,
    },
    storage: makeStorage({
      presign: async ({ size }) => {
        signedSize = size;
        return 'https://r2.example/signed-upload';
      },
    }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(signedSize, 50 * 1024 * 1024);
});

test('requires a valid map id for utility uploads', async () => {
  const { res } = await runHandler({
    body: { action: 'presign', kind: 'utility', extension: '.png', contentType: 'image/png', size: 10 },
  });
  assert.equal(res.statusCode, 400);
});

test('verifies the full image and metadata before returning its public URL', async () => {
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const { res } = await runHandler({ body: { action: 'complete', key } });
  assert.equal(res.statusCode, 200);
  assert.notEqual(res.body.key, key);
  assert.equal(res.body.url, `https://images.example.com/${res.body.key}`);
});

test('uses a stable, opaque public key and supports complete retries', async () => {
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const storage = makeStorage();
  const first = await runHandler({ body: { action: 'complete', key }, storage });
  const retry = await runHandler({ body: { action: 'complete', key }, storage });
  assert.equal(first.res.statusCode, 200);
  assert.equal(retry.res.statusCode, 200);
  assert.equal(retry.res.body.key, first.res.body.key);
  assert.notEqual(retry.res.body.key, key);
});

test('keeps staged uploads retryable when the public write fails', async () => {
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const storage = makeStorage();
  const putPublic = storage.putPublic;
  let attempts = 0;
  storage.putPublic = async (input) => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary R2 failure');
    return putPublic(input);
  };

  const failed = await runHandler({ body: { action: 'complete', key }, storage });
  const retry = await runHandler({ body: { action: 'complete', key }, storage });
  assert.equal(failed.res.statusCode, 503);
  assert.equal(retry.res.statusCode, 200);
  assert.equal(attempts, 2);
});

test('does not return a URL when the public copy fails integrity verification', async () => {
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const storage = makeStorage();
  let deleted = false;
  storage.readPublicImage = async () => Buffer.from('corrupt copy');
  const deletePublic = storage.deletePublic;
  storage.deletePublic = async (publicKey) => {
    deleted = true;
    return deletePublic(publicKey);
  };

  const { res } = await runHandler({ body: { action: 'complete', key }, storage });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.url, undefined);
  assert.equal(deleted, true);
});

test('rejects dimensions beyond the decoded-pixel limit and truncated image data', async () => {
  const oversizedDimensions = Buffer.from(VALID_IMAGE);
  oversizedDimensions.writeUInt32BE(MAX_IMAGE_PIXELS + 1, 16);
  oversizedDimensions.writeUInt32BE(1, 20);
  const truncated = VALID_IMAGE.subarray(0, Math.floor(VALID_IMAGE.length / 2));
  assert.equal(await isValidImage(oversizedDimensions, 'image/png'), false);
  assert.equal(await isValidImage(truncated, 'image/png'), false);
});

test('rejects malformed or mislabeled image content and attempts cleanup', async () => {
  let deleted = false;
  let publicWrites = 0;
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const corruptImage = Buffer.concat([VALID_IMAGE.subarray(0, 8), Buffer.from('not-png-data')]);
  const malformed = await runHandler({
    body: { action: 'complete', key },
    storage: makeStorage({
      putPublic: async () => { publicWrites += 1; },
      readStagingImage: async () => corruptImage,
      headStaging: async () => ({
        ContentLength: corruptImage.length,
        ContentType: 'image/png',
      }),
      deleteStaging: async () => { deleted = true; },
    }),
  });
  assert.equal(malformed.res.statusCode, 400);
  assert.equal(deleted, true);
  assert.equal(publicWrites, 0);

  const mislabeled = await runHandler({
    body: { action: 'complete', key },
    storage: makeStorage({
      putPublic: async () => { publicWrites += 1; },
      headStaging: async () => ({
        ContentLength: VALID_IMAGE.length,
        ContentType: 'image/jpeg',
      }),
      deleteStaging: async () => { deleted = true; },
    }),
  });
  assert.equal(mislabeled.res.statusCode, 400);
  assert.equal(publicWrites, 0);
});

test('rejects a body whose downloaded length differs from R2 metadata', async () => {
  let deleted = false;
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const { res } = await runHandler({
    body: { action: 'complete', key },
    storage: makeStorage({
      headStaging: async () => ({
        ContentLength: VALID_IMAGE.length + 1,
        ContentType: 'image/png',
      }),
      deleteStaging: async () => { deleted = true; },
    }),
  });
  assert.equal(res.statusCode, 400);
  assert.equal(deleted, true);
});

test('rejects oversized staged objects before reading or publishing them', async () => {
  let downloaded = false;
  let published = false;
  let deleted = false;
  const key = `maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const { res } = await runHandler({
    body: { action: 'complete', key },
    storage: makeStorage({
      headStaging: async () => ({
        ContentLength: 50 * 1024 * 1024 + 1,
        ContentType: 'image/png',
      }),
      readStagingImage: async () => { downloaded = true; return VALID_IMAGE; },
      putPublic: async () => { published = true; },
      deleteStaging: async () => { deleted = true; },
    }),
  });
  assert.equal(res.statusCode, 400);
  assert.equal(downloaded, false);
  assert.equal(published, false);
  assert.equal(deleted, true);
});

test('rejects uploads whose key belongs to another authenticated user', async () => {
  const { res } = await runHandler({
    body: {
      action: 'complete',
      key: 'maps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/123e4567-e89b-42d3-a456-426614174001.png',
    },
  });
  assert.equal(res.statusCode, 403);
});

test('prevents a failed replacement from deleting an image still referenced in Supabase', async () => {
  let storageTouched = false;
  const { res } = await runHandler({
    body: {
      action: 'delete',
      url: `https://images.example.com/maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`,
    },
    rpc: async (name) => (
      name === 'begin_r2_image_deletion'
        ? { data: 'referenced', error: null }
        : defaultRpc(name)
    ),
    storage: makeStorage({
      headPublic: async () => { storageTouched = true; },
      deletePublic: async () => { storageTouched = true; },
    }),
  });
  assert.equal(res.statusCode, 409);
  assert.equal(storageTouched, false);
});

test('rejects non-canonical URLs before checking or deleting the decoded R2 key', async () => {
  let rpcCalls = 0;
  const { res } = await runHandler({
    body: {
      action: 'delete',
      url: `https://images.example.com/maps/${USER_ID}/123e4567-e89b-42d3-a456-42661417400%31.png`,
    },
    rpc: async (name) => {
      rpcCalls += 1;
      return defaultRpc(name);
    },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(rpcCalls, 0);
});

test('allows an admin to clean up an unreferenced orphan image', async () => {
  let deleted = false;
  const { res } = await runHandler({
    body: {
      action: 'delete',
      url: `https://images.example.com/maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`,
    },
    storage: makeExistingPublicStorage({ deletePublic: async () => { deleted = true; } }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(deleted, true);
});

test('allows an uploader to discard their own unreferenced upload', async () => {
  let deleted = false;
  const { res } = await runHandler({
    role: 'user',
    body: {
      action: 'discard',
      key: `clips/images/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`,
    },
    storage: makeStorage({ deleteStaging: async () => { deleted = true; } }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(deleted, true);
});

test('discards a published orphan after a lost completion response', async () => {
  const key = `clips/images/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const storage = makeStorage();
  await runHandler({ body: { action: 'complete', key }, role: 'user', storage });

  const discarded = await runHandler({
    role: 'user',
    body: { action: 'discard', key },
    storage,
  });
  const completedAgain = await runHandler({
    role: 'user',
    body: { action: 'complete', key },
    storage,
  });
  assert.equal(discarded.res.statusCode, 200);
  assert.equal(completedAgain.res.statusCode, 404);
});

test('discard never removes a published image that is referenced', async () => {
  const key = `clips/images/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const storage = makeStorage();
  await runHandler({ body: { action: 'complete', key }, role: 'user', storage });
  let deleted = false;
  const deletePublic = storage.deletePublic;
  storage.deletePublic = async (publicKey) => {
    deleted = true;
    return deletePublic(publicKey);
  };

  const discarded = await runHandler({
    role: 'user',
    body: { action: 'discard', key },
    storage,
    rpc: async (name) => (
      name === 'begin_r2_image_deletion'
        ? { data: 'referenced', error: null }
        : defaultRpc(name)
    ),
  });
  assert.equal(discarded.res.statusCode, 200);
  assert.equal(deleted, false);
});

test('retries a pending deletion after an R2 failure without permitting new references', async () => {
  let deleteAttempts = 0;
  let completionCalls = 0;
  const rpc = async (name) => {
    if (name === 'begin_r2_image_deletion') return { data: 'pending', error: null };
    if (name === 'complete_r2_image_deletion') {
      completionCalls += 1;
      return { data: true, error: null };
    }
    return defaultRpc(name);
  };
  const storage = makeExistingPublicStorage({
    deletePublic: async () => {
      deleteAttempts += 1;
      if (deleteAttempts === 1) throw new Error('temporary R2 failure');
    },
  });
  const body = {
    action: 'delete',
    url: `https://images.example.com/maps/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`,
  };
  const failed = await runHandler({ body, rpc, storage });
  assert.equal(failed.res.statusCode, 503);
  const retried = await runHandler({ body, rpc, storage });
  assert.equal(retried.res.statusCode, 200);
  assert.equal(deleteAttempts, 2);
  assert.equal(completionCalls, 1);
});

test('permits a user to clean up only their own unreferenced clip image', async () => {
  let deleted = false;
  const url = `https://images.example.com/clips/images/${USER_ID}/123e4567-e89b-42d3-a456-426614174001.png`;
  const ownerCleanup = await runHandler({
    role: 'user',
    body: { action: 'delete', url },
    storage: makeExistingPublicStorage({ deletePublic: async () => { deleted = true; } }),
  });
  assert.equal(ownerCleanup.res.statusCode, 200);
  assert.equal(deleted, true);

  const otherOwner = await runHandler({
    role: 'user',
    body: {
      action: 'delete',
      url: 'https://images.example.com/clips/images/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/123e4567-e89b-42d3-a456-426614174001.png',
    },
  });
  assert.equal(otherOwner.res.statusCode, 403);
});

test('enforces the rate limit across separate handler instances', async () => {
  let sharedCounter = 0;
  const sharedRpc = async (name) => {
    if (name === 'consume_r2_upload_rate_limit') {
      sharedCounter += 1;
      return { data: sharedCounter <= 10, error: null };
    }
    return defaultRpc(name);
  };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await runHandler({
      rpc: sharedRpc,
      body: {
        action: 'presign',
        kind: 'map',
        extension: '.png',
        contentType: 'image/png',
        size: VALID_IMAGE.length,
      },
    });
    assert.equal(result.res.statusCode, 200);
  }
  const limited = await runHandler({
    rpc: sharedRpc,
    body: {
      action: 'presign',
      kind: 'map',
      extension: '.png',
      contentType: 'image/png',
      size: VALID_IMAGE.length,
    },
  });
  assert.equal(limited.res.statusCode, 429);
  assert.equal(sharedCounter, 11);
});

test('fails closed when the global limiter is unavailable', async () => {
  const { res } = await runHandler({
    consumeRateLimit: async () => { throw new Error('database unavailable'); },
    body: {
      action: 'presign',
      kind: 'map',
      extension: '.png',
      contentType: 'image/png',
      size: VALID_IMAGE.length,
    },
  });
  assert.equal(res.statusCode, 503);
});

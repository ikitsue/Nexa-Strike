const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const sharp = require('sharp');
const {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const {
  getStorageReference,
  getStoredImageType,
  isSafeStorageKey,
  migrateObject,
} = require('./migrate-supabase-images');

let PNG;

before(async () => {
  PNG = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 20, g: 40, b: 60, alpha: 1 },
    },
  }).png().toBuffer();
});

const makeSupabase = (options = {}) => ({
  storage: {
    from: () => ({
      download: async () => {
        if (options.downloadError) return { data: null, error: options.downloadError };
        return { data: new Blob([PNG]), error: null };
      },
    }),
  },
  from: () => {
    const query = {
      update: () => query,
      eq: () => query,
      select: async () => ({ data: [{ id: 1 }], error: null }),
    };
    return query;
  },
});

const makeS3 = () => {
  const objects = new Map();
  let puts = 0;
  return {
    objects,
    get puts() { return puts; },
    async send(command) {
      if (command instanceof HeadObjectCommand) {
        const object = objects.get(command.input.Key);
        if (!object) {
          const error = new Error('not found');
          error.name = 'NotFound';
          error.$metadata = { httpStatusCode: 404 };
          throw error;
        }
        return {
          Metadata: object.metadata,
          ContentLength: object.bytes.length,
        };
      }
      if (command instanceof PutObjectCommand) {
        if (command.input.IfNoneMatch === '*' && objects.has(command.input.Key)) {
          const error = new Error('Precondition failed');
          error.name = 'PreconditionFailed';
          error.$metadata = { httpStatusCode: 412 };
          throw error;
        }
        puts += 1;
        objects.set(command.input.Key, {
          bytes: Buffer.from(command.input.Body),
          metadata: command.input.Metadata,
        });
        return {};
      }
      if (command instanceof GetObjectCommand) {
        const object = objects.get(command.input.Key);
        if (!object) throw new Error('object missing');
        return { Body: Readable.from([object.bytes]) };
      }
      throw new Error('Unexpected S3 command');
    },
  };
};

const migrationInput = (overrides = {}) => ({
  supabase: makeSupabase(),
  s3: makeS3(),
  bucket: 'maps',
  object: { key: 'mirage.png', size: PNG.length, contentType: 'image/png' },
  references: [{
    table: 'maps',
    column: 'image_url',
    id: 1,
    oldUrl: 'https://project.supabase.co/storage/v1/object/public/maps/mirage.png',
  }],
  config: { bucket: 'r2-images', publicUrl: 'https://images.example.com' },
  apply: true,
  ...overrides,
});

test('resolves Supabase URLs and bare paths to bucket object keys', () => {
  assert.deepEqual(
    getStorageReference(
      'https://project.supabase.co/storage/v1/object/public/maps/mirage%20night.png',
      'maps',
      'https://project.supabase.co',
    ),
    { bucket: 'maps', key: 'mirage night.png' },
  );
  assert.deepEqual(
    getStorageReference('line-images/zoom.png', 'utility-points', 'https://project.supabase.co'),
    { bucket: 'utility-points', key: 'line-images/zoom.png' },
  );
});

test('copies and verifies the image before updating references', async () => {
  const input = migrationInput();
  const result = await migrateObject(input);
  assert.equal(result.status, 'copied');
  assert.equal(result.updatedReferences, 1);
  assert.equal(input.s3.puts, 1);
});

test('retries failed source downloads and avoids duplicate destination uploads', async () => {
  const s3 = makeS3();
  const failed = migrationInput({
    s3,
    supabase: makeSupabase({ downloadError: { statusCode: 503 } }),
  });
  await assert.rejects(migrateObject(failed), /Supabase download failed/);

  const retry = migrationInput({ s3 });
  assert.equal((await migrateObject(retry)).status, 'copied');
  assert.equal((await migrateObject(retry)).status, 'already-copied');
  assert.equal(s3.puts, 1);
});

test('prevents a conflicting migration from overwriting an existing R2 object', async () => {
  const s3 = makeS3();
  const key = 'legacy/maps/mirage.png';
  const original = Buffer.from('existing object');
  s3.objects.set(key, { bytes: original, metadata: { sha256: 'different-source' } });

  await assert.rejects(migrateObject(migrationInput({ s3 })), /Existing R2 object differs/);
  assert.deepEqual(s3.objects.get(key).bytes, original);
  assert.equal(s3.puts, 0);
});

test('concurrent migration runs use one conditional write and verify the winning object', async () => {
  const s3 = makeS3();
  const input = migrationInput({ s3 });
  const results = await Promise.all([
    migrateObject(input),
    migrateObject(input),
  ]);
  assert.deepEqual(results.map(({ status }) => status).sort(), ['already-copied', 'copied']);
  assert.equal(s3.puts, 1);
  assert.deepEqual(s3.objects.get('legacy/maps/mirage.png').bytes, PNG);
});

test('rejects invalid image bytes before writing to R2', async () => {
  const s3 = makeS3();
  const supabase = makeSupabase();
  supabase.storage.from = () => ({
    download: async () => ({ data: new Blob(['not an image']), error: null }),
  });
  const result = await migrateObject(migrationInput({ supabase, s3 }));
  assert.equal(result.status, 'unsupported');
  assert.equal(s3.puts, 0);
});

test('skips oversized source objects before downloading their contents', async () => {
  let downloadCalls = 0;
  const supabase = makeSupabase();
  supabase.storage.from = () => ({
    download: async () => {
      downloadCalls += 1;
      return { data: new Blob([PNG]), error: null };
    },
  });
  const s3 = makeS3();
  const result = await migrateObject(migrationInput({
    supabase,
    s3,
    object: {
      key: 'mirage.png',
      size: 50 * 1024 * 1024 + 1,
      contentType: 'image/png',
    },
  }));
  assert.equal(result.status, 'unsupported');
  assert.equal(downloadCalls, 0);
  assert.equal(s3.puts, 0);
});

test('recognizes image signatures for migration verification', () => {
  assert.equal(getStoredImageType(PNG, 'image/png'), 'image/png');
  assert.equal(getStoredImageType(PNG, 'image/jpeg'), null);
  assert.equal(isSafeStorageKey('maps/season/file.png'), true);
  assert.equal(isSafeStorageKey('maps/../private.png'), false);
});

test('rejects truncated images that only contain a valid PNG signature', async () => {
  const supabase = makeSupabase();
  const truncated = Buffer.concat([PNG.subarray(0, 8), Buffer.from('truncated')]);
  supabase.storage.from = () => ({
    download: async () => ({ data: new Blob([truncated]), error: null }),
  });
  const s3 = makeS3();
  const result = await migrateObject(migrationInput({ supabase, s3 }));
  assert.equal(result.status, 'unsupported');
  assert.equal(s3.puts, 0);
});

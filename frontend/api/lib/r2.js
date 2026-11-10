const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createHmac } = require('node:crypto');
const path = require('node:path');

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 60;
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const STAGING_CACHE_CONTROL = 'no-store';
const IMAGE_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const getR2Config = (env = process.env) => {
  const required = [
    'CLOUDFLARE_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_ENDPOINT',
    'R2_PUBLIC_URL',
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing R2 configuration: ${missing.join(', ')}`);
  }

  if (!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID must be a 32-character hexadecimal ID');
  }

  const endpoint = new URL(env.R2_ENDPOINT);
  const expectedHost = `${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  if (
    endpoint.protocol !== 'https:'
    || endpoint.hostname !== expectedHost
    || endpoint.pathname !== '/'
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
  ) {
    throw new Error('R2_ENDPOINT must match the Cloudflare account endpoint');
  }

  const publicUrl = new URL(env.R2_PUBLIC_URL);
  if (
    publicUrl.protocol !== 'https:'
    || publicUrl.username
    || publicUrl.password
    || publicUrl.search
    || publicUrl.hash
  ) {
    throw new Error('R2_PUBLIC_URL must be an HTTPS base URL');
  }

  return {
    endpoint: endpoint.toString().replace(/\/$/, ''),
    bucket: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL.replace(/\/+$/, ''),
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  };
};

const createR2Client = (config) => new S3Client({
  region: 'auto',
  endpoint: config.endpoint,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

const createR2BucketStorage = (client, bucket) => ({
  presign: async ({ key, contentType, size, cacheControl = IMAGE_CACHE_CONTROL }) => getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: cacheControl,
      IfNoneMatch: '*',
    }),
    {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set([
        'cache-control',
        'content-length',
        'content-type',
        'if-none-match',
      ]),
    },
  ),
  head: (key) => client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
  put: ({ key, bytes, contentType, cacheControl, metadata, ifNoneMatch }) => client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentLength: bytes.length,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: metadata,
      IfNoneMatch: ifNoneMatch,
    }),
  ),
  readImage: async (key) => {
    const result = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    const chunks = [];
    let size = 0;
    for await (const chunk of result.Body) {
      const buffer = Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_IMAGE_SIZE) throw new Error('R2 image exceeds the maximum size');
      chunks.push(buffer);
    }
    return Buffer.concat(chunks, size);
  },
  delete: (key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
});

const createR2Storage = (client, bucket, publicUrl) => ({
  ...createR2BucketStorage(client, bucket),
  publicUrl: (key) => `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
});

const createPublicImageKey = (stagingKey, secret) => {
  const lastSlash = stagingKey.lastIndexOf('/');
  const extension = path.extname(stagingKey).toLowerCase();
  if (lastSlash < 0 || !secret || !IMAGE_TYPES[extension]) {
    throw new Error('Cannot derive a public key from this staging key');
  }

  const id = createHmac('sha256', secret).update(stagingKey).digest().subarray(0, 16);
  id[6] = (id[6] & 0x0f) | 0x40;
  id[8] = (id[8] & 0x3f) | 0x80;
  const hex = id.toString('hex');
  const publicId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return `${stagingKey.slice(0, lastSlash + 1)}${publicId}${extension}`;
};

const getImageType = (bytes) => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};

const getAllowedImage = ({ extension, contentType, size }) => {
  const normalizedExtension = String(extension || '').toLowerCase();
  if (IMAGE_TYPES[normalizedExtension] !== contentType) return null;
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_IMAGE_SIZE) return null;
  return { extension: normalizedExtension, contentType };
};

const createR2StorageFromEnv = (env = process.env) => {
  const config = getR2Config(env);
  const client = createR2Client(config);
  return createR2Storage(client, config.bucket, config.publicUrl);
};

const createR2MediaStorageFromEnv = (env = process.env) => {
  const config = getR2Config(env);
  const required = [
    'R2_STAGING_BUCKET_NAME',
    'R2_STAGING_ACCESS_KEY_ID',
    'R2_STAGING_SECRET_ACCESS_KEY',
    'R2_PUBLIC_KEY_SECRET',
  ];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing R2 staging configuration: ${missing.join(', ')}`);
  }
  if (env.R2_STAGING_BUCKET_NAME === config.bucket) {
    throw new Error('R2 staging and public buckets must be different');
  }
  if (env.R2_STAGING_ACCESS_KEY_ID === config.accessKeyId) {
    throw new Error('R2 staging and public credentials must be different');
  }
  if (env.R2_STAGING_SECRET_ACCESS_KEY === config.secretAccessKey) {
    throw new Error('R2 staging and public secrets must be different');
  }
  if (Buffer.byteLength(env.R2_PUBLIC_KEY_SECRET) < 32) {
    throw new Error('R2_PUBLIC_KEY_SECRET must be at least 32 bytes');
  }

  const stagingClient = createR2Client({
    ...config,
    accessKeyId: env.R2_STAGING_ACCESS_KEY_ID,
    secretAccessKey: env.R2_STAGING_SECRET_ACCESS_KEY,
  });
  const publicStorage = createR2BucketStorage(createR2Client(config), config.bucket);
  const stagingStorage = createR2BucketStorage(stagingClient, env.R2_STAGING_BUCKET_NAME);

  return {
    presign: ({ key, contentType, size }) => stagingStorage.presign({
      key,
      contentType,
      size,
      cacheControl: STAGING_CACHE_CONTROL,
    }),
    headStaging: stagingStorage.head,
    readStagingImage: stagingStorage.readImage,
    deleteStaging: stagingStorage.delete,
    putPublic: ({ key, bytes, contentType, sha256, stagingKeyHash }) => publicStorage.put({
      key,
      bytes,
      contentType,
      cacheControl: IMAGE_CACHE_CONTROL,
      metadata: { sha256, stagingkeysha256: stagingKeyHash },
      ifNoneMatch: '*',
    }),
    headPublic: publicStorage.head,
    readPublicImage: publicStorage.readImage,
    deletePublic: publicStorage.delete,
    publicKey: (key) => createPublicImageKey(key, env.R2_PUBLIC_KEY_SECRET),
    publicUrl: (key) => `${config.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
  };
};

module.exports = {
  IMAGE_TYPES,
  IMAGE_CACHE_CONTROL,
  MAX_IMAGE_SIZE,
  STAGING_CACHE_CONTROL,
  UPLOAD_URL_TTL_SECONDS,
  createR2Client,
  createR2MediaStorageFromEnv,
  createR2Storage,
  createR2StorageFromEnv,
  createPublicImageKey,
  getAllowedImage,
  getImageType,
  getR2Config,
};

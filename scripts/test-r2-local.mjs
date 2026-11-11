import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = requireFromFrontend('@aws-sdk/client-s3');

const REGION = 'auto';
const PUBLIC_BUCKET = 'nexa-strike-images';
const STAGING_BUCKET = 'nexa-strike-images-staging';
const TEST_PREFIX = '__r2_connectivity_test__/';

const getEndpoint = () => {
  const endpoint = process.env.R2_ENDPOINT;
  if (!endpoint) {
    throw Object.assign(new Error('R2_ENDPOINT is required'), { code: 'MissingR2Endpoint' });
  }

  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw Object.assign(new Error('R2_ENDPOINT must be a valid URL'), { code: 'InvalidR2Endpoint' });
  }

  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/i.test(url.hostname)
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw Object.assign(new Error('R2_ENDPOINT must be an HTTPS Cloudflare R2 account endpoint'), {
      code: 'InvalidR2Endpoint',
    });
  }

  return url.origin;
};

const clients = [
  {
    name: 'public',
    bucket: PUBLIC_BUCKET,
    otherBucket: STAGING_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  {
    name: 'staging',
    bucket: STAGING_BUCKET,
    otherBucket: PUBLIC_BUCKET,
    accessKeyId: process.env.R2_STAGING_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_STAGING_SECRET_ACCESS_KEY,
  },
];

const safeError = (error) => {
  const rawCode = error?.Code || error?.code || error?.name;
  const code = typeof rawCode === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(rawCode)
    ? rawCode
    : 'Unknown';
  const status = Number.isInteger(error?.$metadata?.httpStatusCode)
    ? error.$metadata.httpStatusCode
    : null;
  return { code, status };
};

const isAccessDenied = (error) => {
  const { code, status } = safeError(error);
  return status === 403 || ['AccessDenied', 'Forbidden'].includes(code);
};

const isNotFound = (error) => {
  const { code, status } = safeError(error);
  return status === 404 || ['NotFound', 'NoSuchKey', 'NoSuchBucket'].includes(code);
};

const failureSuffix = (error) => {
  const { code, status } = safeError(error);
  return ` (code=${code}${status === null ? '' : `, HTTP ${status}`})`;
};

const makeClient = ({ accessKeyId, secretAccessKey }) => {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('MissingCredential');
  }
  return new S3Client({
    region: REGION,
    endpoint: getEndpoint(),
    requestChecksumCalculation: 'WHEN_REQUIRED',
    credentials: { accessKeyId, secretAccessKey },
  });
};

const results = {
  'Connexion public': 'échec',
  'Upload public': 'échec',
  'Lecture public': 'échec',
  'Suppression public': 'échec',
  'Connexion staging': 'échec',
  'Upload staging': 'échec',
  'Lecture staging': 'échec',
  'Suppression staging': 'échec',
  'Isolation public vers staging': 'non concluant',
  'Isolation staging vers public': 'non concluant',
};

const report = (label, value) => {
  results[label] = value;
};

const reportFailure = (label, error) => {
  report(label, `échec${failureSuffix(error)}`);
};

const testBucket = async (config) => {
  const client = makeClient(config);
  const prefix = config.name === 'public' ? 'public' : 'staging';
  const connectionLabel = `Connexion ${prefix}`;
  const uploadLabel = `Upload ${prefix}`;
  const readLabel = `Lecture ${prefix}`;
  const deleteLabel = `Suppression ${prefix}`;
  const key = `${TEST_PREFIX}${prefix}-${randomUUID()}.txt`;
  const expected = Buffer.from(`R2 connectivity test ${randomUUID()}`, 'utf8');
  let objectCreated = false;
  let deleteError = null;
  let objectAbsent = false;

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    report(connectionLabel, 'réussi');
  } catch (error) {
    const { status } = safeError(error);
    if (status !== null) {
      report(connectionLabel, 'réussi');
    } else {
      reportFailure(connectionLabel, error);
    }
  }

  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: expected,
      ContentLength: expected.length,
      ContentType: 'text/plain',
      CacheControl: 'no-store',
      IfNoneMatch: '*',
    }));
    objectCreated = true;
    report(connectionLabel, 'réussi');
    report(uploadLabel, 'réussi');

    const response = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }));
    const received = Buffer.from(await response.Body.transformToByteArray());
    report(readLabel, received.equals(expected) ? 'réussi' : 'échec (contenu différent)');
  } catch (error) {
    if (!objectCreated) {
      const { status } = safeError(error);
      if (status !== null) report(connectionLabel, 'réussi');
      reportFailure(uploadLabel, error);
    } else {
      reportFailure(readLabel, error);
    }
  } finally {
    if (objectCreated) {
      try {
        await client.send(new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }));
      } catch (error) {
        deleteError = error;
      }

      try {
        await client.send(new HeadObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }));
      } catch (error) {
        if (isNotFound(error)) {
          objectAbsent = true;
        } else if (!deleteError) {
          deleteError = error;
        }
      }

      if (!objectAbsent && deleteError) {
        try {
          await client.send(new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }));
          await client.send(new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }));
        } catch (error) {
          if (isNotFound(error)) objectAbsent = true;
          else deleteError = error;
        }
      }

      if (objectAbsent) report(deleteLabel, 'réussi');
      else if (deleteError) reportFailure(deleteLabel, deleteError);
      else report(deleteLabel, 'échec (objet toujours présent)');
    } else {
      report(deleteLabel, 'non testé (aucun objet créé)');
    }
  }
};

const testIsolation = async (config) => {
  const client = makeClient(config);
  const label = `Isolation ${config.name} vers ${config.name === 'public' ? 'staging' : 'public'}`;
  const key = `${TEST_PREFIX}isolation-${config.name}-${randomUUID()}.txt`;
  let objectCreated = false;

  try {
    await client.send(new PutObjectCommand({
      Bucket: config.otherBucket,
      Key: key,
      Body: Buffer.from(`R2 isolation test ${randomUUID()}`, 'utf8'),
      ContentType: 'text/plain',
      CacheControl: 'no-store',
      IfNoneMatch: '*',
    }));
    objectCreated = true;
    report(label, 'autorisé — ÉCHEC CRITIQUE');
  } catch (error) {
    if (isAccessDenied(error)) report(label, 'refusé');
    else report(label, `échec/non concluant${failureSuffix(error)}`);
  } finally {
    if (objectCreated) {
      let absent = false;
      let cleanupError = null;
      for (let attempt = 0; attempt < 2 && !absent; attempt += 1) {
        try {
          await client.send(new DeleteObjectCommand({
            Bucket: config.otherBucket,
            Key: key,
          }));
        } catch (error) {
          cleanupError = error;
        }
        try {
          await client.send(new HeadObjectCommand({
            Bucket: config.otherBucket,
            Key: key,
          }));
        } catch (error) {
          if (isNotFound(error)) absent = true;
          else cleanupError = error;
        }
      }
      if (!absent) {
        report(label, `autorisé — ÉCHEC CRITIQUE; nettoyage échoué${cleanupError ? failureSuffix(cleanupError) : ''}`);
      }
    }
  }
};

try {
  const publicClient = makeClient(clients[0]);
  const stagingClient = makeClient(clients[1]);
  clients[0].client = publicClient;
  clients[1].client = stagingClient;

  await testBucket(clients[0]);
  await testBucket(clients[1]);
  await testIsolation(clients[0]);
  await testIsolation(clients[1]);
} catch (error) {
  const { code, status } = safeError(error);
  const detail = `code=${code}${status === null ? '' : `, HTTP ${status}`}`;
  if (results['Connexion public'] === 'échec') report('Connexion public', `échec (${detail})`);
  else if (results['Connexion staging'] === 'échec') report('Connexion staging', `échec (${detail})`);
}

for (const [label, value] of Object.entries(results)) {
  console.log(`${label} : ${value}`);
}

for (const config of clients) config.client?.destroy();

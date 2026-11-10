const fs = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const {
  createR2Client,
  getImageType,
  getR2Config,
  IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} = require('../api/lib/r2');
const { isValidImage } = require('../api/lib/image');

const PAGE_SIZE = 100;
const REFERENCE_TABLES = [
  ['maps', ['image_url'], 'maps'],
  ['utility_points', ['image_url', 'zoom_in_image_url', 'zoom_out_image_url'], 'utility-points'],
  ['clips', ['file_path'], 'clips'],
  ['users', ['profile_picture'], 'users'],
];

const readFlags = (args) => {
  const options = { apply: false, report: path.resolve('r2-migration-report.json') };
  for (const arg of args) {
    if (arg === '--apply') options.apply = true;
    else if (arg.startsWith('--report=')) options.report = path.resolve(arg.slice('--report='.length));
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
};

const decodePath = (value) => value.split('/').map((segment) => decodeURIComponent(segment)).join('/');

const getStorageReference = (value, defaultBucket, supabaseUrl) => {
  if (typeof value !== 'string' || !value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const source = new URL(value);
      if (source.origin !== new URL(supabaseUrl).origin) return null;
      const match = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
        .exec(source.pathname);
      if (!match) return null;
      return { bucket: decodeURIComponent(match[1]), key: decodePath(match[2]) };
    } catch {
      return null;
    }
  }

  const cleanPath = value.replace(/^\/+|\/+$/g, '');
  const bucketPrefix = /^([^/]+)\/(.+)$/.exec(cleanPath);
  if (bucketPrefix && ['maps', 'utility-points', 'clips', 'users'].includes(bucketPrefix[1])) {
    return { bucket: bucketPrefix[1], key: decodePath(bucketPrefix[2]) };
  }
  return { bucket: defaultBucket, key: decodePath(cleanPath) };
};

const listObjectsRecursively = async (storage, bucket, prefix = '') => {
  const objects = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;

    for (const entry of data || []) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id && entry.metadata) {
        objects.push({
          key,
          size: Number(entry.metadata.size || 0),
          contentType: entry.metadata.mimetype || null,
        });
      } else {
        objects.push(...await listObjectsRecursively(storage, bucket, key));
      }
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return objects;
};

const getReferences = async (supabase, supabaseUrl) => {
  const references = new Map();
  for (const [table, columns, defaultBucket] of REFERENCE_TABLES) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(table)
        .select(`id,${columns.join(',')}`)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error(`Could not inventory ${table} image references (${error.code || 'query failed'})`);

      for (const row of data || []) {
        for (const column of columns) {
          const object = getStorageReference(row[column], defaultBucket, supabaseUrl);
          if (!object) continue;
          const objectId = `${object.bucket}/${object.key}`;
          if (!references.has(objectId)) references.set(objectId, []);
          references.get(objectId).push({
            table,
            column,
            id: row.id,
            oldUrl: row[column],
          });
        }
      }
      if (!data || data.length < PAGE_SIZE) break;
    }
  }
  return references;
};

const readBody = async (body) => {
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const getStoredImageType = (bytes, expectedType) => {
  const detectedType = getImageType(bytes.subarray(0, 32));
  return detectedType && (!expectedType || detectedType === expectedType) ? detectedType : null;
};

const makePublicUrl = (publicUrl, key) => (
  `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
);

const isSafeStorageKey = (key) => (
  typeof key === 'string'
  && key.length <= 1024
  && key.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
);

const updateReference = async (supabase, reference, newUrl) => {
  const { data, error } = await supabase
    .from(reference.table)
    .update({ [reference.column]: newUrl })
    .eq('id', reference.id)
    .eq(reference.column, reference.oldUrl)
    .select('id');
  if (error) throw error;
  return Boolean(data?.length);
};

const migrateObject = async ({
  supabase,
  s3,
  bucket,
  object,
  references,
  config,
  apply,
}) => {
  if (!isSafeStorageKey(object.key)) {
    return { status: 'unsupported', reason: 'Unsafe storage object path' };
  }
  const sourceContentType = object.contentType || IMAGE_TYPES[path.extname(object.key).toLowerCase()];
  const extension = path.extname(object.key).toLowerCase();
  if (!IMAGE_TYPES[extension] || IMAGE_TYPES[extension] !== sourceContentType) {
    return { status: 'unsupported', reason: 'Unsupported extension or Content-Type' };
  }
  if (Number.isSafeInteger(object.size) && object.size > MAX_IMAGE_SIZE) {
    return { status: 'unsupported', reason: 'Image exceeds the maximum supported size' };
  }

  const { data: source, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(object.key);
  if (downloadError) throw new Error(`Supabase download failed (${downloadError.statusCode || downloadError.name || 'unknown'})`);
  const bytes = Buffer.from(await source.arrayBuffer());
  if (
    bytes.length > 50 * 1024 * 1024
    || (object.size > 0 && object.size !== bytes.length)
    || getStoredImageType(bytes, sourceContentType) !== sourceContentType
    || !await isValidImage(bytes, sourceContentType)
  ) {
    return { status: 'unsupported', reason: 'Image content or size did not pass verification' };
  }

  const sha256 = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  if (!apply) return { status: 'planned', sha256, referenceCount: references.length };

  const destinationKey = `legacy/${bucket}/${object.key}`;
  let destinationExists = false;
  try {
    const existing = await s3.send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: destinationKey,
    }));
    destinationExists = true;
    if (existing.Metadata?.sha256 !== sha256 || existing.ContentLength !== bytes.length) {
      throw new Error('Existing R2 object differs from the Supabase source');
    }
  } catch (error) {
    if (error.message === 'Existing R2 object differs from the Supabase source') throw error;
    if (error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) throw error;
  }

  if (!destinationExists) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: destinationKey,
        Body: bytes,
        ContentLength: bytes.length,
        ContentType: sourceContentType,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: { sha256 },
        IfNoneMatch: '*',
      }));
    } catch (error) {
      if (
        error.name !== 'PreconditionFailed'
        && error.Code !== 'PreconditionFailed'
        && error.$metadata?.httpStatusCode !== 412
      ) {
        throw error;
      }
    }

    const existing = await s3.send(new HeadObjectCommand({
      Bucket: config.bucket,
      Key: destinationKey,
    }));
    if (existing.Metadata?.sha256 !== sha256 || existing.ContentLength !== bytes.length) {
      throw new Error('Existing R2 object differs from the Supabase source');
    }
  }

  const verified = await s3.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: destinationKey,
  }));
  const verifiedBytes = await readBody(verified.Body);
  if (
    verifiedBytes.length !== bytes.length
    || require('node:crypto').createHash('sha256').update(verifiedBytes).digest('hex') !== sha256
    || getStoredImageType(verifiedBytes, sourceContentType) !== sourceContentType
    || !await isValidImage(verifiedBytes, sourceContentType)
  ) {
    throw new Error('R2 object verification failed');
  }

  const newUrl = makePublicUrl(config.publicUrl, destinationKey);
  let updatedReferences = 0;
  for (const reference of references) {
    if (await updateReference(supabase, reference, newUrl)) updatedReferences += 1;
  }
  return {
    status: destinationExists ? 'already-copied' : 'copied',
    sha256,
    referenceCount: references.length,
    updatedReferences,
  };
};

const run = async () => {
  const options = readFlags(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node scripts/migrate-supabase-images.js [--apply] [--report=PATH]');
    console.log('Without --apply, this command inventories files and reports planned work only.');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the migration command');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) throw new Error(`Could not inventory Supabase buckets (${bucketsError.statusCode || 'unknown'})`);
  const references = await getReferences(supabase, supabaseUrl);

  let config = null;
  let s3 = null;
  if (options.apply) {
    config = getR2Config();
    s3 = createR2Client(config);
  }

  const report = {
    startedAt: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'inventory-only',
    sourceObjectsAreRetained: true,
    buckets: [],
    objects: [],
    contentDuplicates: [],
    summary: {
      objects: 0,
      bytes: 0,
      planned: 0,
      copied: 0,
      skippedPrivate: 0,
      unsupported: 0,
      failures: 0,
    },
  };
  const hashes = new Map();

  for (const bucket of buckets || []) {
    const objects = await listObjectsRecursively(supabase.storage, bucket.name);
    const bucketReport = {
      name: bucket.name,
      public: bucket.public === true,
      objectCount: objects.length,
      totalBytes: objects.reduce((total, object) => total + object.size, 0),
      referencedObjects: objects.filter((object) => references.has(`${bucket.name}/${object.key}`)).length,
      unreferencedObjects: objects.filter((object) => !references.has(`${bucket.name}/${object.key}`)).length,
    };
    report.buckets.push(bucketReport);

    for (const object of objects) {
      report.summary.objects += 1;
      report.summary.bytes += object.size;
      const objectReferences = references.get(`${bucket.name}/${object.key}`) || [];
      const result = {
        bucket: bucket.name,
        key: object.key,
        size: object.size,
        public: bucket.public === true,
        referenceCount: objectReferences.length,
        references: objectReferences.map(({ table, column, id }) => ({ table, column, id })),
      };

      if (bucket.public !== true) {
        result.status = 'skipped-private';
        result.reason = 'Private access policy cannot be preserved on the configured public R2 domain';
        report.summary.skippedPrivate += 1;
      } else {
        try {
          const outcome = await migrateObject({
            supabase,
            s3,
            bucket: bucket.name,
            object,
            references: objectReferences,
            config,
            apply: options.apply,
          });
          Object.assign(result, outcome);
          if (outcome.sha256) {
            if (hashes.has(outcome.sha256)) {
              report.contentDuplicates.push({
                sha256: outcome.sha256,
                firstObject: hashes.get(outcome.sha256),
                duplicateObject: `${bucket.name}/${object.key}`,
              });
            } else {
              hashes.set(outcome.sha256, `${bucket.name}/${object.key}`);
            }
          }
          if (outcome.status === 'copied' || outcome.status === 'already-copied') {
            report.summary.copied += 1;
          }
          if (outcome.status === 'planned') report.summary.planned += 1;
          if (outcome.status === 'unsupported') report.summary.unsupported += 1;
        } catch (error) {
          result.status = 'failed';
          result.errorCode = error.code || error.name || 'migration-error';
          report.summary.failures += 1;
        }
      }
      report.objects.push(result);
    }
  }

  await fs.writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    mode: report.mode,
    report: options.report,
    summary: report.summary,
    buckets: report.buckets,
  }, null, 2));
  if (report.summary.failures) process.exitCode = 1;
};

if (require.main === module) {
  run().catch((error) => {
    console.error('Image migration did not complete', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });
    process.exitCode = 1;
  });
}

module.exports = {
  getStorageReference,
  getStoredImageType,
  isSafeStorageKey,
  listObjectsRecursively,
  makePublicUrl,
  migrateObject,
};

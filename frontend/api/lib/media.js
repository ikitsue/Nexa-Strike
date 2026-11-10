const { createHash, randomUUID } = require('node:crypto');
const path = require('node:path');
const {
  MAX_IMAGE_SIZE,
  STAGING_CACHE_CONTROL,
  UPLOAD_URL_TTL_SECONDS,
  createR2MediaStorageFromEnv,
  getAllowedImage,
  IMAGE_TYPES,
  getR2Config,
} = require('./r2');
const { isValidImage } = require('./image');
const parseBearerToken = (header) => {
  const match = /^Bearer ([^\s]+)$/.exec(header || '');
  return match ? match[1] : null;
};

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

const getKeyInfo = (key) => {
  const patterns = [
    ['map', new RegExp(`^maps/(${UUID})/(${UUID})\\.(jpg|jpeg|png|gif|webp)$`, 'i')],
    ['utility', new RegExp(`^utility-points/[1-9]\\d{0,8}/(${UUID})/(${UUID})\\.(jpg|jpeg|png|gif|webp)$`, 'i')],
    ['line', new RegExp(`^utility-points/line-images/(${UUID})/(${UUID})\\.(jpg|jpeg|png|gif|webp)$`, 'i')],
    ['clip', new RegExp(`^clips/images/(${UUID})/(${UUID})\\.(jpg|jpeg|png|gif|webp)$`, 'i')],
  ];
  for (const [kind, pattern] of patterns) {
    const match = pattern.exec(key);
    if (match) return { kind, ownerId: match[1] };
  }
  return null;
};

const isLegacyImageKey = (key) => {
  const segments = key.split('/');
  return segments.length >= 3
    && segments[0] === 'legacy'
    && ['maps', 'utility-points', 'clips', 'users'].includes(segments[1])
    && segments.every((segment) => segment && segment !== '.' && segment !== '..')
    && Boolean(IMAGE_TYPES[path.extname(key).toLowerCase()])
    && key.length <= 1024;
};

const extractPublicKey = (value, publicUrl) => {
  if (typeof value !== 'string') return null;

  try {
    const base = new URL(publicUrl);
    const candidate = new URL(value);
    const basePath = base.pathname.replace(/\/+$/, '');
    if (candidate.origin !== base.origin || candidate.search || candidate.hash) return null;
    if (!candidate.pathname.startsWith(`${basePath}/`)) return null;

    const key = candidate.pathname
      .slice(basePath.length + 1)
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');
    if (key.split('/').some((segment) => !segment || segment === '.' || segment === '..')) return null;
    return key;
  } catch {
    return null;
  }
};

const isNotFoundError = (error) => (
  error?.name === 'NotFound'
  || error?.name === 'NoSuchKey'
  || error?.$metadata?.httpStatusCode === 404
);

const isPreconditionFailedError = (error) => (
  error?.name === 'PreconditionFailed'
  || error?.$metadata?.httpStatusCode === 412
);

const getPublicImageStatus = async ({
  storage,
  key,
  expectedType,
  stagingKeyHash,
  expectedHash,
}) => {
  let metadata;
  try {
    metadata = await storage.headPublic(key);
  } catch (error) {
    if (isNotFoundError(error)) return 'missing';
    throw error;
  }

  const validMetadata = Number.isSafeInteger(metadata.ContentLength)
    && metadata.ContentLength > 0
    && metadata.ContentLength <= MAX_IMAGE_SIZE
    && metadata.ContentType === expectedType
    && metadata.Metadata?.stagingkeysha256 === stagingKeyHash
    && /^[a-f0-9]{64}$/i.test(metadata.Metadata?.sha256 || '');
  if (!validMetadata) return 'invalid';

  const bytes = await storage.readPublicImage(key);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (
    bytes.length !== metadata.ContentLength
    || sha256 !== metadata.Metadata.sha256
    || (expectedHash && sha256 !== expectedHash)
    || !await isValidImage(bytes, expectedType)
  ) {
    return 'invalid';
  }
  return 'valid';
};

const deleteUnreferencedImage = async (supabase, storage, key, url) => {
  const { data: deletionState, error: deletionError } = await supabase.rpc(
    'begin_r2_image_deletion',
    { p_url: url },
  );
  if (deletionError) {
    console.error('R2 image deletion authorization failed', { code: deletionError.code });
    return { statusCode: 503, body: { error: 'Could not safely remove the image' } };
  }
  if (deletionState === 'referenced') {
    return { statusCode: 409, body: { error: 'Image is still in use' } };
  }
  if (deletionState === 'completed') {
    return { statusCode: 200, body: { success: true, alreadyDeleted: true } };
  }
  if (!['ready', 'pending'].includes(deletionState)) {
    console.error('R2 deletion returned an invalid state');
    return { statusCode: 503, body: { error: 'Could not safely remove the image' } };
  }

  try {
    await storage.headPublic(key);
    await storage.deletePublic(key);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  const { data: deletionCompleted, error: completionError } = await supabase.rpc(
    'complete_r2_image_deletion',
    { p_url: url },
  );
  if (completionError || deletionCompleted !== true) {
    console.error('R2 image deletion finalization failed', { code: completionError?.code });
    return { statusCode: 503, body: { error: 'Could not safely remove the image' } };
  }
  return { statusCode: 200, body: { success: true } };
};

const createMediaHandler = ({
  env = process.env,
  createSupabaseClient,
  createStorage = createR2MediaStorageFromEnv,
  consumeRateLimit = async (supabase) => {
    const { data, error } = await supabase.rpc('consume_r2_upload_rate_limit');
    if (error) throw error;
    return data === true;
  },
} = {}) => async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = parseBearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Media API is missing Supabase server configuration');
    return res.status(503).json({ error: 'Media service is not configured' });
  }
  if (typeof createSupabaseClient !== 'function') {
    ({ createClient: createSupabaseClient } = require('@supabase/supabase-js'));
  }

  let supabase;
  let user;
  let profile;
  try {
    supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id || !data.user.email) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    user = data.user;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id,role,banned')
      .eq('email', user.email)
      .single();
    if (profileError || !userProfile) {
      console.error('Media API could not load the authenticated profile', {
        code: profileError?.code,
      });
      return res.status(403).json({ error: 'User profile is unavailable' });
    }
    profile = userProfile;
  } catch (error) {
    console.error('Media API authentication failed', { name: error?.name, code: error?.code });
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }

  if (profile.banned) return res.status(403).json({ error: 'Account is not permitted to upload media' });

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const requireAdmin = (kind) => {
    if (kind !== 'clip' && profile.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return false;
    }
    return true;
  };

  if (body.action === 'presign') {
    const kind = body.kind;
    if (!['map', 'utility', 'line', 'clip'].includes(kind)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }
    if (!requireAdmin(kind)) return undefined;

    const image = getAllowedImage({
      extension: body.extension,
      contentType: body.contentType,
      size: body.size,
    });
    if (!image) return res.status(400).json({ error: 'Unsupported or invalid image file' });

    const mapId = body.mapId == null ? null : String(body.mapId);
    if (kind === 'utility' && mapId && !/^[1-9]\d{0,8}$/.test(mapId)) {
      return res.status(400).json({ error: 'Invalid map identifier' });
    }
    if (kind === 'utility' && !mapId) {
      return res.status(400).json({ error: 'Map identifier is required' });
    }
    try {
      if (!await consumeRateLimit(supabase, user.id)) {
        return res.status(429).json({ error: 'Upload limit reached. Try again later.' });
      }
    } catch (error) {
      console.error('Global image upload rate limit failed', { code: error?.code });
      return res.status(503).json({ error: 'Upload service is temporarily unavailable' });
    }

    const id = randomUUID();
    const keyPrefix = {
      map: 'maps',
      utility: `utility-points/${mapId}`,
      line: 'utility-points/line-images',
      clip: 'clips/images',
    }[kind];
    const key = `${keyPrefix}/${user.id}/${id}${image.extension}`;

    try {
      const storage = createStorage(env);
      const uploadUrl = await storage.presign({
        key,
        contentType: image.contentType,
        size: body.size,
      });
      return res.status(200).json({
        uploadUrl,
        key,
        headers: {
          'Content-Type': image.contentType,
          'Cache-Control': STAGING_CACHE_CONTROL,
          'If-None-Match': '*',
        },
        expiresIn: UPLOAD_URL_TTL_SECONDS,
      });
    } catch (error) {
      console.error('R2 upload URL generation failed', { name: error?.name, code: error?.code });
      return res.status(503).json({ error: 'Could not prepare image upload' });
    }
  }

  if (body.action === 'complete') {
    const key = body.key;
    const keyInfo = typeof key === 'string' ? getKeyInfo(key) : null;
    if (!keyInfo) return res.status(400).json({ error: 'Invalid image upload' });
    const { kind } = keyInfo;
    if (keyInfo.ownerId !== user.id) {
      return res.status(403).json({ error: 'Image upload is not owned by this user' });
    }
    if (!requireAdmin(kind)) return undefined;

    try {
      const storage = createStorage(env);
      const extension = path.extname(key).toLowerCase();
      const expectedType = IMAGE_TYPES[extension];
      if (!expectedType) return res.status(400).json({ error: 'Invalid image upload' });

      const publicKey = storage.publicKey(key);
      const stagingKeyHash = createHash('sha256').update(key).digest('hex');
      let metadata;
      try {
        metadata = await storage.headStaging(key);
      } catch (error) {
        if (!isNotFoundError(error)) throw error;

        const publishedStatus = await getPublicImageStatus({
          storage,
          key: publicKey,
          expectedType,
          stagingKeyHash,
        });
        if (publishedStatus === 'valid') {
          return res.status(200).json({ key: publicKey, url: storage.publicUrl(publicKey) });
        }
        if (publishedStatus === 'invalid') {
          const deletion = await deleteUnreferencedImage(
            supabase,
            storage,
            publicKey,
            storage.publicUrl(publicKey),
          );
          if (deletion.statusCode !== 200) {
            console.error('Invalid public image cleanup was not completed');
          }
          return res.status(503).json({ error: 'Could not verify published image' });
        }
        return res.status(404).json({ error: 'Staged image was not found' });
      }

      const validSize = Number.isSafeInteger(metadata.ContentLength)
        && metadata.ContentLength > 0
        && metadata.ContentLength <= MAX_IMAGE_SIZE;
      if (!validSize || metadata.ContentType !== expectedType) {
        try {
          await storage.deleteStaging(key);
        } catch (error) {
          console.error('Invalid staging image cleanup failed', { name: error?.name, code: error?.code });
        }
        return res.status(400).json({ error: 'Uploaded file is not a supported image' });
      }

      const bytes = await storage.readStagingImage(key);
      if (bytes.length !== metadata.ContentLength || !await isValidImage(bytes, expectedType)) {
        try {
          await storage.deleteStaging(key);
        } catch (error) {
          console.error('Invalid staging image cleanup failed', { name: error?.name, code: error?.code });
        }
        return res.status(400).json({ error: 'Uploaded file is not a supported image' });
      }

      const sha256 = createHash('sha256').update(bytes).digest('hex');
      try {
        await storage.putPublic({
          key: publicKey,
          bytes,
          contentType: expectedType,
          sha256,
          stagingKeyHash,
        });
      } catch (error) {
        if (!isPreconditionFailedError(error)) throw error;
      }

      const publishedStatus = await getPublicImageStatus({
        storage,
        key: publicKey,
        expectedType,
        stagingKeyHash,
        expectedHash: sha256,
      });
      if (publishedStatus !== 'valid') {
        if (publishedStatus === 'invalid') {
          const deletion = await deleteUnreferencedImage(
            supabase,
            storage,
            publicKey,
            storage.publicUrl(publicKey),
          );
          if (deletion.statusCode !== 200) {
            console.error('Unverified public image cleanup was not completed');
          }
        }
        return res.status(503).json({ error: 'Could not verify published image' });
      }

      try {
        await storage.deleteStaging(key);
      } catch (error) {
        console.error('Published image staging cleanup failed', { name: error?.name, code: error?.code });
      }
      return res.status(200).json({ key: publicKey, url: storage.publicUrl(publicKey) });
    } catch (error) {
      console.error('R2 image verification failed', { name: error?.name, code: error?.code });
      return res.status(503).json({ error: 'Could not verify uploaded image' });
    }
  }

  if (body.action === 'delete' || body.action === 'discard') {
    let key;
    let url;
    let publicUrl;
    let keyInfo;
    if (body.action === 'discard') {
      key = body.key;
      keyInfo = typeof key === 'string' ? getKeyInfo(key) : null;
      if (!keyInfo || keyInfo.ownerId !== user.id) {
        return res.status(403).json({ error: 'Image upload is not owned by this user' });
      }
      if (!requireAdmin(keyInfo.kind)) return undefined;
    } else {
      try {
        publicUrl = getR2Config(env).publicUrl;
      } catch (error) {
        console.error('R2 deletion is not configured', { name: error?.name });
        return res.status(503).json({ error: 'Media service is not configured' });
      }
      key = extractPublicKey(body.url, publicUrl);
      keyInfo = key && getKeyInfo(key);
      if (!keyInfo && !(key && isLegacyImageKey(key))) {
        return res.status(400).json({ error: 'Invalid image reference' });
      }
      const ownerClip = keyInfo?.kind === 'clip' && keyInfo.ownerId === user.id;
      if (profile.role !== 'admin' && !ownerClip) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      url = body.url;
    }

    try {
      const storage = createStorage(env);
      if (body.action === 'discard') {
        await storage.deleteStaging(key);
        const publicKey = storage.publicKey(key);
        try {
          await storage.headPublic(publicKey);
        } catch (error) {
          if (isNotFoundError(error)) return res.status(200).json({ success: true });
          throw error;
        }

        const deletion = await deleteUnreferencedImage(
          supabase,
          storage,
          publicKey,
          storage.publicUrl(publicKey),
        );
        if (deletion.statusCode === 409) {
          return res.status(200).json({ success: true });
        }
        return res.status(deletion.statusCode).json(deletion.body);
      }

      const canonicalUrl = storage.publicUrl(key);
      if (url !== canonicalUrl) {
        return res.status(400).json({ error: 'Invalid image reference' });
      }
      url = canonicalUrl;
      const result = await deleteUnreferencedImage(supabase, storage, key, url);
      return res.status(result.statusCode).json(result.body);
    } catch (error) {
      console.error('R2 image deletion failed', { name: error?.name, code: error?.code });
      return res.status(503).json({ error: 'Could not remove the image' });
    }
  }

  return res.status(400).json({ error: 'Unsupported media action' });
};

module.exports = {
  createMediaHandler,
  extractPublicKey,
  getKeyInfo,
  isLegacyImageKey,
};

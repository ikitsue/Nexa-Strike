const encodeObjectPath = (objectPath) => (
  objectPath.split('/').map((segment) => encodeURIComponent(segment)).join('/')
);

export const getStoragePublicUrl = (filePath, supabaseUrl, bucketName) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;

  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
  if (filePath.startsWith('/') || cleanPath.startsWith('uploads/') || cleanPath.startsWith('images/')) {
    return filePath.startsWith('/') ? filePath : `/${cleanPath}`;
  }

  if (bucketName) {
    const objectPath = cleanPath.startsWith(`${bucketName}/`)
      ? cleanPath.slice(bucketName.length + 1)
      : cleanPath;
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodeObjectPath(objectPath)}`;
  }

  const bucketPath = [
    { prefix: 'utility-points/', bucket: 'utility-points', removePrefix: true },
    { prefix: 'line-images/', bucket: 'utility-points', removePrefix: false },
    { prefix: 'maps/', bucket: 'maps', removePrefix: true },
    { prefix: 'clips/', bucket: 'clips', removePrefix: true },
  ].find(({ prefix }) => cleanPath.startsWith(prefix));
  if (bucketPath) {
    const objectPath = bucketPath.removePrefix
      ? cleanPath.slice(bucketPath.prefix.length)
      : cleanPath;
    return `${supabaseUrl}/storage/v1/object/public/${bucketPath.bucket}/${encodeObjectPath(objectPath)}`;
  }

  const inferredBucket = /^\d+\/\d+-/.test(cleanPath) ? 'utility-points' : 'maps';
  return `${supabaseUrl}/storage/v1/object/public/${inferredBucket}/${encodeObjectPath(cleanPath)}`;
};

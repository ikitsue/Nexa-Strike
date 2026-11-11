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

  if (cleanPath.startsWith('utility-points/') || cleanPath.startsWith('maps/') || cleanPath.startsWith('clips/')) {
    const [pathBucket, ...segments] = cleanPath.split('/');
    return `${supabaseUrl}/storage/v1/object/public/${pathBucket}/${encodeObjectPath(segments.join('/'))}`;
  }

  const inferredBucket = /^\d+\/\d+-/.test(cleanPath) ? 'utility-points' : 'maps';
  return `${supabaseUrl}/storage/v1/object/public/${inferredBucket}/${encodeObjectPath(cleanPath)}`;
};

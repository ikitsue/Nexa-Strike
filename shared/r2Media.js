const PRODUCTION_MEDIA_API_URL = 'https://nexa-strike.com/api/media';

const getMediaApiUrl = () => {
  const configuredUrl = import.meta.env?.VITE_MEDIA_API_URL;
  if (configuredUrl) return configuredUrl;
  if (
    typeof window !== 'undefined'
    && window.location.protocol !== 'file:'
    && !(window.location.hostname === '127.0.0.1' && window.location.port === '43127')
  ) {
    return `${window.location.origin}/api/media`;
  }
  return PRODUCTION_MEDIA_API_URL;
};

const getAccessToken = async (supabase) => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('You must be signed in to upload images');
  return data.session.access_token;
};

const requestMediaApi = async (supabase, payload) => {
  const token = await getAccessToken(supabase);
  let response;
  try {
    response = await fetch(getMediaApiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Media service is unavailable. Please try again.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Media service returned an invalid response');
  }
  if (!response.ok) throw new Error(result.error || 'Media request failed');
  return result;
};

export const uploadImageToR2 = async (supabase, file, kind, mapId = null) => {
  const extension = file?.name?.slice(file.name.lastIndexOf('.')).toLowerCase() || '';
  const contentType = file?.type || '';
  const size = file?.size;
  const { uploadUrl, key, headers } = await requestMediaApi(supabase, {
    action: 'presign',
    kind,
    mapId,
    extension,
    contentType,
    size,
  });

  const discardUpload = async () => {
    try {
      await requestMediaApi(supabase, { action: 'discard', key });
    } catch (cleanupError) {
      console.error('Unverified image cleanup was not completed:', cleanupError?.message || 'Unknown error');
    }
  };

  let uploadResponse;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });
  } catch {
    await discardUpload();
    throw new Error('Image upload failed. Please try again.');
  }
  if (!uploadResponse.ok) {
    await discardUpload();
    throw new Error('Image upload failed. Please try again.');
  }

  try {
    return await requestMediaApi(supabase, { action: 'complete', key });
  } catch (error) {
    await discardUpload();
    throw error;
  }
};

export const deleteR2Image = async (supabase, url) => {
  if (!url || typeof url !== 'string') return;
  if (!/^https:\/\//i.test(url) || url.startsWith(import.meta.env?.VITE_SUPABASE_URL || '')) return;
  await requestMediaApi(supabase, { action: 'delete', url });
};

export const deleteR2Images = async (supabase, urls) => {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  const results = await Promise.allSettled(uniqueUrls.map((url) => deleteR2Image(supabase, url)));
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('Image cleanup was not completed:', result.reason?.message || 'Unknown error');
    }
  });
};

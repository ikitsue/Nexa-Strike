import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStoragePublicUrl } from './storageUrls.mjs';

const SUPABASE_URL = 'https://project.supabase.co';

test('resolves clip video paths to the clips bucket', () => {
  assert.equal(
    getStoragePublicUrl('1760000000000-tournament.mp4', SUPABASE_URL, 'clips'),
    'https://project.supabase.co/storage/v1/object/public/clips/1760000000000-tournament.mp4',
  );
});

test('preserves the clips bucket when a path already includes its bucket name', () => {
  assert.equal(
    getStoragePublicUrl('clips/1760000000000-tournament.mp4', SUPABASE_URL, 'clips'),
    'https://project.supabase.co/storage/v1/object/public/clips/1760000000000-tournament.mp4',
  );
});

test('keeps map and utility storage path inference intact', () => {
  assert.equal(
    getStoragePublicUrl('mirage night.png', SUPABASE_URL),
    'https://project.supabase.co/storage/v1/object/public/maps/mirage%20night.png',
  );
  assert.equal(
    getStoragePublicUrl('42/1760000000000-lineup.mp4', SUPABASE_URL),
    'https://project.supabase.co/storage/v1/object/public/utility-points/42/1760000000000-lineup.mp4',
  );
});

test('resolves line zoom paths from the utility-points bucket', () => {
  assert.equal(
    getStoragePublicUrl('line-images/123/zoom-in.png', SUPABASE_URL),
    'https://project.supabase.co/storage/v1/object/public/utility-points/line-images/123/zoom-in.png',
  );
  assert.equal(
    getStoragePublicUrl('line-images/zoom out.webp', SUPABASE_URL),
    'https://project.supabase.co/storage/v1/object/public/utility-points/line-images/zoom%20out.webp',
  );
});

test('preserves explicit bucket-prefixed storage paths', () => {
  for (const [path, bucket] of [
    ['maps/mirage.png', 'maps'],
    ['utility-points/42/smoke.png', 'utility-points'],
    ['clips/clip.mp4', 'clips'],
  ]) {
    const [pathBucket, ...segments] = path.split('/');
    assert.equal(
      getStoragePublicUrl(path, SUPABASE_URL),
      `${SUPABASE_URL}/storage/v1/object/public/${pathBucket}/${segments.join('/')}`,
    );
    assert.equal(
      getStoragePublicUrl(path, SUPABASE_URL, bucket),
      `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${segments.join('/')}`,
    );
  }
});

test('keeps numeric historical utility paths in the utility-points bucket', () => {
  assert.equal(
    getStoragePublicUrl('42/1760000000000-lineup.mp4', SUPABASE_URL),
    'https://project.supabase.co/storage/v1/object/public/utility-points/42/1760000000000-lineup.mp4',
  );
});

test('leaves absolute Supabase, R2, and unknown relative paths unchanged in their existing forms', () => {
  assert.equal(
    getStoragePublicUrl(
      'https://project.supabase.co/storage/v1/object/public/maps/mirage.png',
      SUPABASE_URL,
    ),
    'https://project.supabase.co/storage/v1/object/public/maps/mirage.png',
  );
  assert.equal(
    getStoragePublicUrl('https://images.nexa-strike.com/maps/mirage.png', SUPABASE_URL),
    'https://images.nexa-strike.com/maps/mirage.png',
  );
  assert.equal(
    getStoragePublicUrl('misc/future-media.png', SUPABASE_URL),
    'https://project.supabase.co/storage/v1/object/public/maps/misc/future-media.png',
  );
});

test('leaves absolute and local media URLs unchanged', () => {
  assert.equal(
    getStoragePublicUrl('https://images.nexa-strike.com/clips/images/test.png', SUPABASE_URL, 'clips'),
    'https://images.nexa-strike.com/clips/images/test.png',
  );
  assert.equal(getStoragePublicUrl('/images/logo.png', SUPABASE_URL), '/images/logo.png');
  assert.equal(getStoragePublicUrl('images/logo.png', SUPABASE_URL), '/images/logo.png');
});

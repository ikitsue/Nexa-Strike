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

test('leaves absolute and local media URLs unchanged', () => {
  assert.equal(
    getStoragePublicUrl('https://images.nexa-strike.com/clips/images/test.png', SUPABASE_URL, 'clips'),
    'https://images.nexa-strike.com/clips/images/test.png',
  );
  assert.equal(getStoragePublicUrl('/images/logo.png', SUPABASE_URL), '/images/logo.png');
  assert.equal(getStoragePublicUrl('images/logo.png', SUPABASE_URL), '/images/logo.png');
});

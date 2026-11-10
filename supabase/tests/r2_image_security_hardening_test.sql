BEGIN;
SELECT plan(13);

INSERT INTO public.users (email, username, role)
VALUES
  ('r2-hardening-admin@example.invalid', 'r2_hardening_admin', 'admin'),
  ('r2-hardening-user@example.invalid', 'r2_hardening_user', 'user');
INSERT INTO public.maps (name, image_url)
VALUES (
  'R2 referenced image test',
  'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000003.png'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.consume_r2_upload_rate_limit()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.consume_r2_upload_rate_limit()', 'EXECUTE'),
  'only authenticated users can call the upload limiter'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'private.r2_upload_rate_limits', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'private.r2_image_deletions', 'SELECT'),
  'private rate and deletion state is not directly readable'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"r2-hardening-admin@example.invalid","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM generate_series(1, 10) WHERE public.consume_r2_upload_rate_limit()),
  10::bigint,
  'the shared rate limit permits ten uploads in the window'
);
SELECT ok(
  NOT public.consume_r2_upload_rate_limit(),
  'the shared rate limit rejects the eleventh upload'
);

RESET ROLE;
UPDATE private.r2_upload_rate_limits
SET window_started_at = pg_catalog.now() - INTERVAL '61 minutes'
WHERE user_id = '10000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"r2-hardening-admin@example.invalid","role":"authenticated"}';
SELECT ok(
  public.consume_r2_upload_rate_limit(),
  'the shared rate limit resets after the hour window'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"r2-hardening-admin@example.invalid","role":"authenticated"}';

SELECT is(
  public.begin_r2_image_deletion(
    'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000002.png'
  ),
  'ready',
  'an unreferenced image enters pending deletion'
);
SELECT is(
  public.begin_r2_image_deletion(
    'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000003.png'
  ),
  'referenced',
  'a referenced image cannot enter deletion'
);
SELECT throws_ok(
  $$INSERT INTO public.maps (name, image_url)
    VALUES (
      'R2 deletion race test',
      'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000002.png'
    )$$,
  '55000',
  NULL,
  'a reference cannot be created while deletion is pending'
);
SELECT ok(
  public.complete_r2_image_deletion(
    'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000002.png'
  ),
  'a pending deletion can be completed'
);
SELECT throws_ok(
  $$INSERT INTO public.maps (name, image_url)
    VALUES (
      'R2 deleted reference test',
      'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000002.png'
    )$$,
  '55000',
  NULL,
  'a completed deletion cannot be re-referenced'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"123e4567-e89b-42d3-a456-426614174002","email":"r2-hardening-user@example.invalid","role":"authenticated"}';
SELECT throws_ok(
  $$SELECT public.begin_r2_image_deletion(
    'https://images.example.com/maps/10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000003.png'
  )$$,
  '42501',
  NULL,
  'non-admin users cannot delete another user image'
);
SELECT is(
  public.begin_r2_image_deletion(
    'https://images.example.com/clips/images/123e4567-e89b-42d3-a456-426614174002/123e4567-e89b-42d3-a456-426614174004.png'
  ),
  'ready',
  'a user may clean up their own unreferenced clip image'
);
SELECT throws_ok(
  $$SELECT public.begin_r2_image_deletion(
    'https://images.example.com/clips/images/10000000-0000-0000-0000-000000000001/123e4567-e89b-42d3-a456-426614174004.png'
  )$$,
  '42501',
  NULL,
  'a user cannot delete another user clip image'
);

SELECT * FROM finish();
ROLLBACK;

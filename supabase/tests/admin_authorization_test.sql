BEGIN;
SELECT plan(17);

INSERT INTO public.users (email, username, role)
VALUES
  ('rls-normal@example.invalid', 'rls_normal_user', 'user'),
  ('rls-admin@example.invalid', 'rls_admin_user', 'admin');

INSERT INTO public.suggestions (title, description, user_id, status)
SELECT
  'RLS authorization test',
  'Temporary pgTAP fixture',
  id,
  'pending'
FROM public.users
WHERE email = 'rls-normal@example.invalid';

SELECT set_config(
  'nexastrike.test_user_id',
  (SELECT id::text FROM public.users WHERE email = 'rls-normal@example.invalid'),
  true
);
SELECT set_config(
  'nexastrike.test_suggestion_id',
  (SELECT id::text FROM public.suggestions WHERE title = 'RLS authorization test'),
  true
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.users', 'SELECT'),
  'anonymous clients cannot read user records'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.users', 'password', 'SELECT'),
  'authenticated clients cannot read stored passwords'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.users', 'refresh_token', 'SELECT'),
  'authenticated clients cannot read refresh tokens'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.users', 'role', 'INSERT'),
  'authenticated clients cannot supply a role when creating a profile'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.users', 'DELETE'),
  'authenticated clients cannot delete user records'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"rls-normal@example.invalid","role":"authenticated"}';

SELECT ok(NOT private.is_admin(), 'regular users are not administrators');
SELECT is(
  (SELECT count(*) FROM public.users),
  1::bigint,
  'regular users can read only their own user record'
);
SELECT throws_ok(
  format(
    'UPDATE public.users SET role = %L WHERE id = %s',
    'admin',
    current_setting('nexastrike.test_user_id')
  ),
  '42501',
  NULL,
  'regular users cannot promote themselves'
);
SELECT throws_ok(
  $$INSERT INTO public.users (email, username, role)
    VALUES ('rls-escalation@example.invalid', 'rls_escalation', 'admin')$$,
  '42501',
  NULL,
  'regular users cannot create an administrator profile'
);
SELECT throws_ok(
  format(
    'UPDATE public.users SET banned = true WHERE id = %s',
    current_setting('nexastrike.test_user_id')
  ),
  '42501',
  NULL,
  'regular users cannot change their ban status'
);
SELECT lives_ok(
  format(
    'UPDATE public.suggestions SET title = %L WHERE id = %s',
    'Edited by owner',
    current_setting('nexastrike.test_suggestion_id')
  ),
  'suggestion owners may edit their own content'
);
SELECT throws_ok(
  format(
    'UPDATE public.suggestions SET status = %L WHERE id = %s',
    'approved',
    current_setting('nexastrike.test_suggestion_id')
  ),
  '42501',
  NULL,
  'suggestion owners cannot approve their own suggestions'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000002","email":"rls-admin@example.invalid","role":"authenticated"}';

SELECT ok(private.is_admin(), 'trusted admin profile is recognized');
SELECT is(
  (SELECT count(*) FROM public.users),
  2::bigint,
  'administrators can list user records'
);
SELECT lives_ok(
  format(
    'UPDATE public.suggestions SET status = %L WHERE id = %s',
    'approved',
    current_setting('nexastrike.test_suggestion_id')
  ),
  'administrators can moderate suggestions'
);
SELECT lives_ok(
  $$INSERT INTO public.maps (name) VALUES ('RLS authorization test map')$$,
  'administrators can create maps'
);

SELECT * FROM finish();
ROLLBACK;

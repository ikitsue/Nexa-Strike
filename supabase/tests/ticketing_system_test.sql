BEGIN;
SELECT plan(13);

INSERT INTO public.users (email, username, role)
VALUES
  ('ticket-user@example.invalid', 'ticket_test_user', 'user'),
  ('ticket-admin@example.invalid', 'ticket_test_admin', 'admin');

INSERT INTO public.tickets (
  owner_id, reporter_email, title, message, category, status
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'ticket-user@example.invalid',
    'Ticket owned by user',
    'Original message',
    'bug',
    'resolved'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'other-user@example.invalid',
    'Ticket owned by another user',
    'Private message',
    'account',
    'open'
  );

INSERT INTO public.ticket_messages (
  ticket_id, author_id, author_email, author_role, message
)
SELECT
  id,
  '10000000-0000-0000-0000-000000000001',
  'ticket-user@example.invalid',
  'customer',
  'Original reply'
FROM public.tickets
WHERE title = 'Ticket owned by user';

SELECT set_config(
  'nexastrike.ticket_test_ticket_id',
  (SELECT id::text FROM public.tickets WHERE title = 'Ticket owned by user'),
  true
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.tickets', 'SELECT'),
  'anonymous visitors cannot read tickets directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.ticket_messages', 'SELECT'),
  'anonymous visitors cannot read ticket messages'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.tickets', 'INSERT'),
  'anonymous visitors must create tickets through the CAPTCHA-verified function'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.tickets', 'INSERT'),
  'signed-in users cannot bypass ticket creation validation'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.ticket_messages', 'INSERT'),
  'signed-in users can submit replies subject to row policies'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"ticket-user@example.invalid","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM public.tickets),
  1::bigint,
  'ticket owners can see only their own tickets'
);
SELECT is(
  (SELECT count(*) FROM public.ticket_messages),
  1::bigint,
  'ticket owners can see messages on their tickets'
);
SELECT lives_ok(
  format(
    'INSERT INTO public.ticket_messages (ticket_id, author_id, author_email, author_role, message) VALUES (%L, auth.uid(), auth.email(), %L, %L)',
    current_setting('nexastrike.ticket_test_ticket_id'),
    'customer',
    'A follow-up'
  ),
  'ticket owners can reply to their own tickets'
);
SELECT is(
  (SELECT status FROM public.tickets WHERE id::text = current_setting('nexastrike.ticket_test_ticket_id')),
  'open',
  'a customer reply automatically reopens a resolved ticket'
);
SELECT throws_ok(
  format(
    'INSERT INTO public.ticket_messages (ticket_id, author_id, author_email, author_role, message) VALUES (%L, auth.uid(), auth.email(), %L, %L)',
    current_setting('nexastrike.ticket_test_ticket_id'),
    'admin',
    'Forged staff reply'
  ),
  '42501',
  NULL,
  'customers cannot forge staff replies'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000003","email":"other-user@example.invalid","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM public.tickets),
  1::bigint,
  'another user cannot read the first user ticket'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000002","email":"ticket-admin@example.invalid","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM public.tickets),
  2::bigint,
  'administrators can manage all tickets'
);
SELECT is(
  (SELECT count(*) FROM public.ticket_messages),
  2::bigint,
  'administrators can read all conversation messages'
);

SELECT * FROM finish();
ROLLBACK;

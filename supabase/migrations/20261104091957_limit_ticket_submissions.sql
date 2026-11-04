CREATE OR REPLACE FUNCTION public.create_ticket_rate_limited(
  ticket_owner_id UUID,
  ticket_reporter_name VARCHAR,
  ticket_reporter_email VARCHAR,
  ticket_title VARCHAR,
  ticket_message TEXT,
  ticket_category TEXT,
  ticket_priority TEXT
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  submission_key TEXT;
  recent_count BIGINT;
  daily_count BIGINT;
  ticket_id UUID;
BEGIN
  IF ticket_owner_id IS NOT NULL THEN
    submission_key := 'user:' || ticket_owner_id::TEXT;
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(submission_key, 0)
    );

    SELECT count(*)
    INTO recent_count
    FROM public.tickets
    WHERE owner_id = ticket_owner_id
      AND created_at >= pg_catalog.now() - INTERVAL '15 minutes';

    SELECT count(*)
    INTO daily_count
    FROM public.tickets
    WHERE owner_id = ticket_owner_id
      AND created_at >= pg_catalog.now() - INTERVAL '1 day';
  ELSE
    submission_key := 'email:' || pg_catalog.lower(pg_catalog.btrim(ticket_reporter_email));
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(submission_key, 0)
    );

    SELECT count(*)
    INTO recent_count
    FROM public.tickets
    WHERE owner_id IS NULL
      AND pg_catalog.lower(reporter_email) = pg_catalog.lower(ticket_reporter_email)
      AND created_at >= pg_catalog.now() - INTERVAL '15 minutes';

    SELECT count(*)
    INTO daily_count
    FROM public.tickets
    WHERE owner_id IS NULL
      AND pg_catalog.lower(reporter_email) = pg_catalog.lower(ticket_reporter_email)
      AND created_at >= pg_catalog.now() - INTERVAL '1 day';
  END IF;

  IF recent_count >= 5 OR daily_count >= 20 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.tickets (
    owner_id,
    reporter_name,
    reporter_email,
    title,
    message,
    category,
    priority
  )
  VALUES (
    ticket_owner_id,
    ticket_reporter_name,
    ticket_reporter_email,
    ticket_title,
    ticket_message,
    ticket_category,
    ticket_priority
  )
  RETURNING id INTO ticket_id;

  RETURN ticket_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_ticket_rate_limited(
  UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ticket_rate_limited(
  UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT
) TO service_role;
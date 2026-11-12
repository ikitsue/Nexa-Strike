CREATE TABLE private.r2_upload_rate_limits (
  user_id uuid PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count BETWEEN 1 AND 11)
);

ALTER TABLE private.r2_upload_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.r2_upload_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.r2_upload_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_r2_upload_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  current_count integer;
BEGIN
  IF authenticated_user_id IS NULL
    OR auth.email() IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.users AS user_profile
      WHERE user_profile.email = auth.email()
        AND COALESCE(user_profile.banned, false) = false
    )
  THEN
    RAISE EXCEPTION 'A permitted authenticated profile is required'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO private.r2_upload_rate_limits AS current_limit (
    user_id,
    window_started_at,
    request_count
  )
  VALUES (authenticated_user_id, pg_catalog.now(), 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN current_limit.window_started_at <= pg_catalog.now() - INTERVAL '1 hour'
        THEN pg_catalog.now()
      ELSE current_limit.window_started_at
    END,
    request_count = CASE
      WHEN current_limit.window_started_at <= pg_catalog.now() - INTERVAL '1 hour'
        THEN 1
      WHEN current_limit.request_count < 10
        THEN current_limit.request_count + 1
      ELSE 11
    END
  RETURNING request_count INTO current_count;

  RETURN current_count <= 10;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_r2_upload_rate_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_r2_upload_rate_limit() TO authenticated;

CREATE TABLE private.r2_image_deletions (
  public_url text PRIMARY KEY CHECK (octet_length(public_url) <= 2048),
  status text NOT NULL CHECK (status IN ('pending', 'completed')),
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  completed_at timestamptz
);

ALTER TABLE private.r2_image_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.r2_image_deletions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.r2_image_deletions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_delete_r2_image(p_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF p_url IS NULL
    OR octet_length(p_url) > 2048
    OR p_url !~ '^https://[^/?#]+/[^?#]+$'
  THEN
    RETURN false;
  END IF;

  IF private.is_admin() THEN
    RETURN true;
  END IF;

  RETURN auth.uid() IS NOT NULL
    AND auth.email() IS NOT NULL
    AND p_url ~ (
      '^https://[^/]+/clips/images/'
      || auth.uid()::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$'
    )
    AND EXISTS (
      SELECT 1
      FROM public.users AS user_profile
      WHERE user_profile.email = auth.email()
        AND COALESCE(user_profile.banned, false) = false
    );
END;
$function$;

REVOKE ALL ON FUNCTION private.can_delete_r2_image(text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.begin_r2_image_deletion(p_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deletion_status text;
BEGIN
  IF NOT private.can_delete_r2_image(p_url) THEN
    RAISE EXCEPTION 'Not authorized to delete this image'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_url, 0));

  SELECT status
  INTO deletion_status
  FROM private.r2_image_deletions
  WHERE public_url = p_url;

  IF FOUND THEN
    RETURN CASE WHEN deletion_status = 'completed' THEN 'completed' ELSE 'pending' END;
  END IF;

  IF EXISTS (SELECT 1 FROM public.maps WHERE image_url = p_url)
    OR EXISTS (SELECT 1 FROM public.utility_points WHERE image_url = p_url)
    OR EXISTS (SELECT 1 FROM public.utility_points WHERE zoom_in_image_url = p_url)
    OR EXISTS (SELECT 1 FROM public.utility_points WHERE zoom_out_image_url = p_url)
    OR EXISTS (SELECT 1 FROM public.clips WHERE file_path = p_url)
    OR EXISTS (SELECT 1 FROM public.users WHERE profile_picture = p_url)
  THEN
    RETURN 'referenced';
  END IF;

  INSERT INTO private.r2_image_deletions (public_url, status, requested_by)
  VALUES (p_url, 'pending', auth.uid());

  RETURN 'ready';
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_r2_image_deletion(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_r2_image_deletion(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_r2_image_deletion(p_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT private.can_delete_r2_image(p_url) THEN
    RAISE EXCEPTION 'Not authorized to complete this image deletion'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_url, 0));

  UPDATE private.r2_image_deletions
  SET status = 'completed',
      completed_at = pg_catalog.now()
  WHERE public_url = p_url
    AND status = 'pending';

  IF FOUND THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM private.r2_image_deletions
    WHERE public_url = p_url
      AND status = 'completed'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_r2_image_deletion(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_r2_image_deletion(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.prevent_reference_to_deleting_r2_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_url text;
  old_url text;
BEGIN
  new_url := to_jsonb(NEW) ->> TG_ARGV[0];
  IF TG_OP = 'UPDATE' THEN
    old_url := to_jsonb(OLD) ->> TG_ARGV[0];
  END IF;

  IF new_url IS NOT NULL AND new_url IS DISTINCT FROM old_url THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new_url, 0));
    IF EXISTS (
      SELECT 1
      FROM private.r2_image_deletions
      WHERE public_url = new_url
    ) THEN
      RAISE EXCEPTION 'Image deletion is pending or already completed'
        USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.prevent_reference_to_deleting_r2_image()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_maps_r2_image_reference ON public.maps;
CREATE TRIGGER guard_maps_r2_image_reference
BEFORE INSERT OR UPDATE OF image_url ON public.maps
FOR EACH ROW
EXECUTE FUNCTION private.prevent_reference_to_deleting_r2_image('image_url');

DROP TRIGGER IF EXISTS guard_utility_points_r2_image_reference ON public.utility_points;
CREATE TRIGGER guard_utility_points_r2_image_reference
BEFORE INSERT OR UPDATE OF image_url ON public.utility_points
FOR EACH ROW
EXECUTE FUNCTION private.prevent_reference_to_deleting_r2_image('image_url');

DROP TRIGGER IF EXISTS guard_utility_points_r2_zoom_in_reference ON public.utility_points;
CREATE TRIGGER guard_utility_points_r2_zoom_in_reference
BEFORE INSERT OR UPDATE OF zoom_in_image_url ON public.utility_points
FOR EACH ROW
EXECUTE FUNCTION private.prevent_reference_to_deleting_r2_image('zoom_in_image_url');

DROP TRIGGER IF EXISTS guard_utility_points_r2_zoom_out_reference ON public.utility_points;
CREATE TRIGGER guard_utility_points_r2_zoom_out_reference
BEFORE INSERT OR UPDATE OF zoom_out_image_url ON public.utility_points
FOR EACH ROW
EXECUTE FUNCTION private.prevent_reference_to_deleting_r2_image('zoom_out_image_url');

DROP TRIGGER IF EXISTS guard_clips_r2_image_reference ON public.clips;
CREATE TRIGGER guard_clips_r2_image_reference
BEFORE INSERT OR UPDATE OF file_path ON public.clips
FOR EACH ROW
EXECUTE FUNCTION private.prevent_reference_to_deleting_r2_image('file_path');

DROP TRIGGER IF EXISTS guard_users_r2_profile_picture_reference ON public.users;
CREATE TRIGGER guard_users_r2_profile_picture_reference
BEFORE INSERT OR UPDATE OF profile_picture ON public.users
FOR EACH ROW
EXECUTE FUNCTION private.prevent_reference_to_deleting_r2_image('profile_picture');
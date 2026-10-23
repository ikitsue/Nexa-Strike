ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500),
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
  ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND auth.email() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.users AS user_profile
      WHERE user_profile.email = auth.email()
        AND user_profile.role = 'admin'
        AND COALESCE(user_profile.banned, false) = false
    );
$function$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION private.guard_user_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF session_user NOT IN ('postgres', 'supabase_admin')
      OR COALESCE(current_setting('role', true), 'none') IN ('anon', 'authenticated')
    THEN
      NEW.role := 'user';
      NEW.banned := false;
      NEW.ban_reason := NULL;
      NEW.banned_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF (
       session_user NOT IN ('postgres', 'supabase_admin')
       OR COALESCE(current_setting('role', true), 'none') IN ('anon', 'authenticated')
     )
    AND NOT private.is_admin()
    AND (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.banned IS DISTINCT FROM OLD.banned
      OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason
      OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
    )
  THEN
    RAISE EXCEPTION 'Only administrators can change privileged user fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_user_privileged_fields()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_secure_users_privileged_fields ON public.users;
CREATE TRIGGER zz_secure_users_privileged_fields
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION private.guard_user_privileged_fields();

CREATE OR REPLACE FUNCTION private.guard_suggestion_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change suggestion status'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_suggestion_status()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_secure_suggestion_status ON public.suggestions;
CREATE TRIGGER zz_secure_suggestion_status
BEFORE UPDATE ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION private.guard_suggestion_status();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utility_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_points FORCE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips FORCE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments FORCE ROW LEVEL SECURITY;

DO $block$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'maps', 'utility_points', 'suggestions', 'clips', 'comments')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  END LOOP;
END;
$block$;

REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  id, email, password, username, steam_id, profile_picture, role,
  created_at, updated_at, refresh_token, last_login, banned, ban_reason, banned_at
) ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE INSERT (
  id, email, password, username, steam_id, profile_picture, role,
  created_at, updated_at, refresh_token, last_login, banned, ban_reason, banned_at
) ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, email, password, username, steam_id, profile_picture, role,
  created_at, updated_at, refresh_token, last_login, banned, ban_reason, banned_at
) ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, email, username, steam_id, profile_picture, role,
  created_at, updated_at, banned, ban_reason, banned_at
) ON TABLE public.users TO authenticated;
GRANT INSERT (email, username, steam_id, profile_picture)
  ON TABLE public.users TO authenticated;
GRANT UPDATE (
  username, steam_id, profile_picture, role, banned, ban_reason, banned_at
) ON TABLE public.users TO authenticated;

REVOKE ALL ON TABLE public.maps FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.maps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.maps TO authenticated;

REVOKE ALL ON TABLE public.utility_points FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.utility_points TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.utility_points TO authenticated;

REVOKE ALL ON TABLE public.suggestions FROM PUBLIC, anon, authenticated;
REVOKE INSERT (
  id, title, description, map_id, utility_type, user_id, status, created_at, updated_at
) ON TABLE public.suggestions FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, title, description, map_id, utility_type, user_id, status, created_at, updated_at
) ON TABLE public.suggestions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.suggestions TO anon, authenticated;
GRANT INSERT (title, description, map_id, utility_type, user_id)
  ON TABLE public.suggestions TO authenticated;
GRANT UPDATE (title, description, map_id, utility_type, status)
  ON TABLE public.suggestions TO authenticated;
GRANT DELETE ON TABLE public.suggestions TO authenticated;

REVOKE ALL ON TABLE public.clips FROM PUBLIC, anon, authenticated;
REVOKE INSERT (
  id, title, description, map_id, utility_type, user_id, file_path, likes, created_at, updated_at
) ON TABLE public.clips FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, title, description, map_id, utility_type, user_id, file_path, likes, created_at, updated_at
) ON TABLE public.clips FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.clips TO anon, authenticated;
GRANT INSERT (title, description, map_id, utility_type, user_id, file_path)
  ON TABLE public.clips TO authenticated;
GRANT UPDATE (title, description, map_id, utility_type, file_path)
  ON TABLE public.clips TO authenticated;
GRANT DELETE ON TABLE public.clips TO authenticated;

REVOKE ALL ON TABLE public.comments FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, clip_id, user_id, content, created_at)
  ON TABLE public.comments FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, clip_id, user_id, content, created_at)
  ON TABLE public.comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.comments TO anon, authenticated;
GRANT INSERT (clip_id, user_id, content)
  ON TABLE public.comments TO authenticated;
GRANT UPDATE (content) ON TABLE public.comments TO authenticated;
GRANT DELETE ON TABLE public.comments TO authenticated;

GRANT USAGE ON SEQUENCE
  public.users_id_seq,
  public.maps_id_seq,
  public.utility_points_id_seq,
  public.suggestions_id_seq,
  public.clips_id_seq,
  public.comments_id_seq
TO authenticated;

CREATE POLICY "admins can select all users"
ON public.users FOR SELECT TO authenticated
USING ((SELECT private.is_admin()));

CREATE POLICY "users can select own row"
ON public.users FOR SELECT TO authenticated
USING (email = (SELECT auth.email()) OR (SELECT private.is_admin()));

CREATE POLICY "insert own user"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  email = (SELECT auth.email())
  AND role = 'user'
  AND COALESCE(banned, false) = false
);

CREATE POLICY "users can update own row or admin"
ON public.users FOR UPDATE TO authenticated
USING (email = (SELECT auth.email()) OR (SELECT private.is_admin()))
WITH CHECK (email = (SELECT auth.email()) OR (SELECT private.is_admin()));

CREATE POLICY "users can delete own row or admin"
ON public.users FOR DELETE TO authenticated
USING (email = (SELECT auth.email()) OR (SELECT private.is_admin()));

CREATE POLICY "public select maps"
ON public.maps FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "admins insert maps"
ON public.maps FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "admins update maps"
ON public.maps FOR UPDATE TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "admins delete maps"
ON public.maps FOR DELETE TO authenticated
USING ((SELECT private.is_admin()));

CREATE POLICY "public select utility_points"
ON public.utility_points FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "admins insert utility_points"
ON public.utility_points FOR INSERT TO authenticated
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "admins update utility_points"
ON public.utility_points FOR UPDATE TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "admins delete utility_points"
ON public.utility_points FOR DELETE TO authenticated
USING ((SELECT private.is_admin()));

CREATE POLICY "public select suggestions"
ON public.suggestions FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "insert own suggestion"
ON public.suggestions FOR INSERT TO authenticated
WITH CHECK (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  AND status = 'pending'
);

CREATE POLICY "update suggestion owner or admin"
ON public.suggestions FOR UPDATE TO authenticated
USING (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
)
WITH CHECK (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
);

CREATE POLICY "delete suggestion owner or admin"
ON public.suggestions FOR DELETE TO authenticated
USING (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
);

CREATE POLICY "public select clips"
ON public.clips FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "insert own clip"
ON public.clips FOR INSERT TO authenticated
WITH CHECK (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
);

CREATE POLICY "update clip owner or admin"
ON public.clips FOR UPDATE TO authenticated
USING (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
)
WITH CHECK (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
);

CREATE POLICY "delete clip owner or admin"
ON public.clips FOR DELETE TO authenticated
USING (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
);

CREATE POLICY "public select comments"
ON public.comments FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "insert own comment"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
);

CREATE POLICY "update comment owner or admin"
ON public.comments FOR UPDATE TO authenticated
USING (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
)
WITH CHECK (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
);

CREATE POLICY "delete comment owner or admin"
ON public.comments FOR DELETE TO authenticated
USING (
  user_id = (
    SELECT id FROM public.users WHERE email = (SELECT auth.email())
  )
  OR (SELECT private.is_admin())
);
ALTER TABLE public.user_achievements
  DROP CONSTRAINT user_achievements_achievement_id_check,
  ADD CONSTRAINT user_achievements_achievement_id_check
    CHECK (achievement_id IN ('explorer', 'account', 'suggestion', 'ticket', 'admin', 'desktop'));

DROP POLICY "users can unlock own achievements" ON public.user_achievements;
CREATE POLICY "users can unlock supported self achievements"
ON public.user_achievements FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND achievement_id IN ('explorer', 'ticket', 'desktop')
);

CREATE OR REPLACE FUNCTION private.grant_user_achievement(
  target_user_id uuid,
  target_achievement_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (target_user_id, target_achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
$function$;

REVOKE ALL ON FUNCTION private.grant_user_achievement(uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.award_account_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  PERFORM private.grant_user_achievement(NEW.id, 'account');
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.award_account_achievement()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_account_achievement ON auth.users;
CREATE TRIGGER award_account_achievement
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.award_account_achievement();

CREATE OR REPLACE FUNCTION private.award_suggestion_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT account.id
  INTO auth_user_id
  FROM public.users AS profile
  JOIN auth.users AS account ON lower(account.email) = lower(profile.email)
  WHERE profile.id = NEW.user_id;

  IF auth_user_id IS NOT NULL THEN
    PERFORM private.grant_user_achievement(auth_user_id, 'suggestion');
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.award_suggestion_achievement()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_suggestion_achievement ON public.suggestions;
CREATE TRIGGER award_suggestion_achievement
AFTER INSERT ON public.suggestions
FOR EACH ROW
EXECUTE FUNCTION private.award_suggestion_achievement();

CREATE OR REPLACE FUNCTION private.award_admin_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  auth_user_id uuid;
BEGIN
  IF NEW.role = 'admin' AND (
    TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role
  ) THEN
    SELECT account.id
    INTO auth_user_id
    FROM auth.users AS account
    WHERE lower(account.email) = lower(NEW.email);

    IF auth_user_id IS NOT NULL THEN
      PERFORM private.grant_user_achievement(auth_user_id, 'admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.award_admin_achievement()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_admin_achievement ON public.users;
CREATE TRIGGER award_admin_achievement
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION private.award_admin_achievement();

INSERT INTO public.user_achievements (user_id, achievement_id)
SELECT account.id, 'account'
FROM auth.users AS account
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO public.user_achievements (user_id, achievement_id)
SELECT DISTINCT account.id, 'suggestion'
FROM public.suggestions AS suggestion
JOIN public.users AS profile ON profile.id = suggestion.user_id
JOIN auth.users AS account ON lower(account.email) = lower(profile.email)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO public.user_achievements (user_id, achievement_id)
SELECT account.id, 'admin'
FROM public.users AS profile
JOIN auth.users AS account ON lower(account.email) = lower(profile.email)
WHERE profile.role = 'admin'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

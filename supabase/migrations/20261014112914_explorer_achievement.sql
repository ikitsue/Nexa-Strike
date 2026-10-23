CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL CHECK (achievement_id IN ('explorer')),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_achievements FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.user_achievements TO authenticated;

CREATE POLICY "users can view own achievements"
ON public.user_achievements FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "users can unlock own achievements"
ON public.user_achievements FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.user_achievements
  DROP CONSTRAINT user_achievements_achievement_id_check,
  ADD CONSTRAINT user_achievements_achievement_id_check
    CHECK (achievement_id IN ('explorer', 'account', 'suggestion', 'ticket', 'admin', 'desktop', 'mobile'));

DROP POLICY IF EXISTS "users can unlock supported self achievements"
  ON public.user_achievements;

CREATE POLICY "users can unlock supported self achievements"
ON public.user_achievements FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND achievement_id IN ('explorer', 'ticket', 'desktop', 'mobile')
);
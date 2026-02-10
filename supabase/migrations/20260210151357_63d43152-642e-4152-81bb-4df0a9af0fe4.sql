
-- Create is_head() function (head enum value is now committed)
CREATE OR REPLACE FUNCTION public.is_head()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'head')
$$;

-- Head: team-scoped access to daily_stats
CREATE POLICY "Heads can view team daily_stats" ON public.daily_stats FOR SELECT USING (is_head() AND team_id = get_user_team_id(auth.uid()));
CREATE POLICY "Heads can delete team daily_stats" ON public.daily_stats FOR DELETE USING (is_head() AND team_id = get_user_team_id(auth.uid()));
CREATE POLICY "Heads can update team daily_stats" ON public.daily_stats FOR UPDATE USING (is_head() AND team_id = get_user_team_id(auth.uid()));
CREATE POLICY "Heads can insert own daily_stats" ON public.daily_stats FOR INSERT WITH CHECK (is_head() AND user_id = auth.uid());

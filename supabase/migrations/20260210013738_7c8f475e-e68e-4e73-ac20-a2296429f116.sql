
-- Allow leaders to delete daily_stats for their own team
CREATE POLICY "Leaders can delete team daily_stats"
ON public.daily_stats
FOR DELETE
USING (is_leader() AND team_id = get_user_team_id(auth.uid()));


-- 1. Drop default first, then convert assignment_type enum to text
ALTER TABLE public.assignments ALTER COLUMN type DROP DEFAULT;
ALTER TABLE public.assignments ALTER COLUMN type TYPE text USING type::text;
ALTER TABLE public.assignments ALTER COLUMN type SET DEFAULT 'event';
DROP TYPE IF EXISTS public.assignment_type;

-- 2. Add 'head' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head';

-- 3. Leader: upgrade to view/delete/update ALL daily_stats
DROP POLICY IF EXISTS "Leaders can delete team daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Leaders can view team daily_stats" ON public.daily_stats;

CREATE POLICY "Leaders can view all daily_stats" ON public.daily_stats FOR SELECT USING (is_leader());
CREATE POLICY "Leaders can delete all daily_stats" ON public.daily_stats FOR DELETE USING (is_leader());
CREATE POLICY "Leaders can update all daily_stats" ON public.daily_stats FOR UPDATE USING (is_leader());
CREATE POLICY "Leaders can insert daily_stats" ON public.daily_stats FOR INSERT WITH CHECK (is_leader());

-- 4. Leaders can manage assignments
DROP POLICY IF EXISTS "Managers can insert assignments" ON public.assignments;
DROP POLICY IF EXISTS "Managers can update assignments" ON public.assignments;
DROP POLICY IF EXISTS "Managers can delete assignments" ON public.assignments;

CREATE POLICY "Managers and leaders can insert assignments" ON public.assignments FOR INSERT WITH CHECK (is_manager() OR is_leader());
CREATE POLICY "Managers and leaders can update assignments" ON public.assignments FOR UPDATE USING (is_manager() OR is_leader());
CREATE POLICY "Managers and leaders can delete assignments" ON public.assignments FOR DELETE USING (is_manager() OR is_leader());

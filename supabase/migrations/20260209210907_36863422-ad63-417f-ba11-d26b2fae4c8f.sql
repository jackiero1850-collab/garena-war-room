
-- Drop ALL existing restrictive policies on daily_stats
DROP POLICY IF EXISTS "Leaders can view team daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Managers can delete daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Managers can insert daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Managers can update daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Managers can view all daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Sales can insert own daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Sales can update own daily_stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Sales can view own daily_stats" ON public.daily_stats;

-- Drop ALL existing restrictive policies on profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop ALL existing restrictive policies on teams
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Managers can update teams" ON public.teams;

-- Drop ALL existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Managers can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- ==========================================
-- Recreate as PERMISSIVE policies
-- ==========================================

-- profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Managers can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_manager());

-- teams
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update teams" ON public.teams FOR UPDATE TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can delete teams" ON public.teams FOR DELETE TO authenticated USING (public.is_manager());

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Managers can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_manager());

-- daily_stats (permissive = OR logic between policies)
CREATE POLICY "Users can view own daily_stats" ON public.daily_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Managers can view all daily_stats" ON public.daily_stats FOR SELECT TO authenticated USING (public.is_manager());
CREATE POLICY "Leaders can view team daily_stats" ON public.daily_stats FOR SELECT TO authenticated USING (public.is_leader() AND team_id = public.get_user_team_id(auth.uid()));
CREATE POLICY "Users can insert own daily_stats" ON public.daily_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Managers can insert daily_stats" ON public.daily_stats FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Users can update own daily_stats" ON public.daily_stats FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Managers can update daily_stats" ON public.daily_stats FOR UPDATE TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can delete daily_stats" ON public.daily_stats FOR DELETE TO authenticated USING (public.is_manager());

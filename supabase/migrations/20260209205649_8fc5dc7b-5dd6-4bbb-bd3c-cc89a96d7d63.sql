
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('manager', 'leader', 'sales', 'graphic');

-- Create enum for website names
CREATE TYPE public.website_name AS ENUM ('MGB-USA', 'UNI-USA', 'MGB-X');

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for teams.leader_id after profiles exists
ALTER TABLE public.teams ADD CONSTRAINT teams_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create daily_stats table
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  signups_count INTEGER NOT NULL DEFAULT 0,
  deposit_count INTEGER NOT NULL DEFAULT 0,
  first_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ad_spend_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  website_name website_name NOT NULL DEFAULT 'MGB-USA',
  content_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Enable realtime for daily_stats
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_stats;

-- Helper function: has_role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: is_manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'manager')
$$;

-- Helper function: is_leader
CREATE OR REPLACE FUNCTION public.is_leader()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'leader')
$$;

-- Helper function: get_user_team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = _user_id
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON public.daily_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- profiles: everyone authenticated can read all profiles (needed for dropdowns/display)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- profiles: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- profiles: managers can update any profile
CREATE POLICY "Managers can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_manager());

-- user_roles: only managers can manage roles
CREATE POLICY "Managers can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_manager());

-- user_roles: users can view their own role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Managers can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_manager());

-- teams: authenticated can read teams
CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can update teams"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Managers can delete teams"
  ON public.teams FOR DELETE
  TO authenticated
  USING (public.is_manager());

-- daily_stats: managers see all, leaders see team, sales see own
CREATE POLICY "Managers can view all daily_stats"
  ON public.daily_stats FOR SELECT
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Leaders can view team daily_stats"
  ON public.daily_stats FOR SELECT
  TO authenticated
  USING (
    public.is_leader() AND
    team_id = public.get_user_team_id(auth.uid())
  );

CREATE POLICY "Sales can view own daily_stats"
  ON public.daily_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Sales can insert own daily_stats"
  ON public.daily_stats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers can insert daily_stats"
  ON public.daily_stats FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager());

CREATE POLICY "Sales can update own daily_stats"
  ON public.daily_stats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can update daily_stats"
  ON public.daily_stats FOR UPDATE
  TO authenticated
  USING (public.is_manager());

CREATE POLICY "Managers can delete daily_stats"
  ON public.daily_stats FOR DELETE
  TO authenticated
  USING (public.is_manager());

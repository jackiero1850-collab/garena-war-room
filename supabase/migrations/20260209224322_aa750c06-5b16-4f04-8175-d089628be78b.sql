
-- Create master_roles table for dynamic role management
CREATE TABLE public.master_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.master_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roles" ON public.master_roles FOR SELECT USING (true);
CREATE POLICY "Managers can insert roles" ON public.master_roles FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update roles" ON public.master_roles FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete roles" ON public.master_roles FOR DELETE USING (is_manager());

-- Seed default roles
INSERT INTO public.master_roles (name) VALUES ('Manager'), ('Leader'), ('Sales'), ('Graphic') ON CONFLICT (name) DO NOTHING;

-- Create master_assignment_types table
CREATE TABLE public.master_assignment_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.master_assignment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignment types" ON public.master_assignment_types FOR SELECT USING (true);
CREATE POLICY "Managers can insert assignment types" ON public.master_assignment_types FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update assignment types" ON public.master_assignment_types FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete assignment types" ON public.master_assignment_types FOR DELETE USING (is_manager());

INSERT INTO public.master_assignment_types (name) VALUES ('event'), ('live') ON CONFLICT (name) DO NOTHING;

-- Create master_brief_types table
CREATE TABLE public.master_brief_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.master_brief_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view brief types" ON public.master_brief_types FOR SELECT USING (true);
CREATE POLICY "Managers can insert brief types" ON public.master_brief_types FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update brief types" ON public.master_brief_types FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete brief types" ON public.master_brief_types FOR DELETE USING (is_manager());

INSERT INTO public.master_brief_types (name) VALUES ('Banner'), ('Poster'), ('Video'), ('Social Post') ON CONFLICT (name) DO NOTHING;

-- Create app_settings table for logo/app name
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Managers can insert app settings" ON public.app_settings FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update app settings" ON public.app_settings FOR UPDATE USING (is_manager());

INSERT INTO public.app_settings (key, value) VALUES ('app_name', 'WAR ROOM'), ('app_logo_url', '') ON CONFLICT (key) DO NOTHING;

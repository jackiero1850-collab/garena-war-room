
-- Create team_members table for manual roster
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'Sales',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Managers can insert team_members" ON public.team_members FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update team_members" ON public.team_members FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete team_members" ON public.team_members FOR DELETE USING (is_manager());

-- Add team_member_id to daily_stats
ALTER TABLE public.daily_stats ADD COLUMN team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Add cover_image_url and website to assignments
ALTER TABLE public.assignments ADD COLUMN cover_image_url TEXT;
ALTER TABLE public.assignments ADD COLUMN website TEXT;

-- Pre-fill teams if they don't already exist
INSERT INTO public.teams (name) VALUES ('Duckling Team') ON CONFLICT DO NOTHING;
INSERT INTO public.teams (name) VALUES ('Graphic Team') ON CONFLICT DO NOTHING;

-- Add avatar storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for team_members updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

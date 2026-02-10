
-- Add email column to team_members for auth linking
ALTER TABLE public.team_members ADD COLUMN email text UNIQUE;

-- Create index for fast email lookup
CREATE INDEX idx_team_members_email ON public.team_members(email);

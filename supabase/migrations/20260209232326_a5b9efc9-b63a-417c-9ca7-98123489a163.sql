
-- Add assigned_to column to assignments table (references team_members)
ALTER TABLE public.assignments
ADD COLUMN assigned_to uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_assignments_assigned_to ON public.assignments(assigned_to);

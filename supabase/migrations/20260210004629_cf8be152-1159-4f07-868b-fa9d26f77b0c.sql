-- Add submitted_by_member_id column
ALTER TABLE public.assignment_submissions
ADD COLUMN submitted_by_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Drop old unique constraint
ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_user_id_key;

-- Add new unique constraint
ALTER TABLE public.assignment_submissions
ADD CONSTRAINT assignment_submissions_assignment_id_submitted_by_key
UNIQUE (assignment_id, submitted_by_member_id);
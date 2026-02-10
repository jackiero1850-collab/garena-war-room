
-- 1. Remove ALL unique constraints on assignment_id from assignment_submissions
ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_user_id_key;

ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_submitted_by_key;

-- 2. Allow unauthenticated users to SELECT app_settings (for login page branding)
CREATE POLICY "Public can view app settings"
ON public.app_settings
FOR SELECT
TO anon
USING (true);

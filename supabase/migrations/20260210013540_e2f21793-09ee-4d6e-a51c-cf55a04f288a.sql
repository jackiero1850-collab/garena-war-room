
-- Convert website_name column from enum to text
ALTER TABLE public.daily_stats
  ALTER COLUMN website_name TYPE text USING website_name::text;

-- Set a sensible default
ALTER TABLE public.daily_stats
  ALTER COLUMN website_name SET DEFAULT 'MGB-USA';

-- Drop the enum type if no longer used elsewhere
DROP TYPE IF EXISTS public.website_name;


-- 1. Create websites table
CREATE TABLE public.websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view websites" ON public.websites FOR SELECT USING (true);
CREATE POLICY "Managers can insert websites" ON public.websites FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update websites" ON public.websites FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete websites" ON public.websites FOR DELETE USING (is_manager());

-- Seed websites
INSERT INTO public.websites (name) VALUES ('MGB-USA'), ('UNI-USA'), ('MGB-X');

-- 2. Fix graphic_briefs.graphic_user_id FK
-- Drop any existing FK constraint on graphic_user_id if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%graphic_user_id%' AND table_name = 'graphic_briefs'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.graphic_briefs DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_name LIKE '%graphic_user_id%' AND table_name = 'graphic_briefs'
      LIMIT 1
    );
  END IF;
END $$;

-- Add new FK referencing team_members
ALTER TABLE public.graphic_briefs
  ADD CONSTRAINT graphic_briefs_graphic_user_id_fkey
  FOREIGN KEY (graphic_user_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

-- 3. Enable realtime for websites
ALTER PUBLICATION supabase_realtime ADD TABLE public.websites;

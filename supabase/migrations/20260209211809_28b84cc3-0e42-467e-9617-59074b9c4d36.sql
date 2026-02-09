
-- Create assignment type enum
CREATE TYPE public.assignment_type AS ENUM ('event', 'live');

-- Create assignment status enum
CREATE TYPE public.assignment_status AS ENUM ('upcoming', 'active', 'completed');

-- Create graphic brief status enum
CREATE TYPE public.brief_status AS ENUM ('queue', 'cutting', 'done', 'fix');

-- Assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  type assignment_type NOT NULL DEFAULT 'event',
  status assignment_status NOT NULL DEFAULT 'upcoming',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_proof_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

-- Graphic briefs table
CREATE TABLE public.graphic_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_time TIME NOT NULL DEFAULT CURRENT_TIME,
  sales_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  graphic_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brief_type TEXT NOT NULL DEFAULT 'Banner',
  description TEXT,
  status brief_status NOT NULL DEFAULT 'queue',
  completion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphic_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Enable realtime for briefs
ALTER PUBLICATION supabase_realtime ADD TABLE public.graphic_briefs;

-- Triggers for updated_at
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_graphic_briefs_updated_at BEFORE UPDATE ON public.graphic_briefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Assignments: all authenticated can view, managers can CRUD
CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert assignments" ON public.assignments FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update assignments" ON public.assignments FOR UPDATE TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can delete assignments" ON public.assignments FOR DELETE TO authenticated USING (public.is_manager());

-- Assignment submissions: view all, insert own
CREATE POLICY "Anyone can view submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own submissions" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own submissions" ON public.assignment_submissions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Graphic briefs: all can view, sales can insert, sales+graphic can update status
CREATE POLICY "Anyone can view briefs" ON public.graphic_briefs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert briefs" ON public.graphic_briefs FOR INSERT TO authenticated WITH CHECK (sales_user_id = auth.uid());
CREATE POLICY "Managers can insert briefs" ON public.graphic_briefs FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Involved users can update briefs" ON public.graphic_briefs FOR UPDATE TO authenticated USING (sales_user_id = auth.uid() OR graphic_user_id = auth.uid());
CREATE POLICY "Managers can update briefs" ON public.graphic_briefs FOR UPDATE TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can delete briefs" ON public.graphic_briefs FOR DELETE TO authenticated USING (public.is_manager());

-- Resources: all can view, managers can CRUD
CREATE POLICY "Anyone can view resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update resources" ON public.resources FOR UPDATE TO authenticated USING (public.is_manager());
CREATE POLICY "Managers can delete resources" ON public.resources FOR DELETE TO authenticated USING (public.is_manager());

-- Storage bucket for assignment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-proofs', 'assignment-proofs', true);

CREATE POLICY "Anyone can view proofs" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-proofs');
CREATE POLICY "Authenticated users can upload proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignment-proofs');
CREATE POLICY "Users can update own proofs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assignment-proofs');

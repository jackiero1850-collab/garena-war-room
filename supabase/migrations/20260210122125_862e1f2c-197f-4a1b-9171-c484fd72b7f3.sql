
-- Create task_action_types table
CREATE TABLE public.task_action_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color_hex text NOT NULL DEFAULT '#6b7280',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_action_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view action types" ON public.task_action_types FOR SELECT USING (true);
CREATE POLICY "Managers can insert action types" ON public.task_action_types FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers can update action types" ON public.task_action_types FOR UPDATE USING (is_manager());
CREATE POLICY "Managers can delete action types" ON public.task_action_types FOR DELETE USING (is_manager());

-- Insert default action types
INSERT INTO public.task_action_types (name, color_hex) VALUES
  ('แจกเครดิต', '#22c55e'),
  ('แจกของ', '#a855f7'),
  ('ทั่วไป', '#6b7280');

-- Add action_type_id to assignments table
ALTER TABLE public.assignments ADD COLUMN action_type_id uuid REFERENCES public.task_action_types(id) ON DELETE SET NULL;

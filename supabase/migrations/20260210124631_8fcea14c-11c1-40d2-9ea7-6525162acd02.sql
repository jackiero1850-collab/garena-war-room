
-- Add asset_link to assignments
ALTER TABLE public.assignments ADD COLUMN asset_link text;

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view activity logs"
ON public.activity_logs FOR SELECT
USING (is_manager());

CREATE POLICY "System can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_target ON public.activity_logs (target_table, action);

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, action, target_table, target_id, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id::text,
      to_jsonb(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, action, target_table, target_id, details)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers
CREATE TRIGGER audit_daily_stats_delete
AFTER DELETE ON public.daily_stats
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER audit_daily_stats_update
AFTER UPDATE ON public.daily_stats
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER audit_assignments_delete
AFTER DELETE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.log_activity();


-- Create a security definer function that returns global aggregated stats
-- accessible to all authenticated users, without exposing individual rows
CREATE OR REPLACE FUNCTION public.get_global_dashboard_stats(
  _start_date date,
  _end_date date,
  _website text DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'signups_count', COALESCE(SUM(signups_count), 0),
    'deposit_count', COALESCE(SUM(deposit_count), 0),
    'first_deposit_amount', COALESCE(SUM(first_deposit_amount), 0),
    'total_deposit_amount', COALESCE(SUM(total_deposit_amount), 0),
    'ad_spend_usd', COALESCE(SUM(ad_spend_usd), 0)
  )
  FROM public.daily_stats
  WHERE date >= _start_date
    AND date <= _end_date
    AND (_website IS NULL OR website_name = _website);
$$;

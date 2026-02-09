
-- Update handle_new_user to auto-assign roles and inject mock data for first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  team1_id UUID;
  team2_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  -- Count existing users (before this one)
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE id != NEW.id;

  IF user_count = 0 THEN
    -- First user → manager role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'manager');

    -- Create teams
    INSERT INTO public.teams (id, name, leader_id) VALUES (gen_random_uuid(), 'Alpha Squad', NEW.id) RETURNING id INTO team1_id;
    INSERT INTO public.teams (id, name, leader_id) VALUES (gen_random_uuid(), 'Bravo Team', NULL) RETURNING id INTO team2_id;

    -- Assign first user to Alpha Squad
    UPDATE public.profiles SET username = 'Commander', team_id = team1_id WHERE id = NEW.id;

    -- Inject mock daily_stats for the last 14 days
    INSERT INTO public.daily_stats (user_id, date, team_id, signups_count, deposit_count, first_deposit_amount, total_deposit_amount, ad_spend_usd, website_name, content_link)
    SELECT
      NEW.id,
      CURRENT_DATE - i,
      team1_id,
      (20 + (random() * 80)::int),
      (5 + (random() * 30)::int),
      (1000 + (random() * 9000)::numeric(12,2)),
      (5000 + (random() * 45000)::numeric(12,2)),
      (50 + (random() * 450)::numeric(12,2)),
      CASE (i % 3) WHEN 0 THEN 'MGB-USA'::website_name WHEN 1 THEN 'UNI-USA'::website_name ELSE 'MGB-X'::website_name END,
      'https://example.com/content/' || i
    FROM generate_series(0, 13) AS s(i);

  ELSE
    -- Subsequent users → sales role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sales');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

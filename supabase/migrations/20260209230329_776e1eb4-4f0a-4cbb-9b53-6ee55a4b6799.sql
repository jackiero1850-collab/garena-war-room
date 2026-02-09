
-- Fix storage: allow managers to upload to avatars bucket (used for app logo)
CREATE POLICY "Managers can upload app assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'app' AND
  public.is_manager()
);

CREATE POLICY "Managers can update app assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'app' AND
  public.is_manager()
);

-- Also allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

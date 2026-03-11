
-- 1. Fix admin role escalation: restrict user_roles INSERT to buyer/seller only
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert own non-admin role"
ON public.user_roles FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  role IN ('buyer'::app_role, 'seller'::app_role)
);

-- 2. Fix wallet balance manipulation: drop user UPDATE policy
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- 3. Fix notifications open insert: revoke direct inserts
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
REVOKE INSERT ON public.notifications FROM authenticated;
REVOKE INSERT ON public.notifications FROM anon;

-- 4. Fix storage path traversal on listing-media
DROP POLICY IF EXISTS "Authenticated users can upload listing media" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

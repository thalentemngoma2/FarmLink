-- Enable RLS on users table (should already be enabled from initial schema)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role/admins to insert users with valid roles
-- Note: The trigger on auth.users normally handles user creation.
-- This policy is for manual inserts via SQL editor or admin operations.
DROP POLICY IF EXISTS "Admin can insert users" ON public.users;
CREATE POLICY "Admin can insert users" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.users WHERE role = 'admin') AND
    role IN ('farmer', 'retailer', 'extension_officer')
  );

-- Alternative: If you want to allow ANY authenticated user to sign up via direct insert
-- (Not recommended — use Supabase Auth signUp endpoint instead)
-- DROP POLICY IF EXISTS "Allow signup with valid roles" ON public.users;
-- CREATE POLICY "Allow signup with valid roles" ON public.users
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     role IN ('farmer', 'retailer', 'extension_officer')
<<<<<<< HEAD
--   );
=======
--   );
>>>>>>> gozilethu/farmlink-Mbutho

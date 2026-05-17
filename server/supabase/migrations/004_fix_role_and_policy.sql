-- Allow extension_officer role in users table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('farmer', 'retailer', 'admin', 'extension_officer'));

-- Allow users to read their own user row (for profile, edit-profile, etc.)
DROP POLICY IF EXISTS "Users can view own user row" ON public.users;
CREATE POLICY "Users can view own user row" ON public.users FOR SELECT USING (auth.uid() = user_id);

-- Allow public read of basic user info (user_id, username) for community features
-- This enables joined queries like `select *, users(username)` from plant_scans
DROP POLICY IF EXISTS "Public can read basic user info" ON public.users;
CREATE POLICY "Public can read basic user info" ON public.users FOR SELECT USING (true) WITH CHECK (false);

-- Grant column-level privileges to ensure only safe columns are accessible
-- (Even with the policy above, column grants restrict what columns can be read)
GRANT SELECT (user_id, username) ON public.users TO anon;
GRANT SELECT (user_id, username) ON public.users TO authenticated;

-- Allow public read of plant scans for community feed
DROP POLICY IF EXISTS "Public can read plant scans" ON public.plant_scans;
CREATE POLICY "Public can read plant scans" ON public.plant_scans FOR SELECT USING (true);
-- Add avatar column to users table to prevent signup trigger 500 errors
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
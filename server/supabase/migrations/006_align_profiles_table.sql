-- Aligns the public.profiles table with the structure expected by the profile-server.

-- Rename full_name to name and make it nullable
ALTER TABLE public.profiles RENAME COLUMN full_name TO name;
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;

-- Add missing columns that the profile-server uses
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS farm_size TEXT; -- Using TEXT for flexibility e.g. "5 Hectares"
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS main_crops TEXT[]; -- Array of strings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS questions_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS answers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Rename farm_type to farming_type for consistency with the server
ALTER TABLE public.profiles RENAME COLUMN farm_type TO farming_type;
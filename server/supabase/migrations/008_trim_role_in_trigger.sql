-- Fix: Ensure role values are trimmed before insertion to avoid CHECK constraint violations
-- This updates the handle_new_user trigger function to TRIM the role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, username, email, phone_number, password_hash, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    '',
    TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'))  -- Trim whitespace from role
  );
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
<<<<<<< HEAD
$$ LANGUAGE plpgsql SECURITY DEFINER;
=======
$$ LANGUAGE plpgsql SECURITY DEFINER;
>>>>>>> gozilethu/farmlink-Mbutho

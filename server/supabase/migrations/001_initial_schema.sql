-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE public.users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- only for legacy; Supabase Auth handles actual auth
  role VARCHAR(20) DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (one-to-one with users)
CREATE TABLE public.profiles (
  profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  farm_type VARCHAR(100),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts (community questions)
CREATE TABLE public.posts (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Replies
CREATE TABLE public.replies (
  reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(post_id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages (direct chat)
CREATE TABLE public.messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================= AI FEATURE TABLES =================
-- Plant scans
CREATE TABLE public.plant_scans (
  scan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  analysis_result JSONB NOT NULL,   -- { state, cause, solution, preventiveTips }
  model_version TEXT NOT NULL,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- AI feedback
CREATE TABLE public.ai_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID REFERENCES public.plant_scans(scan_id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  was_helpful BOOLEAN,
  correct_state VARCHAR(50),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI model registry
CREATE TABLE public.ai_models (
  model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT UNIQUE NOT NULL,
  storage_path TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Offline scan queue (optional backup)
CREATE TABLE public.offline_scan_queue (
  queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================= ROW LEVEL SECURITY =================
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Policies: users can read/update own data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Posts: anyone can read, only authenticated can create, only owner can update/delete
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Replies: similar
CREATE POLICY "Anyone can view replies" ON public.replies FOR SELECT USING (true);
CREATE POLICY "Auth users can reply" ON public.replies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages: users can see only their own conversations
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications: only the target user
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Plant scans: users can CRUD their own scans
CREATE POLICY "Users can manage own scans" ON public.plant_scans FOR ALL USING (auth.uid() = user_id);
-- Admin can read all scans (for retraining)
CREATE POLICY "Admin can read all scans" ON public.plant_scans FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND role = 'admin'));

-- AI feedback: users can manage own feedback
CREATE POLICY "Users can manage own feedback" ON public.ai_feedback FOR ALL USING (auth.uid() = user_id);

-- AI models: public read for active model, admin write
CREATE POLICY "Anyone can read active models" ON public.ai_models FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage models" ON public.ai_models FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND role = 'admin'));

-- ================= TRIGGER: Sync auth.users with public.users =================
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
  );
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================
-- FarmLink Pivot: Tender Marketplace Schema
-- Replaces community feed & chat with retailer-to-farmer tenders
-- ============================================================

-- 1. Extend user roles to include 'retailer'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('farmer', 'retailer', 'admin'));

-- 2. Retailer profiles (one-to-one with users)
CREATE TABLE public.retail_profiles (
  retail_profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE UNIQUE,
  store_name VARCHAR(150) NOT NULL,
  registration_number VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'South Africa',
  business_type VARCHAR(50), -- e.g. supermarket, restaurant, processor
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tenders posted by retailers
CREATE TABLE public.tenders (
  tender_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  product_category VARCHAR(100), -- e.g. vegetables, fruits, grains, dairy
  quantity_needed VARCHAR(100), -- free-text with units, e.g. "500 kg"
  budget_range VARCHAR(100), -- e.g. "R10 000 - R20 000"
  delivery_location VARCHAR(200),
  delivery_date DATE,
  deadline DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  is_private BOOLEAN DEFAULT FALSE, -- if true, only visible to invited farmers (future)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tender requirement line items
CREATE TABLE public.tender_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES public.tenders(tender_id) ON DELETE CASCADE,
  product_name VARCHAR(150) NOT NULL,
  quantity VARCHAR(100),
  grade_quality VARCHAR(100), -- e.g. Grade A, organic
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Applications submitted by farmers (PRIVATE)
CREATE TABLE public.tender_applications (
  application_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES public.tenders(tender_id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  proposed_price VARCHAR(100), -- farmer's price offer
  message TEXT, -- cover letter / motivation
  delivery_commitment VARCHAR(100), -- when they can deliver
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tender_id, farmer_id) -- one application per farmer per tender
);

-- 6. Private Q&A / messaging between retailer and applicant per tender
CREATE TABLE public.tender_messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID REFERENCES public.tenders(tender_id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.retail_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_messages ENABLE ROW LEVEL SECURITY;

-- Retail profiles: public read, only owner can update
CREATE POLICY "Retail profiles public read" ON public.retail_profiles FOR SELECT USING (true);
CREATE POLICY "Retail profile owner update" ON public.retail_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Retail profile owner insert" ON public.retail_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tenders: public can read open tenders, retailer can CRUD own
CREATE POLICY "Anyone can view open tenders" ON public.tenders FOR SELECT USING (status = 'open' OR auth.uid() = retailer_id);
CREATE POLICY "Retailer can create tenders" ON public.tenders FOR INSERT WITH CHECK (auth.uid() = retailer_id);
CREATE POLICY "Retailer can update own tenders" ON public.tenders FOR UPDATE USING (auth.uid() = retailer_id);
CREATE POLICY "Retailer can delete own tenders" ON public.tenders FOR DELETE USING (auth.uid() = retailer_id);

-- Tender requirements: visible if parent tender is visible
CREATE POLICY "Requirements visible with tender" ON public.tender_requirements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenders WHERE tender_id = tender_requirements.tender_id AND (status = 'open' OR retailer_id = auth.uid()))
);
CREATE POLICY "Retailer can manage requirements" ON public.tender_requirements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tenders WHERE tender_id = tender_requirements.tender_id AND retailer_id = auth.uid())
);

-- Applications: ONLY applicant and tender owner can see
CREATE POLICY "Applicant can view own applications" ON public.tender_applications FOR SELECT USING (auth.uid() = farmer_id);
CREATE POLICY "Retailer can view applications for own tenders" ON public.tender_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tenders WHERE tender_id = tender_applications.tender_id AND retailer_id = auth.uid())
);
CREATE POLICY "Farmer can create own applications" ON public.tender_applications FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Retailer can update application status" ON public.tender_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tenders WHERE tender_id = tender_applications.tender_id AND retailer_id = auth.uid())
);
CREATE POLICY "Applicant can delete own application" ON public.tender_applications FOR DELETE USING (auth.uid() = farmer_id);

-- Tender messages: only sender and receiver can see
CREATE POLICY "Participants can view messages" ON public.tender_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Participants can send messages" ON public.tender_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_tenders_status ON public.tenders(status);
CREATE INDEX idx_tenders_retailer ON public.tenders(retailer_id);
CREATE INDEX idx_applications_tender ON public.tender_applications(tender_id);
CREATE INDEX idx_applications_farmer ON public.tender_applications(farmer_id);
CREATE INDEX idx_tender_messages_tender ON public.tender_messages(tender_id);
CREATE INDEX idx_tender_messages_sender ON public.tender_messages(sender_id);
CREATE INDEX idx_tender_messages_receiver ON public.tender_messages(receiver_id);

-- ============================================================
-- Trigger: update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenders_updated_at BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tender_applications_updated_at BEFORE UPDATE ON public.tender_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_retail_profiles_updated_at BEFORE UPDATE ON public.retail_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

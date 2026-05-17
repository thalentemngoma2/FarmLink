-- ============================================================
-- FarmLink: Expert Consultation Request System
-- Farmers can send requests to extension officers (agricultural experts)
-- ============================================================

-- 1. Expert Requests Table
CREATE TABLE public.expert_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  expert_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL, -- can be NULL if unassigned
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100), -- e.g., 'plant-disease', 'soil-health', 'crop-advice', 'livestock', 'irrigation', 'pest-control'
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'closed')),
  response TEXT, -- expert's final advice/solution
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Expert Request Messages (chat thread between farmer and expert)
CREATE TABLE public.expert_request_messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.expert_requests(request_id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.expert_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_request_messages ENABLE ROW LEVEL SECURITY;

-- Expert Requests Policies:
-- Farmers can view their own requests
CREATE POLICY "Farmers can view own requests" ON public.expert_requests
  FOR SELECT USING (auth.uid() = farmer_id);

-- Experts can view all requests
CREATE POLICY "Experts can view all requests" ON public.expert_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND role = 'extension_officer'));

-- Admin can view all requests
CREATE POLICY "Admin can view all requests" ON public.expert_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND role = 'admin'));

-- Farmers can create requests
CREATE POLICY "Farmers can create requests" ON public.expert_requests
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

-- Experts can update requests assigned to them (status, response, etc.)
CREATE POLICY "Experts can update assigned requests" ON public.expert_requests
  FOR UPDATE USING (auth.uid() = expert_id);

-- Admin can update any request
CREATE POLICY "Admin can update any request" ON public.expert_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND role = 'admin'));

-- Farmers can delete their own pending requests (if no response yet)
CREATE POLICY "Farmers can delete own pending requests" ON public.expert_requests
  FOR DELETE USING (auth.uid() = farmer_id AND status IN ('pending', 'assigned'));

-- Expert Request Messages Policies:
-- Participants (farmer or assigned expert of the parent request) can view messages
CREATE POLICY "Request participants can view messages" ON public.expert_request_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT farmer_id FROM public.expert_requests WHERE request_id = expert_request_messages.request_id
    ) OR auth.uid() IN (
      SELECT expert_id FROM public.expert_requests WHERE request_id = expert_request_messages.request_id
    )
  );

-- Participants can send messages
CREATE POLICY "Request participants can send messages" ON public.expert_request_messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT farmer_id FROM public.expert_requests WHERE request_id = expert_request_messages.request_id
    ) OR auth.uid() IN (
      SELECT expert_id FROM public.expert_requests WHERE request_id = expert_request_messages.request_id
    )
  );

-- ============================================================
-- Indexes for Performance
-- ============================================================

CREATE INDEX idx_expert_requests_farmer ON public.expert_requests(farmer_id);
CREATE INDEX idx_expert_requests_expert ON public.expert_requests(expert_id);
CREATE INDEX idx_expert_requests_status ON public.expert_requests(status);
CREATE INDEX idx_expert_requests_category ON public.expert_requests(category);
CREATE INDEX idx_expert_requests_created ON public.expert_requests(created_at DESC);

CREATE INDEX idx_expert_request_messages_request ON public.expert_request_messages(request_id);
CREATE INDEX idx_expert_request_messages_sender ON public.expert_request_messages(sender_id);
CREATE INDEX idx_expert_request_messages_created ON public.expert_request_messages(created_at DESC);

-- ============================================================
-- Trigger: update updated_at on expert_requests
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_expert_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expert_requests_updated_at
  BEFORE UPDATE ON public.expert_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_expert_request_updated_at();

-- ============================================================
-- Helper Function: Assign request to an available expert (round-robin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_request_to_expert(request_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expert_user_id UUID;
BEGIN
  -- Find an available extension officer (least active requests)
  SELECT user_id INTO expert_user_id
  FROM public.users
  WHERE role = 'extension_officer'
  ORDER BY (
    SELECT COUNT(*) FROM public.expert_requests
    WHERE expert_id = users.user_id
    AND status NOT IN ('resolved', 'closed')
  ) ASC
  LIMIT 1;

  IF expert_user_id IS NOT NULL THEN
    UPDATE public.expert_requests
    SET expert_id = expert_user_id,
        status = 'assigned',
        assigned_at = now(),
        updated_at = now()
    WHERE request_id = request_uuid;
  END IF;

  RETURN expert_user_id;
END;
$$;
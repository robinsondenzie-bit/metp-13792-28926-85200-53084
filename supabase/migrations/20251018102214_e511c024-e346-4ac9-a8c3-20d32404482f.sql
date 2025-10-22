-- Add wallet_topups table for manual payments
CREATE TABLE public.wallet_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cashapp', 'applepay', 'zelle')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 100),
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own topups"
  ON public.wallet_topups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own topups"
  ON public.wallet_topups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all topups"
  ON public.wallet_topups FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update topups"
  ON public.wallet_topups FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin cash handles table
CREATE TABLE public.admin_cash_handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL CHECK (method IN ('cashapp', 'applepay', 'zelle')),
  handle TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_cash_handles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cash handles"
  ON public.admin_cash_handles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active handles"
  ON public.admin_cash_handles FOR SELECT
  USING (is_active = true);

-- Add manual payments table
CREATE TABLE public.manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL CHECK (method IN ('cashapp', 'applepay', 'zelle')),
  handle TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment codes"
  ON public.manual_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view unused codes"
  ON public.manual_payments FOR SELECT
  USING (used = false);

-- Add release_approved_at to orders table
ALTER TABLE public.orders
  ADD COLUMN release_approved_at TIMESTAMP WITH TIME ZONE;

-- Insert some default admin handles (you can customize these)
INSERT INTO public.admin_cash_handles (method, handle) VALUES
  ('cashapp', '$metapay'),
  ('applepay', '+1234567890'),
  ('zelle', 'admin@metapay.com');
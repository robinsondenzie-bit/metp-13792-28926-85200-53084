-- Create enum for bank account types
CREATE TYPE bank_account_type AS ENUM ('CHECKING', 'SAVINGS');

-- Create enum for bank verification status
CREATE TYPE bank_verification_status AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- Create cards table (stores tokenized card data)
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL, -- simulated vault token
  last4 TEXT NOT NULL,
  brand TEXT NOT NULL, -- visa, mastercard, amex, discover
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  zip TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create banks table (stores encrypted bank account data)
CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  routing_number TEXT NOT NULL, -- encrypted
  account_number TEXT NOT NULL, -- encrypted
  account_mask TEXT NOT NULL, -- ••••1234
  account_type bank_account_type DEFAULT 'CHECKING',
  status bank_verification_status DEFAULT 'PENDING',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update transactions table to support new types
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('CARD_LOAD', 'PAYOUT', 'SENT', 'RECEIVED', 'REQUEST', 'REQUEST_PAID', 'REQUEST_DECLINED', 'ADMIN_DEPOSIT'));

-- Add reference columns for cards and banks
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.cards(id),
  ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id),
  ADD COLUMN IF NOT EXISTS payout_speed TEXT, -- 'STANDARD' or 'SAME_DAY'
  ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMP WITH TIME ZONE;

-- Enable RLS on cards table
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Cards policies
CREATE POLICY "Users can view own cards"
  ON public.cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON public.cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON public.cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
  ON public.cards FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on banks table
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Banks policies
CREATE POLICY "Users can view own banks"
  ON public.banks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own banks"
  ON public.banks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own banks"
  ON public.banks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own banks"
  ON public.banks FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policies for cards
CREATE POLICY "Admins can view all cards"
  ON public.cards FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admin policies for banks
CREATE POLICY "Admins can view all banks"
  ON public.banks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Add approval status and admin fields to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'APPROVED',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for pending transactions
CREATE INDEX IF NOT EXISTS idx_transactions_approval_status 
ON public.transactions(approval_status) 
WHERE approval_status = 'PENDING';

-- Create function to ensure new wallets start at $0
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance_cents, pending_cents, on_hold_cents)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$;

-- Create trigger for automatic wallet creation with $0 balance
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_wallet();

-- Add RLS policy for admins to approve transactions
CREATE POLICY "Admins can update transaction approval status"
ON public.transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
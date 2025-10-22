-- Create helper functions for balance management
CREATE OR REPLACE FUNCTION public.increment_balance(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.wallets
  SET balance_cents = balance_cents + amount,
      updated_at = now()
  WHERE wallets.user_id = increment_balance.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_balance(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.wallets
  SET balance_cents = balance_cents - amount,
      updated_at = now()
  WHERE wallets.user_id = decrement_balance.user_id;
END;
$$;
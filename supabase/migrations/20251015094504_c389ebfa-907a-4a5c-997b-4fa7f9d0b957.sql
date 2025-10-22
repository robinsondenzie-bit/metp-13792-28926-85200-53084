-- Fix the function to have secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance_cents, pending_cents, on_hold_cents)
  VALUES (NEW.id, 0, 0, 0);
  RETURN NEW;
END;
$$;
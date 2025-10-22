-- Create trigger to auto-create profile and wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_handle TEXT;
BEGIN
  -- Generate random handle from email
  random_handle := split_part(NEW.email, '@', 1) || floor(random() * 10000)::text;
  
  -- Insert profile
  INSERT INTO public.profiles (id, handle, full_name, avatar_url)
  VALUES (
    NEW.id,
    random_handle,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULL
  );
  
  -- Insert wallet with $0.00 balance
  INSERT INTO public.wallets (user_id, balance_cents, pending_cents, on_hold_cents)
  VALUES (NEW.id, 0, 0, 0);
  
  -- Assign user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
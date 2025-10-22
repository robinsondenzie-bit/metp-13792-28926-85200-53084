-- Fix all functions to have secure search_path

-- Drop the redundant wallet creation function since handle_new_user already creates wallets
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_wallet();

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
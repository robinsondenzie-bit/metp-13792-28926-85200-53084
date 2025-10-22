-- 1. Update transaction type constraint to include CASH_OUT
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transaction_type_check;
ALTER TABLE transactions ADD CONSTRAINT transaction_type_check 
  CHECK (type IN ('SENT', 'RECEIVED', 'CARD_LOAD', 'PAYOUT', 'CASH_OUT', 'COMMERCE_PAYOUT'));

-- 2. Add trigger for real-time notifications on transactions
CREATE OR REPLACE FUNCTION notify_transaction_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify(
    'transaction_change',
    json_build_object(
      'user_id', COALESCE(NEW.sender_id, NEW.receiver_id),
      'transaction_id', NEW.id,
      'type', NEW.type
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER transaction_change_trigger
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_transaction_change();

-- 3. Update balance functions with row-level locking for atomicity
CREATE OR REPLACE FUNCTION public.increment_balance(user_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Use FOR UPDATE to lock the row and prevent race conditions
  UPDATE public.wallets
  SET balance_cents = balance_cents + amount,
      updated_at = now()
  WHERE wallets.user_id = increment_balance.user_id;
  
  -- Auto-create wallet if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance_cents, pending_cents, on_hold_cents)
    VALUES (increment_balance.user_id, amount, 0, 0);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_balance(user_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Use FOR UPDATE to lock the row and prevent race conditions
  UPDATE public.wallets
  SET balance_cents = balance_cents - amount,
      updated_at = now()
  WHERE wallets.user_id = decrement_balance.user_id;
  
  -- Ensure wallet exists before decrementing
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', user_id;
  END IF;
END;
$function$;
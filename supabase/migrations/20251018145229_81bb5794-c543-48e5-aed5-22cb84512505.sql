-- Fix function search path
DROP FUNCTION IF EXISTS public.notify_dashboard_update() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_dashboard_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('dashboard_update', json_build_object(
    'userId', COALESCE(NEW.user_id, OLD.user_id),
    'type', TG_OP
  )::text);
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER escrow_hold_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.escrow_hold
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_update();
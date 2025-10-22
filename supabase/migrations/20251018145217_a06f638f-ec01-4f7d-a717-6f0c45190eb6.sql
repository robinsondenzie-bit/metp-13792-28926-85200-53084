-- Create escrow_hold table for order escrow
CREATE TABLE IF NOT EXISTS public.escrow_hold (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_hold ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- RLS policies for escrow_hold
CREATE POLICY "Users can view own escrow records"
  ON public.escrow_hold FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "System can insert escrow records"
  ON public.escrow_hold FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all escrow records"
  ON public.escrow_hold FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update escrow records"
  ON public.escrow_hold FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for shipments
CREATE POLICY "Users can view shipments for their orders"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = shipments.order_id 
      AND (orders.seller_id = auth.uid() OR orders.buyer_id = auth.uid())
    )
  );

CREATE POLICY "Sellers can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_id 
      AND orders.seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all shipments"
  ON public.shipments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_hold;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;

-- Trigger for dashboard updates
CREATE OR REPLACE FUNCTION public.notify_dashboard_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('dashboard_update', json_build_object(
    'userId', COALESCE(NEW.user_id, OLD.user_id),
    'type', TG_OP
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_hold_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.escrow_hold
  FOR EACH ROW EXECUTE FUNCTION public.notify_dashboard_update();
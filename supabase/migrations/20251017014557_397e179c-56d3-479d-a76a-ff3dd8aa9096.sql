-- Create orders table with escrow flow
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID_AWAITING_SHIPMENT, SHIPPED, COMPLETED, CANCELLED
  item_description TEXT NOT NULL,
  tracking_number TEXT,
  shipping_carrier TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Sellers can view their sales
CREATE POLICY "Sellers can view their orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Buyers can create orders
CREATE POLICY "Buyers can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Sellers can update their orders (shipping info)
CREATE POLICY "Sellers can update shipping info"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id);

-- Admins can update any order
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp trigger
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
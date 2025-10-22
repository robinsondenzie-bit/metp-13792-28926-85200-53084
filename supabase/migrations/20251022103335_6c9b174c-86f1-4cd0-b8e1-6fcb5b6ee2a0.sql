-- Update order status enum to match new workflow
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('PENDING_PAYMENT', 'PENDING_SHIPMENT', 'SHIPPED', 'AWAITING_RELEASE', 'COMPLETED', 'CANCELLED'));

-- Add new timestamp columns for tracking workflow stages
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Update existing PENDING orders to PENDING_PAYMENT
UPDATE orders 
SET status = 'PENDING_PAYMENT' 
WHERE status = 'PENDING';

-- Update existing SHIPPED orders that have release approval to AWAITING_RELEASE
UPDATE orders 
SET status = 'AWAITING_RELEASE' 
WHERE status = 'SHIPPED' AND release_approved_at IS NOT NULL;
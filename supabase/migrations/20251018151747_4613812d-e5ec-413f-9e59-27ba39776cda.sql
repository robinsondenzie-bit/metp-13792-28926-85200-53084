-- Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transaction_type_check;

-- Add new constraint with all transaction types
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN (
    'SENT',
    'RECEIVED',
    'TRANSFER',
    'ORDER',
    'CARD_LOAD', 
    'BANK_LOAD',
    'APPLEPAY_LOAD',
    'CASHAPP_LOAD',
    'ZELLE_LOAD',
    'PAYOUT',
    'CASHOUT',
    'COMMERCE_PAYOUT'
  ));

-- Add receipt_url column for payment proof
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add payment_sent column to track if user marked payment as sent  
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_sent BOOLEAN DEFAULT false;

-- Add payment_sent_at timestamp
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMP WITH TIME ZONE;
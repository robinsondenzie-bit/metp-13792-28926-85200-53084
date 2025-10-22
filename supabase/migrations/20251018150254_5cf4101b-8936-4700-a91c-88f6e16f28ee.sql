-- Fix transaction type constraint to include all payment methods
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transaction_type_check;
ALTER TABLE transactions ADD CONSTRAINT transaction_type_check 
  CHECK (type IN (
    'SENT', 
    'RECEIVED', 
    'CARD_LOAD', 
    'BANK_LOAD',
    'APPLEPAY_LOAD',
    'CASHAPP_LOAD',
    'ZELLE_LOAD',
    'PAYOUT', 
    'CASH_OUT', 
    'COMMERCE_PAYOUT'
  ));
# Auto-Release Payment Cron Setup

To enable automatic payment release 24 hours after shipping, you need to set up a scheduled job that calls the `release-payment` edge function.

## Option 1: Using Supabase pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the release-payment function to run every hour
SELECT cron.schedule(
  'auto-release-payments',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://rmnwlerwklcuithxmekl.supabase.co/functions/v1/release-payment',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

## Option 2: External Cron Service

If you prefer an external service (like GitHub Actions, Render Cron, or similar):

```bash
# Schedule this HTTP POST request to run every hour
curl -X POST https://rmnwlerwklcuithxmekl.supabase.co/functions/v1/release-payment \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Manual Release

Admins can also manually trigger payment release by calling:

```bash
curl -X POST https://rmnwlerwklcuithxmekl.supabase.co/functions/v1/release-payment
```

## How It Works

1. The function checks for orders in "SHIPPED" status
2. Orders shipped more than 24 hours ago are eligible
3. For each eligible order:
   - Creates a PAYOUT transaction
   - Credits the seller's wallet
   - Marks the order as COMPLETED
   - Records the completion timestamp

## Monitoring

Check the edge function logs in the Supabase dashboard to monitor automatic releases:
- Navigate to Edge Functions > release-payment > Logs

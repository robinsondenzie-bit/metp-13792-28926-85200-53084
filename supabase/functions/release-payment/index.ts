import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting payment release check...');

    // Find all orders that were shipped more than 24h ago, admin approved, and not yet completed
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: eligibleOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'AWAITING_RELEASE')
      .not('delivered_at', 'is', null)
      .lt('delivered_at', twentyFourHoursAgo);

    if (fetchError) {
      console.error('Error fetching orders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${eligibleOrders?.length || 0} orders eligible for payment release`);

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orders eligible for release',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const order of eligibleOrders) {
      try {
        console.log(`Processing order ${order.id} for seller ${order.seller_id}`);

        // Get seller's bank account
        const { data: banks, error: bankError } = await supabase
          .from('banks')
          .select('*')
          .eq('user_id', order.seller_id)
          .eq('status', 'VERIFIED')
          .limit(1);

        if (bankError) {
          console.error(`Bank fetch error for order ${order.id}:`, bankError);
          errorCount++;
          continue;
        }

        if (!banks || banks.length === 0) {
          console.log(`No verified bank for seller ${order.seller_id}`);
          errorCount++;
          continue;
        }

        const bank = banks[0];

        // Create payout transaction
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            sender_id: null,
            receiver_id: order.seller_id,
            type: 'PAYOUT',
            amount_cents: order.amount_cents,
            fee_cents: 0,
            status: 'COMPLETED',
            approval_status: 'APPROVED',
            bank_id: bank.id,
            memo: `Escrow release for order ${order.id}`,
          });

        if (txError) {
          console.error(`Transaction error for order ${order.id}:`, txError);
          errorCount++;
          continue;
        }

        // Credit seller's wallet
        const { error: walletError } = await supabase.rpc('increment_balance', {
          user_id: order.seller_id,
          amount: order.amount_cents,
        });

        if (walletError) {
          console.error(`Wallet error for order ${order.id}:`, walletError);
          errorCount++;
          continue;
        }

        // Mark order as completed
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`Update error for order ${order.id}:`, updateError);
          errorCount++;
          continue;
        }

        console.log(`✓ Successfully released payment for order ${order.id}`);
        processedCount++;
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        errorCount++;
      }
    }

    console.log(`Payment release complete: ${processedCount} succeeded, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment release completed',
        processed: processedCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Release payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

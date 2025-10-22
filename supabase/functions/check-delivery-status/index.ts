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

    console.log('Checking delivery status for shipped orders...');

    // Find all shipped orders
    const { data: shippedOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'SHIPPED')
      .not('shipped_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching orders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${shippedOrders?.length || 0} shipped orders to check`);

    if (!shippedOrders || shippedOrders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No shipped orders to check',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;

    for (const order of shippedOrders) {
      try {
        // Check if order has been shipped for more than 7 days (auto-mark as delivered)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const shippedDate = new Date(order.shipped_at);

        if (shippedDate < sevenDaysAgo) {
          console.log(`Auto-marking order ${order.id} as delivered (shipped > 7 days ago)`);

          // Update order to AWAITING_RELEASE
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'AWAITING_RELEASE',
              delivered_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`Update error for order ${order.id}:`, updateError);
            continue;
          }

          console.log(`✓ Order ${order.id} marked as delivered and awaiting release`);
          processedCount++;
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }

    console.log(`Delivery check complete: ${processedCount} orders marked as delivered`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Delivery check completed',
        processed: processedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check delivery status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

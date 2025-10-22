import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error('Order ID required');
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.buyer_id !== user.id) {
      throw new Error('Only the buyer can mark payment as complete');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error('Order must be pending payment');
    }

    // Update order to PENDING_SHIPMENT
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'PENDING_SHIPMENT',
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    console.log('Order marked as paid:', { orderId, buyerId: user.id });

    return new Response(
      JSON.stringify({ success: true, message: 'Payment confirmed, awaiting shipment' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    // Verify admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      throw new Error('Admin access required');
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

    if (order.status !== 'AWAITING_RELEASE') {
      throw new Error('Order must be awaiting release before funds can be released');
    }

    // Get escrow records
    const { data: escrowRecords } = await supabase
      .from('escrow_hold')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'held');

    if (!escrowRecords || escrowRecords.length === 0) {
      throw new Error('No held escrow found for this order');
    }

    // Find seller's escrow record (positive amount)
    const sellerEscrow = escrowRecords.find(e => e.amount_cents > 0);
    if (!sellerEscrow) {
      throw new Error('Seller escrow record not found');
    }

    // Update escrow records to released
    const { error: escrowUpdateError } = await supabase
      .from('escrow_hold')
      .update({
        status: 'released',
        released_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (escrowUpdateError) throw escrowUpdateError;

    // Add funds to seller's wallet
    const { error: walletError } = await supabase.rpc('increment_balance', {
      user_id: sellerEscrow.seller_id,
      amount: sellerEscrow.amount_cents
    });

    if (walletError) throw walletError;

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        release_approved_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    console.log('Escrow released:', { orderId, sellerId: sellerEscrow.seller_id, amount: sellerEscrow.amount_cents });

    return new Response(
      JSON.stringify({ success: true, message: 'Escrow released and funds transferred to seller' }),
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

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

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      throw new Error('Admin access required');
    }

    const { orderId, approved } = await req.json();

    if (!orderId || approved === undefined) {
      throw new Error('Missing required fields');
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('seller_id, item_description, tracking_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (approved) {
      // Approve tracking and mark as shipped
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'SHIPPED',
          release_approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Notify seller
      await supabase
        .from('notifications')
        .insert({
          user_id: order.seller_id,
          type: 'TRACKING_APPROVED',
          title: 'Tracking Information Verified',
          message: `Your tracking information for "${order.item_description}" has been verified. Item marked as shipped.`,
          order_id: orderId
        });

      console.log('Tracking approved:', { orderId, trackingNumber: order.tracking_number });
    } else {
      // Reject tracking and reset to pending shipment
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'PENDING_SHIPMENT',
          tracking_number: null,
          shipping_carrier: null,
          shipped_at: null
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Delete shipment record
      await supabase
        .from('shipments')
        .delete()
        .eq('order_id', orderId);

      // Notify seller
      await supabase
        .from('notifications')
        .insert({
          user_id: order.seller_id,
          type: 'TRACKING_REJECTED',
          title: 'Tracking Information Rejected',
          message: `Your tracking information for "${order.item_description}" was rejected. Please submit correct tracking details.`,
          order_id: orderId
        });

      console.log('Tracking rejected:', { orderId });
    }

    return new Response(
      JSON.stringify({ success: true, message: approved ? 'Tracking approved' : 'Tracking rejected' }),
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

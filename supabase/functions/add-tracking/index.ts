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

    const { orderId, carrier, trackingNumber } = await req.json();

    if (!orderId || !carrier || !trackingNumber) {
      throw new Error('Missing required fields');
    }

    // Verify user is the seller and order is pending shipment
    const { data: order } = await supabase
      .from('orders')
      .select('seller_id, status')
      .eq('id', orderId)
      .single();

    if (!order || order.seller_id !== user.id) {
      throw new Error('Not authorized to add tracking to this order');
    }

    if (order.status !== 'PENDING_SHIPMENT' && order.status !== 'PENDING_PAYMENT') {
      throw new Error('Order must be pending shipment to add tracking');
    }

    // Insert shipment record
    const { error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id: orderId,
        carrier,
        tracking_number: trackingNumber
      });

    if (shipmentError) throw shipmentError;

    // Update order status to shipped
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'SHIPPED',
        shipped_at: new Date().toISOString(),
        shipping_carrier: carrier,
        tracking_number: trackingNumber
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Notify admins about tracking submission
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'TRACKING_SUBMITTED',
        title: 'New Tracking Info Submitted',
        message: `Order ${orderId.substring(0, 8)}... has tracking info ready for verification`,
        order_id: orderId
      }));

      await supabase.from('notifications').insert(adminNotifications);
    }

    console.log('Tracking added:', { orderId, carrier, trackingNumber });

    return new Response(
      JSON.stringify({ success: true }),
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

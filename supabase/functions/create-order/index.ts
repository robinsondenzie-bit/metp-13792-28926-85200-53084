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

    const { sellerHandle, amountCents, itemDescription } = await req.json();

    if (!sellerHandle || !amountCents || !itemDescription) {
      throw new Error('Missing required fields');
    }

    // Look up seller by handle
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', sellerHandle)
      .single();

    if (sellerError || !sellerProfile) {
      throw new Error('Seller not found');
    }

    const sellerId = sellerProfile.id;

    // Verify buyer has sufficient balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_cents')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance_cents < amountCents) {
      throw new Error('Insufficient balance');
    }

    // Create order with PENDING_PAYMENT status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        amount_cents: amountCents,
        item_description: itemDescription,
        status: 'PENDING_PAYMENT'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create escrow holds (negative for buyer, positive for seller)
    const { error: escrowError } = await supabase
      .from('escrow_hold')
      .insert([
        {
          user_id: user.id,
          order_id: order.id,
          seller_id: sellerId,
          amount_cents: -amountCents,
          status: 'held'
        },
        {
          user_id: sellerId,
          order_id: order.id,
          seller_id: sellerId,
          amount_cents: amountCents,
          status: 'held'
        }
      ]);

    if (escrowError) throw escrowError;

    // Deduct from buyer's wallet
    const { error: walletError } = await supabase.rpc('decrement_balance', {
      user_id: user.id,
      amount: amountCents
    });

    if (walletError) throw walletError;

    console.log('Order created with escrow:', { orderId: order.id, buyerId: user.id, sellerId, amount: amountCents });

    return new Response(
      JSON.stringify({ success: true, order }),
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

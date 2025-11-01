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
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { topupId, action } = await req.json();

    console.log('Admin approving topup:', { topupId, action, adminId: user.id });

    // Get topup details
    const { data: topup, error: topupError } = await supabase
      .from('wallet_topups')
      .select('*')
      .eq('id', topupId)
      .single();

    if (topupError || !topup) {
      throw new Error('Topup not found');
    }

    if (action === 'approve') {
      // Update wallet balance
      const { error: balanceError } = await supabase.rpc('increment_balance', {
        user_id: topup.user_id,
        amount: topup.amount_cents,
      });

      if (balanceError) throw balanceError;

      // Create transaction record for the topup
      const { error: txnError } = await supabase
        .from('transactions')
        .insert({
          receiver_id: topup.user_id,
          type: 'TOPUP',
          amount_cents: topup.amount_cents,
          fee_cents: 0,
          status: 'COMPLETED',
          approval_status: 'APPROVED',
          memo: `Wallet top-up via ${topup.method.toUpperCase()} - Code: ${topup.code}`,
        });

      if (txnError) {
        console.error('Error creating transaction:', txnError);
        // Don't fail the whole operation if transaction creation fails
      }

      // Mark topup as approved
      const { error: updateError } = await supabase
        .from('wallet_topups')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', topupId);

      if (updateError) throw updateError;

      console.log('Topup approved successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Topup approved successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'reject') {
      // Mark topup as rejected
      const { error: updateError } = await supabase
        .from('wallet_topups')
        .update({
          status: 'rejected',
          approved_by: user.id,
        })
        .eq('id', topupId);

      if (updateError) throw updateError;

      console.log('Topup rejected');

      return new Response(
        JSON.stringify({ success: true, message: 'Topup rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

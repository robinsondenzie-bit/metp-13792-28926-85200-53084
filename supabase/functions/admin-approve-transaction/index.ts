import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transactionId, action, rejectionReason } = await req.json();

    if (!transactionId || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get transaction details
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txnError || !txn) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (txn.approval_status !== 'PENDING') {
      return new Response(JSON.stringify({ error: 'Transaction already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'APPROVE') {
      // Update balances based on transaction type
      if (txn.type === 'RECEIVED' || txn.type === 'CARD_LOAD') {
        // Credit receiver
        await supabase.rpc('increment_balance', {
          user_id: txn.receiver_id,
          amount: txn.amount_cents,
        });
      } else if (txn.type === 'SENT') {
        // Debit sender, credit receiver
        await supabase.rpc('decrement_balance', {
          user_id: txn.sender_id,
          amount: txn.amount_cents + txn.fee_cents,
        });
        await supabase.rpc('increment_balance', {
          user_id: txn.receiver_id,
          amount: txn.amount_cents,
        });
      } else if (txn.type === 'PAYOUT' || txn.type === 'CASH_OUT') {
        // Debit sender
        await supabase.rpc('decrement_balance', {
          user_id: txn.sender_id,
          amount: txn.amount_cents + txn.fee_cents,
        });
      }

      // Update transaction
      await supabase
        .from('transactions')
        .update({
          approval_status: 'APPROVED',
          status: 'COMPLETED',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      return new Response(
        JSON.stringify({ success: true, message: 'Transaction approved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'REJECT') {
      // Just update status
      await supabase
        .from('transactions')
        .update({
          approval_status: 'REJECTED',
          status: 'FAILED',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'Rejected by admin',
        })
        .eq('id', transactionId);

      return new Response(
        JSON.stringify({ success: true, message: 'Transaction rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
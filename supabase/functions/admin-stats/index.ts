import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total deposited (sum of all wallets)
    const { data: wallets } = await supabase
      .from('wallets')
      .select('balance_cents');

    const totalDeposited = wallets?.reduce((sum, w) => sum + w.balance_cents, 0) || 0;

    // Get 30-day transaction volume
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTxns } = await supabase
      .from('transactions')
      .select('amount_cents')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const txnVolume30d = recentTxns?.reduce((sum, t) => sum + Math.abs(t.amount_cents), 0) || 0;

    // Get active today count (users with transactions today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTxns } = await supabase
      .from('transactions')
      .select('sender_id, receiver_id')
      .gte('created_at', today.toISOString());

    const activeUserIds = new Set();
    todayTxns?.forEach(t => {
      if (t.sender_id) activeUserIds.add(t.sender_id);
      if (t.receiver_id) activeUserIds.add(t.receiver_id);
    });

    return new Response(
      JSON.stringify({
        totalUsers: totalUsers || 0,
        totalDeposited,
        txnVolume30d,
        activeToday: activeUserIds.size,
      }),
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

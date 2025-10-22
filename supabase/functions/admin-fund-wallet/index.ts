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

    const { userHandle, amountCents, note } = await req.json();

    console.log('Admin funding wallet:', { userHandle, amountCents, note });

    // Get target user
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', userHandle)
      .single();

    if (!targetProfile) {
      throw new Error('User not found');
    }

    // Get or create wallet
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', targetProfile.id)
      .single();

    if (existingWallet) {
      // Update existing wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance_cents: existingWallet.balance_cents + amountCents,
        })
        .eq('user_id', targetProfile.id);

      if (updateError) throw updateError;
    } else {
      // Create new wallet
      const { error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: targetProfile.id,
          balance_cents: amountCents,
        });

      if (insertError) throw insertError;
    }

    // Record admin deposit
    const { error: depositError } = await supabase
      .from('admin_deposits')
      .insert({
        admin_id: user.id,
        user_id: targetProfile.id,
        amount_cents: amountCents,
        note,
      });

    if (depositError) throw depositError;

    console.log('Wallet funded successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Wallet funded successfully' }),
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

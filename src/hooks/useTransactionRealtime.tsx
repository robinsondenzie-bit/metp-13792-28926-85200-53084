import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useTransactionRealtime = (onTransactionChange: () => void) => {
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('transaction-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `sender_id=eq.${user.id}`,
          },
          () => {
            // Debounce to avoid thundering herd
            setTimeout(() => {
              onTransactionChange();
            }, 300);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            // Debounce to avoid thundering herd
            setTimeout(() => {
              onTransactionChange();
            }, 300);
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [onTransactionChange]);
};

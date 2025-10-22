import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useDashboardRealtime = (onUpdate: () => void) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const handleUpdate = useCallback(() => {
    // Debounce to avoid thundering herd
    setTimeout(() => {
      onUpdate();
    }, 300);
  }, [onUpdate]);

  useEffect(() => {
    let mounted = true;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Set up WebSocket channel for escrow_hold changes
      channelRef.current = supabase
        .channel('dashboard-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'escrow_hold',
            filter: `user_id=eq.${user.id}`,
          },
          handleUpdate
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'escrow_hold',
            filter: `seller_id=eq.${user.id}`,
          },
          handleUpdate
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shipments',
          },
          handleUpdate
        )
        .subscribe((status) => {
          console.log('Dashboard realtime subscription status:', status);
        });

      // Fallback polling every 8 seconds
      pollIntervalRef.current = window.setInterval(() => {
        if (mounted) {
          handleUpdate();
        }
      }, 8000);
    };

    setupRealtimeSubscription();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [handleUpdate]);
};

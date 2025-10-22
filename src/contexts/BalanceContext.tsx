import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BalanceBreakdown } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useTransactionRealtime } from '@/hooks/useTransactionRealtime';

interface BalanceContextType {
  balance: BalanceBreakdown;
  refresh: () => Promise<void>;
  updateBalance: (amount: number) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState<BalanceBreakdown>({
    available: 0,
    pending: 0,
    onHold: 0,
    total: 0
  });

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wallets')
        .select('balance_cents, pending_cents, on_hold_cents')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setBalance({
          available: data.balance_cents,
          pending: data.pending_cents,
          onHold: data.on_hold_cents,
          total: data.balance_cents + data.pending_cents + data.on_hold_cents
        });
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  useTransactionRealtime(loadBalance);

  const updateBalance = (amount: number) => {
    setBalance(prev => ({
      ...prev,
      available: prev.available + amount,
      total: prev.total + amount,
    }));
  };

  return (
    <BalanceContext.Provider value={{ balance, refresh: loadBalance, updateBalance }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error('useBalance must be used within BalanceProvider');
  }
  return context;
};

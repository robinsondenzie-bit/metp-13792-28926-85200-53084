import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Transaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useTransactionRealtime } from '@/hooks/useTransactionRealtime';

interface ActivityContextType {
  transactions: Transaction[];
  append: (transaction: Transaction) => void;
  filter: 'ALL' | 'SENT' | 'RECEIVED' | 'COMMERCE_PAYOUT';
  setFilter: (filter: 'ALL' | 'SENT' | 'RECEIVED' | 'COMMERCE_PAYOUT') => void;
  refresh: () => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'SENT' | 'RECEIVED' | 'COMMERCE_PAYOUT'>('ALL');

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          sender:profiles!sender_id(handle, full_name),
          receiver:profiles!receiver_id(handle, full_name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform database transactions to match UI format
      const transformedData: Transaction[] = (data || []).map((txn: any) => {
        const isSender = txn.sender_id === user.id;
        const isReceiver = txn.receiver_id === user.id;
        
        let type: 'SENT' | 'RECEIVED' | 'COMMERCE_PAYOUT' = 'SENT';
        let counterparty = 'System';
        let amount = txn.amount_cents;
        
        // Handle TRANSFER type (person-to-person payments)
        if (txn.type === 'TRANSFER' && isReceiver) {
          type = 'RECEIVED';
          counterparty = txn.sender?.full_name || txn.sender?.handle || 'Unknown';
          amount = txn.amount_cents;
        } else if (txn.type === 'TRANSFER' && isSender) {
          type = 'SENT';
          counterparty = txn.receiver?.full_name || txn.receiver?.handle || 'Unknown';
          amount = -txn.amount_cents;
        }
        // Handle legacy SENT/RECEIVED types
        else if (txn.type === 'SENT' && isSender) {
          type = 'SENT';
          counterparty = txn.receiver?.full_name || txn.receiver?.handle || 'Unknown';
          amount = -txn.amount_cents;
        } else if (txn.type === 'SENT' && isReceiver) {
          type = 'RECEIVED';
          counterparty = txn.sender?.full_name || txn.sender?.handle || 'Unknown';
          amount = txn.amount_cents;
        } else if (txn.type === 'RECEIVED' && isReceiver) {
          type = 'RECEIVED';
          counterparty = txn.sender?.full_name || txn.sender?.handle || 'Unknown';
          amount = txn.amount_cents;
        } else if (txn.type === 'RECEIVED' && isSender) {
          type = 'SENT';
          counterparty = txn.receiver?.full_name || txn.receiver?.handle || 'Unknown';
          amount = -txn.amount_cents;
        }
        // Handle ORDER type (marketplace orders)
        else if (txn.type === 'ORDER' && isReceiver) {
          type = 'RECEIVED';
          counterparty = txn.sender?.full_name || txn.sender?.handle || 'Buyer';
          amount = txn.amount_cents;
        } else if (txn.type === 'ORDER' && isSender) {
          type = 'SENT';
          counterparty = txn.receiver?.full_name || txn.receiver?.handle || 'Seller';
          amount = -txn.amount_cents;
        }
        // Handle PAYOUT type (cash outs)
        else if (txn.type === 'PAYOUT') {
          type = 'COMMERCE_PAYOUT';
          counterparty = 'Bank Account';
          amount = txn.amount_cents;
        }
        // Handle top-up types
        else if (['CARD_LOAD', 'BANK_LOAD', 'ZELLE_LOAD', 'CASHAPP_LOAD', 'APPLEPAY_LOAD'].includes(txn.type)) {
          type = 'RECEIVED';
          counterparty = 'Top-up';
          amount = txn.amount_cents;
        }
        
        return {
          id: txn.id,
          type,
          amount,
          counterparty,
          date: txn.created_at,
          status: txn.status,
          fee: txn.fee_cents,
          memo: txn.memo || '',
          fundingSource: {
            type: txn.funding_source_type || 'wallet',
            last4: txn.funding_source_last4 || '0000',
          },
          isGoodsSold: txn.is_goods_sold || false,
        };
      });
      
      setTransactions(transformedData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useTransactionRealtime(loadTransactions);

  const append = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  return (
    <ActivityContext.Provider value={{ transactions, append, filter, setFilter, refresh: loadTransactions }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

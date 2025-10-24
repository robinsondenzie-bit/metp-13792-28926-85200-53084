import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpRight, ArrowDownLeft, DollarSign, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  type: string;
  amount_cents: number;
  fee_cents: number;
  status: string;
  created_at: string;
  sender_id?: string;
  receiver_id?: string;
  memo?: string;
  receipt_url?: string;
  is_goods_sold: boolean;
  approval_status: string;
}

export const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SENT' | 'RECEIVED' | 'PAYOUT'>('ALL');

  useEffect(() => {
    loadTransactions();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('transaction-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SENT: 'Sent',
      RECEIVED: 'Received',
      CARD_LOAD: 'Card Load',
      BANK_LOAD: 'Bank Transfer',
      PAYOUT: 'Cash Out',
      CASHOUT: 'Cash Out',
      APPLEPAY_LOAD: 'Apple Pay',
      CASHAPP_LOAD: 'Cash App',
      ZELLE_LOAD: 'Zelle',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string, approvalStatus: string) => {
    if (approvalStatus === 'PENDING') {
      return <Badge variant="outline" className="bg-yellow-500/10">Pending Approval</Badge>;
    }
    if (approvalStatus === 'REJECTED') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (status === 'COMPLETED') {
      return <Badge variant="default" className="bg-success">Completed</Badge>;
    }
    if (status === 'PENDING') {
      return <Badge variant="outline">Processing</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (filter === 'ALL') return true;
    if (filter === 'SENT') return txn.type === 'SENT';
    if (filter === 'RECEIVED') return txn.type === 'RECEIVED';
    if (filter === 'PAYOUT') return txn.type === 'PAYOUT' || txn.type === 'CASHOUT';
    return true;
  });

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold">Transaction History</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Filter: {filter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilter('ALL')}>
              {filter === 'ALL' && '✓ '}All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('SENT')}>
              {filter === 'SENT' && '✓ '}Sent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('RECEIVED')}>
              {filter === 'RECEIVED' && '✓ '}Received
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('PAYOUT')}>
              {filter === 'PAYOUT' && '✓ '}Payouts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          filteredTransactions.map((txn) => {
            const isReceived = txn.type === 'RECEIVED' || txn.type === 'PAYOUT';
            const amount = isReceived ? txn.amount_cents : -txn.amount_cents;

            return (
              <div
                key={txn.id}
                className="p-4 hover:bg-muted/50 transition-colors flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {isReceived ? (
                    <ArrowDownLeft className="h-5 w-5 text-success" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{getTypeLabel(txn.type)}</p>
                    {txn.is_goods_sold && (
                      <Badge variant="outline" className="text-xs">Commerce</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(txn.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  {txn.memo && (
                    <p className="text-xs text-muted-foreground truncate">{txn.memo}</p>
                  )}
                </div>

                <div className="text-right flex flex-col gap-1">
                  <p
                    className={`font-semibold ${
                      amount > 0 ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {amount > 0 ? '+' : ''}
                    {formatCurrency(Math.abs(amount))}
                  </p>
                  {txn.fee_cents > 0 && (
                    <p className="text-xs text-muted-foreground">
                      +{formatCurrency(txn.fee_cents)} fee
                    </p>
                  )}
                  {getStatusBadge(txn.status, txn.approval_status)}
                </div>

                {txn.receipt_url && (
                  <a
                    href={txn.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:opacity-80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Transaction {
  id: string;
  type: string;
  amount_cents: number;
  fee_cents: number;
  created_at: string;
  sender_id?: string;
  receiver_id?: string;
  memo?: string;
  approval_status: string;
  payment_sent?: boolean;
  receipt_url?: string;
}

export const PendingTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    txnId: string;
    reason: string;
  }>({ open: false, txnId: '', reason: '' });

  useEffect(() => {
    loadPendingTransactions();
    
    // Subscribe to changes
    const channel = supabase
      .channel('pending-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'approval_status=eq.PENDING',
        },
        () => {
          loadPendingTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('approval_status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      toast.error('Failed to load pending transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (txnId: string) => {
    setProcessingId(txnId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('admin-approve-transaction', {
        body: { transactionId: txnId, action: 'APPROVE' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast.success('Transaction approved');
      loadPendingTransactions();
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast.error('Failed to approve transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    const { txnId, reason } = rejectDialog;
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessingId(txnId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await supabase.functions.invoke('admin-approve-transaction', {
        body: { transactionId: txnId, action: 'REJECT', rejectionReason: reason },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast.success('Transaction rejected');
      setRejectDialog({ open: false, txnId: '', reason: '' });
      loadPendingTransactions();
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      toast.error('Failed to reject transaction');
    } finally {
      setProcessingId(null);
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
      SENT: 'Send Money',
      RECEIVED: 'Receive Money',
      CARD_LOAD: 'Card Load',
      BANK_LOAD: 'Bank Transfer',
      APPLEPAY_LOAD: 'Apple Pay',
      CASHAPP_LOAD: 'Cash App',
      ZELLE_LOAD: 'Zelle',
      PAYOUT: 'Cash Out',
      CASHOUT: 'Cash Out',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No pending transactions</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Receipt</th>
                <th className="text-left p-4 font-medium">Memo</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-muted/50">
                  <td className="p-4">
                    <Badge variant="secondary">{getTypeLabel(txn.type)}</Badge>
                  </td>
                  <td className="p-4 font-semibold">
                    {formatCurrency(txn.amount_cents)}
                    {txn.fee_cents > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (+{formatCurrency(txn.fee_cents)} fee)
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(txn.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    {txn.payment_sent ? (
                      <Badge variant="default" className="bg-success">Payment Sent</Badge>
                    ) : (
                      <Badge variant="outline">Not Confirmed</Badge>
                    )}
                  </td>
                  <td className="p-4">
                    {txn.receipt_url ? (
                      <a
                        href={txn.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View Receipt
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {txn.memo || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(txn.id)}
                        disabled={processingId === txn.id}
                      >
                        {processingId === txn.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setRejectDialog({ open: true, txnId: txn.id, reason: '' })
                        }
                        disabled={processingId === txn.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => 
        setRejectDialog({ ...rejectDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Suspicious activity, insufficient information..."
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog({ ...rejectDialog, reason: e.target.value })
              }
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, txnId: '', reason: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectDialog.reason.trim() || processingId === rejectDialog.txnId}
            >
              {processingId === rejectDialog.txnId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
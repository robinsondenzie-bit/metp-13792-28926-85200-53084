import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount_cents: number;
  fee_cents: number;
  status: string;
  approval_status?: string;
  created_at: string;
  memo?: string;
  receipt_url?: string;
  sender_id?: string;
  receiver_id?: string;
  payment_sent?: boolean;
  payment_sent_at?: string;
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailModal({ transaction, open, onOpenChange }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      SEND: 'Payment Sent',
      RECEIVE: 'Payment Received',
      PAYOUT: 'Cash Out',
      TOPUP: 'Wallet Top-up',
      REFUND: 'Refund',
      FEE: 'Fee',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'PENDING') {
      return <Badge variant="outline">Pending Approval</Badge>;
    }
    if (approvalStatus === 'REJECTED') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      COMPLETED: 'default',
      PENDING: 'secondary',
      FAILED: 'destructive',
      CANCELLED: 'outline',
    };
    
    const labels: { [key: string]: string } = {
      COMPLETED: 'Completed',
      PENDING: 'Pending',
      FAILED: 'Failed',
      CANCELLED: 'Cancelled',
    };
    
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="font-medium">{getTypeLabel(transaction.type)}</span>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-2xl font-bold">{formatCurrency(transaction.amount_cents)}</span>
          </div>
          
          {transaction.fee_cents > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fee</span>
              <span className="font-medium text-muted-foreground">
                {formatCurrency(transaction.fee_cents)}
              </span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {getStatusBadge(transaction.status, transaction.approval_status)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="font-medium">
              {format(new Date(transaction.created_at), 'PPp')}
            </span>
          </div>
          
          {transaction.memo && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Memo</span>
                <p className="text-sm">{transaction.memo}</p>
              </div>
            </>
          )}
          
          {transaction.payment_sent_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Sent</span>
              <span className="font-medium">
                {format(new Date(transaction.payment_sent_at), 'PPp')}
              </span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Transaction ID</span>
            <span className="text-xs font-mono">{transaction.id.slice(0, 8)}...</span>
          </div>
          
          {transaction.receipt_url && (
            <a
              href={transaction.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View Receipt →
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

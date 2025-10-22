import { useState } from 'react';
import { Filter, ArrowUpRight, ArrowDownLeft, ShoppingBag, Copy, AlertCircle, RotateCcw } from 'lucide-react';
import { useActivity } from '@/contexts/ActivityContext';
import { formatCurrency, formatDate } from '@/lib/mock-data';
import { Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

export const TransactionFeed = () => {
  const { transactions, filter, setFilter } = useActivity();
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [payAgainTxn, setPayAgainTxn] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter(txn => {
    if (filter === 'ALL') return true;
    if (filter === 'COMMERCE_PAYOUT') return txn.isGoodsSold;
    return txn.type === filter;
  });

  return (
    <>
      <div className="bg-card rounded-lg shadow-meta">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Activity</h2>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
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
              <DropdownMenuItem onClick={() => setFilter('COMMERCE_PAYOUT')}>
                {filter === 'COMMERCE_PAYOUT' && '✓ '}Commerce payouts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="divide-y divide-border">
          {filteredTransactions.map(txn => (
            <TransactionRow
              key={txn.id}
              transaction={txn}
              onClick={() => setSelectedTxn(txn)}
            />
          ))}
        </div>
      </div>

      <Sheet open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedTxn && (
            <TransactionDetail 
              transaction={selectedTxn} 
              onPayAgain={(txn) => {
                setPayAgainTxn(txn);
                setSelectedTxn(null);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

const TransactionRow = ({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick: () => void;
}) => {
  const getIcon = () => {
    if (transaction.isGoodsSold) {
      return <ShoppingBag className="h-5 w-5 text-orange-500" />;
    }
    if (transaction.type === 'RECEIVED') {
      return <ArrowDownLeft className="h-5 w-5 text-success" />;
    }
    return <ArrowUpRight className="h-5 w-5 text-primary" />;
  };

  const isPositive = transaction.amount > 0;

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{transaction.counterparty}</p>
        <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isPositive ? 'text-success' : 'text-foreground'}`}>
          {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
        </p>
        {transaction.status === 'PENDING' && (
          <p className="text-xs text-muted-foreground">Pending</p>
        )}
      </div>
    </button>
  );
};

const TransactionDetail = ({ 
  transaction, 
  onPayAgain 
}: { 
  transaction: Transaction;
  onPayAgain?: (txn: Transaction) => void;
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: 'Transaction ID copied' });
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'COMPLETED': return 'text-success';
      case 'PENDING': return 'text-orange-500';
      case 'FAILED': return 'text-destructive';
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Transaction Details</SheetTitle>
      </SheetHeader>
      <div className="space-y-6 py-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${transaction.amount > 0 ? 'text-success' : 'text-foreground'}`}>
            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
          </div>
          <div className={`text-sm mt-1 ${getStatusColor()}`}>
            {transaction.status}
          </div>
        </div>

        <div className="space-y-4">
          <DetailRow label="To/From" value={transaction.counterparty} />
          <DetailRow label="Date" value={formatDate(transaction.date)} />
          <DetailRow
            label="Transaction ID"
            value={transaction.id}
            action={() => copyToClipboard(transaction.id)}
            actionIcon={<Copy className="h-4 w-4" />}
          />
          {transaction.fee > 0 && (
            <DetailRow label="Fee" value={formatCurrency(transaction.fee)} />
          )}
          <DetailRow
            label="Funding source"
            value={`${transaction.fundingSource.type} •••• ${transaction.fundingSource.last4}`}
          />
          {transaction.memo && (
            <DetailRow label="Memo" value={transaction.memo} />
          )}
          {transaction.isGoodsSold && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-900 dark:text-orange-200">
                Payment for goods sold through Meta Commerce
              </p>
            </div>
          )}
        </div>

        {transaction.type === 'SENT' && onPayAgain && (
          <Button 
            onClick={() => onPayAgain(transaction)}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Pay Again
          </Button>
        )}

        <button className="w-full text-sm text-destructive hover:underline flex items-center justify-center gap-2 py-2">
          <AlertCircle className="h-4 w-4" />
          Report a problem
        </button>
      </div>
    </>
  );
};

const DetailRow = ({
  label,
  value,
  action,
  actionIcon,
}: {
  label: string;
  value: string;
  action?: () => void;
  actionIcon?: React.ReactNode;
}) => (
  <div className="flex justify-between items-start gap-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm text-right font-medium">{value}</span>
      {action && (
        <button onClick={action} className="text-primary hover:opacity-80">
          {actionIcon}
        </button>
      )}
    </div>
  </div>
);

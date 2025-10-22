import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBalance } from '@/contexts/BalanceContext';
import { formatCurrency } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const BalanceCard = () => {
  const { balance } = useBalance();
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <>
      <div className="bg-card rounded-lg p-4 shadow-meta">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="text-[32px] font-bold leading-none">{formatCurrency(balance.available)}</p>
          <button
            onClick={() => setShowBreakdown(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
          >
            View breakdown
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Balance Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <BalanceRow
              label="Available"
              amount={balance.available}
              tooltip="Funds ready to use immediately"
            />
            <BalanceRow
              label="Pending"
              amount={balance.pending}
              tooltip="Funds being processed"
            />
            <BalanceRow
              label="On hold"
              amount={balance.onHold}
              tooltip="Commerce payouts under review"
            />
            <div className="pt-3 border-t border-border">
              <BalanceRow
                label="Total"
                amount={balance.total}
                tooltip="All funds combined"
                bold
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const BalanceRow = ({
  label,
  amount,
  tooltip,
  bold = false,
}: {
  label: string;
  amount: number;
  tooltip: string;
  bold?: boolean;
}) => (
  <div className="flex justify-between items-center group">
    <div className="flex items-center gap-2">
      <span className={bold ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
      <div className="relative">
        <span className="text-xs text-muted-foreground cursor-help hover:text-foreground">ⓘ</span>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-meta-md z-10">
          {tooltip}
        </div>
      </div>
    </div>
    <span className={bold ? 'font-semibold' : ''}>{formatCurrency(amount)}</span>
  </div>
);

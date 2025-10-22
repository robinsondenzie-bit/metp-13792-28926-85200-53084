import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  onSendPayment: () => void;
}

export const EmptyState = ({ onSendPayment }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Package className="h-12 w-12 text-primary" />
      </div>
      
      <h3 className="text-xl font-bold mb-2">No transactions yet</h3>
      
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        When you send or receive payments, they'll appear here.
      </p>
      
      <Button onClick={onSendPayment}>
        Send your first payment
      </Button>
    </div>
  );
};

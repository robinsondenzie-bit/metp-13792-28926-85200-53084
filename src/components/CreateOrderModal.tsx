import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableBalance: number;
}

export const CreateOrderModal = ({ open, onOpenChange, onSuccess, availableBalance }: CreateOrderModalProps) => {
  const [sellerHandle, setSellerHandle] = useState('');
  const [amount, setAmount] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountCents = Math.round(parseFloat(amount) * 100);
    
    if (isNaN(amountCents) || amountCents <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (amountCents > availableBalance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough balance for this order',
        variant: 'destructive',
      });
      return;
    }

    if (!itemDescription.trim()) {
      toast({
        title: 'Missing Description',
        description: 'Please provide an item description',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('create-order', {
        body: {
          sellerHandle,
          amountCents,
          itemDescription: itemDescription.trim(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Order Created',
        description: 'Funds are now in escrow until shipment is confirmed',
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSellerHandle('');
      setAmount('');
      setItemDescription('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Escrow Order</DialogTitle>
          <DialogDescription>
            Available balance: {formatCurrency(availableBalance)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sellerHandle">Seller Handle</Label>
            <Input
              id="sellerHandle"
              placeholder="Enter seller's handle (e.g., john123)"
              value={sellerHandle}
              onChange={(e) => setSellerHandle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="itemDescription">Item Description</Label>
            <Input
              id="itemDescription"
              placeholder="What are you buying?"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              'Create Order'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

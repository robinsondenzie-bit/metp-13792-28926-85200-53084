import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useActivity } from '@/contexts/ActivityContext';

interface Profile {
  id: string;
  full_name: string;
  handle: string;
  avatar_url: string | null;
}

interface SendPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  availableBalance: number;
}

export const SendPaymentModal = ({ open, onOpenChange, onSuccess, availableBalance }: SendPaymentModalProps) => {
  const { refresh } = useActivity();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, handle, avatar_url')
        .or(`handle.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!selectedRecipient || !amount || parseFloat(amount) <= 0) {
      toast.error('Please select a recipient and enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    const amountCents = Math.round(amountNum * 100);
    
    if (amountCents > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      if (user.id === selectedRecipient.id) {
        toast.error('You cannot send money to yourself');
        return;
      }

      // Verify recipient has a wallet
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', selectedRecipient.id)
        .maybeSingle();

      if (!recipientWallet) {
        toast.error('Recipient does not have a wallet');
        return;
      }

      // Verify sender has enough balance
      const { data: senderWallet } = await supabase
        .from('wallets')
        .select('balance_cents')
        .eq('user_id', user.id)
        .single();

      if (!senderWallet || senderWallet.balance_cents < amountCents) {
        toast.error('Insufficient balance');
        return;
      }
      
      // Decrement sender's balance
      const { error: decrError } = await supabase.rpc('decrement_balance', {
        user_id: user.id,
        amount: amountCents,
      });
      
      if (decrError) throw decrError;
      
      // Increment receiver's balance
      const { error: incrError } = await supabase.rpc('increment_balance', {
        user_id: selectedRecipient.id,
        amount: amountCents,
      });
      
      if (incrError) throw incrError;
      
      // Create transaction record (instant processing)
      const { error: txError } = await supabase.from('transactions').insert({
        sender_id: user.id,
        receiver_id: selectedRecipient.id,
        type: 'TRANSFER',
        amount_cents: amountCents,
        fee_cents: 0,
        status: 'COMPLETED',
        approval_status: 'APPROVED',
        memo: note || `Payment to @${selectedRecipient.handle}`,
      });
      
      if (txError) throw txError;
      
      // Refresh activity feed immediately
      await refresh();
      
      toast.success(`$${amountNum.toFixed(2)} sent successfully!`);
      
      setLoading(false);
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRecipient(null);
      setAmount('');
      setNote('');
    } catch (error) {
      console.error('Error sending payment:', error);
      toast.error('Failed to send payment. Please try again.');
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedRecipient ? (
            <>
              <div>
                <Label>Search recipient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Name or @handle"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((recipient) => (
                    <button
                      key={recipient.id}
                      onClick={() => {
                        setSelectedRecipient(recipient);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold flex-shrink-0">
                        {getInitials(recipient.full_name)}
                      </div>
                      <div>
                        <p className="font-medium">{recipient.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">@{recipient.handle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No users found
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {getInitials(selectedRecipient.full_name)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedRecipient.full_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">@{selectedRecipient.handle}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecipient(null)}
                >
                  Change
                </Button>
              </div>

              <div>
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  max={availableBalance / 100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available: ${(availableBalance / 100).toFixed(2)}
                </p>
              </div>

              <div>
                <Label>Note (optional)</Label>
                <Textarea
                  placeholder="What's this for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Send $${amount || '0.00'}`
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
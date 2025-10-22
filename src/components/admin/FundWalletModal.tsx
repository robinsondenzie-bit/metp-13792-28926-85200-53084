import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface FundWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const FundWalletModal = ({
  open,
  onOpenChange,
  onSuccess,
}: FundWalletModalProps) => {
  const [userHandle, setUserHandle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; handle: string; full_name: string | null; avatar_url: string | null }>>([]);

  const sanitizeHandle = (h: string) => h.trim().replace(/^@/, '').toLowerCase();
  const searchProfiles = async (query: string) => {
    const q = query.trim().replace(/^@/, '');
    if (q.length < 2) { setResults([]); return; }
    try {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, full_name, avatar_url')
        .ilike('handle', `%${q}%`)
        .limit(5);
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Profile search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    const targetHandle = sanitizeHandle(userHandle);
    if (!targetHandle || !amountNum || amountNum <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid user handle and amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('admin-fund-wallet', {
        body: {
          userHandle: targetHandle,
          amountCents: Math.round(amountNum * 100),
          note,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: 'Success',
        description: `$${amountNum.toFixed(2)} credited to @${targetHandle}`,
      });

      setUserHandle('');
      setAmount('');
      setNote('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error funding wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fund wallet',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fund User Wallet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="userHandle">User Handle</Label>
            <Input
              id="userHandle"
              placeholder="@handle (e.g. avadowall6858)"
              value={userHandle}
              onChange={(e) => { const v = e.target.value; setUserHandle(v); searchProfiles(v); }}
              disabled={isSubmitting}
              required
            />
            {isSearching && <p className="text-xs opacity-70 mt-1">Searching...</p>}
            {results.length > 0 && (
              <div className="mt-2 rounded-md border">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    onClick={() => { setUserHandle(p.handle); setResults([]); }}
                  >
                    <span className="font-medium">@{p.handle}</span>
                    {p.full_name ? <span className="opacity-70 ml-2">({p.full_name})</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="50000"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <Label htmlFor="note">Internal Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Reason for funding..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Fund $${amount || '0.00'}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

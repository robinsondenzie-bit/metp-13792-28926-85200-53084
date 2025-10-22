import { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface RequestMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userHandle?: string;
}

export const RequestMoneyModal = ({ open, onOpenChange, userHandle = 'user' }: RequestMoneyModalProps) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [requestLink, setRequestLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateRequest = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    const code = Math.random().toString(36).slice(2, 8);
    const link = `https://metapay.me/${userHandle}/${code}`;
    setRequestLink(link);
    setLoading(false);

    toast({ title: 'Payment request created!' });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(requestLink);
    setCopied(true);
    toast({ title: 'Link copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: `Please pay me $${amount}`,
          url: requestLink,
        });
      } catch (error) {
        // User cancelled share
      }
    }
  };

  const handleReset = () => {
    setAmount('');
    setNote('');
    setRequestLink('');
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Money</DialogTitle>
        </DialogHeader>

        {!requestLink ? (
          <div className="space-y-4">
            <div>
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
              />
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="What's this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreateRequest}
              disabled={loading || !amount}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-success mb-2">
                ${parseFloat(amount).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                {note || 'Payment request'}
              </p>
            </div>

            <div>
              <Label>Share this link</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={requestLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {navigator.share && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
            >
              Create Another Request
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

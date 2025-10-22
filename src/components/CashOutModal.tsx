import { useState, useEffect } from 'react';
import { Building2, Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AddBankModal } from './AddBankModal';

interface Bank {
  id: string;
  bank_name: string;
  account_mask: string;
  holder_name: string;
  account_type: string;
}

interface CashOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  availableBalance: number;
}

export const CashOutModal = ({ open, onOpenChange, onSuccess, availableBalance }: CashOutModalProps) => {
  const [amount, setAmount] = useState('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [transferSpeed, setTransferSpeed] = useState<'STANDARD' | 'SAME_DAY'>('STANDARD');
  const [loading, setLoading] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);

  const fee = transferSpeed === 'SAME_DAY' ? 3 : 0;
  const amountNum = parseFloat(amount) || 0;
  const totalCents = Math.round((amountNum + fee) * 100);
  const estimatedDays = transferSpeed === 'SAME_DAY' ? 0 : 2;
  
  const arrivalDate = new Date();
  arrivalDate.setDate(arrivalDate.getDate() + estimatedDays);

  useEffect(() => {
    if (open) {
      loadBanks();
    }
  }, [open]);

  const loadBanks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'VERIFIED')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading banks:', error);
      return;
    }

    setBanks(data || []);
    if (data && data.length > 0) {
      setSelectedBank(data[0]);
    }
  };

  const handleTransfer = async () => {
    if (!amount || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > 25000) {
      toast.error('Maximum single payout is $25,000');
      return;
    }

    if (totalCents > availableBalance) {
      toast.error('You do not have enough balance for this transfer');
      return;
    }

    if (!selectedBank) {
      toast.error('Please select a bank account');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const amountCents = Math.round(amountNum * 100);
      const feeCents = Math.round(fee * 100);

      // Verify user has enough balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance_cents')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;

      if (wallet.balance_cents < totalCents) {
        toast.error('Insufficient balance');
        setLoading(false);
        return;
      }

      // Create transaction (pending admin approval - balance will be deducted on approval)
      const { error: txError } = await supabase.from('transactions').insert({
        sender_id: user.id,
        type: 'PAYOUT',
        amount_cents: amountCents,
        fee_cents: feeCents,
        status: 'PENDING',
        approval_status: 'PENDING',
        bank_id: selectedBank.id,
        payout_speed: transferSpeed,
        estimated_arrival: arrivalDate.toISOString(),
        memo: `Payout to ${selectedBank.bank_name} ${selectedBank.account_mask}`,
      });

      if (txError) throw txError;

      toast.success(
        `Transfer request submitted—pending admin approval`
      );

      setLoading(false);
      onOpenChange(false);
      onSuccess?.();

      // Reset
      setAmount('');
      setTransferSpeed('STANDARD');
    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('Failed to process payout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer money to your bank</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Amount */}
            <div>
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                max={Math.min(25000, availableBalance / 100)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: ${Math.min(25000, availableBalance / 100).toFixed(2)} (Available balance)
              </p>
            </div>

            {/* Bank Selection */}
            <div>
              <Label>Select bank</Label>
              {banks.length === 0 ? (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setShowAddBank(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              ) : (
                <div className="mt-2 space-y-2">
                  {banks.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => setSelectedBank(bank)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        selectedBank?.id === bank.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left flex-1">
                        <p className="font-medium">{bank.bank_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {bank.account_type} {bank.account_mask}
                        </p>
                      </div>
                    </button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAddBank(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another bank
                  </Button>
                </div>
              )}
            </div>

            {/* Transfer Speed */}
            <div>
              <Label>Transfer speed</Label>
              <RadioGroup value={transferSpeed} onValueChange={(v) => setTransferSpeed(v as 'STANDARD' | 'SAME_DAY')} className="mt-2">
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="STANDARD" id="standard" />
                  <label htmlFor="standard" className="flex-1 cursor-pointer">
                    <p className="font-medium">Standard ACH (1–3 business days)</p>
                    <p className="text-sm text-muted-foreground">Free</p>
                  </label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="SAME_DAY" id="same-day" />
                  <label htmlFor="same-day" className="flex-1 cursor-pointer">
                    <p className="font-medium">Same-Day ACH</p>
                    <p className="text-sm text-muted-foreground">$3.00 fee</p>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Summary */}
            {amount && amountNum > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Amount</span>
                  <span>${amountNum.toFixed(2)}</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Fee</span>
                    <span>${fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${(amountNum + fee).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated arrival: {arrivalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}

            <Button
              onClick={handleTransfer}
              disabled={loading || !amount || amountNum <= 0 || !selectedBank}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Transfer $${(amountNum + fee).toFixed(2)}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddBankModal
        open={showAddBank}
        onOpenChange={setShowAddBank}
        onSuccess={() => {
          loadBanks();
          setShowAddBank(false);
        }}
      />
    </>
  );
};

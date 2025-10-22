import { useState, useEffect } from 'react';
import { CreditCard, Loader2, Building2, Smartphone, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCardNumber, formatExpiry, formatCVC, detectCardBrand, validateCardNumber, validateExpiry, tokenizeCard } from '@/lib/cardValidator';

const SUGGESTED_AMOUNTS = [25, 50, 100, 250];

interface AddMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddMoneyModal = ({ open, onOpenChange, onSuccess }: AddMoneyModalProps) => {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [adminHandles, setAdminHandles] = useState<{[key: string]: string}>({});
  const [paymentSent, setPaymentSent] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
  const cardBrand = detectCardBrand(cardNumber);

  useEffect(() => {
    if (open) {
      loadBanks();
      loadAdminHandles();
    }
  }, [open]);

  const loadBanks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', user.id);

    if (data) setBanks(data);
  };

  const loadAdminHandles = async () => {
    const { data } = await supabase
      .from('admin_cash_handles')
      .select('method, handle')
      .eq('is_active', true);

    if (data) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const handleMap: {[key: string]: string} = {};
      data.forEach(item => {
        handleMap[normalize(item.method)] = item.handle;
      });
      setAdminHandles(handleMap);
    }
  };

  const handleCardSubmit = async () => {
    if (amount < 0.5) {
      toast.error('Minimum amount is $0.50');
      return;
    }
    
    if (amount > 50000) {
      toast.error('Maximum amount is $50,000');
      return;
    }
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    
    if (!validateCardNumber(cleanCardNumber)) {
      toast.error('Invalid card number');
      return;
    }
    
    const [expMonth, expYear] = expiry.split('/').map(s => parseInt(s));
    if (!expMonth || !expYear || !validateExpiry(expMonth, expYear)) {
      toast.error('Card has expired or invalid expiry date');
      return;
    }
    
    if (cvc.length < 3) {
      toast.error('Invalid CVC');
      return;
    }
    
    if (!zip || zip.length < 5) {
      toast.error('Invalid ZIP code');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }
      
      const token = await tokenizeCard({
        number: cleanCardNumber,
        expMonth,
        expYear,
        cvc,
        zip,
      });
      
      const last4 = cleanCardNumber.slice(-4);
      
      const { data: card, error: cardError } = await supabase.from('cards').insert({
        user_id: user.id,
        token,
        last4,
        brand: cardBrand,
        exp_month: expMonth,
        exp_year: expYear,
        zip,
      }).select().single();
      
      if (cardError) throw cardError;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const amountCents = Math.round(amount * 100);
      
      const { error: txError } = await supabase.from('transactions').insert({
        receiver_id: user.id,
        type: 'CARD_LOAD',
        amount_cents: amountCents,
        fee_cents: 0,
        status: 'PENDING',
        approval_status: 'PENDING',
        card_id: card?.id,
        memo: `Card load (${cardBrand} ••••${last4})`,
      });
      
      if (txError) throw txError;
      
      toast.success(`$${amount.toFixed(2)} request submitted—pending admin approval`);
      
      setLoading(false);
      onOpenChange(false);
      onSuccess?.();
      
      resetForm();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
      setLoading(false);
    }
  };

  const handleBankSubmit = async () => {
    if (!selectedBank) {
      toast.error('Please select a bank account');
      return;
    }

    if (amount < 0.5) {
      toast.error('Minimum amount is $0.50');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const bank = banks.find(b => b.id === selectedBank);
      const amountCents = Math.round(amount * 100);
      
      const { error: txError } = await supabase.from('transactions').insert({
        receiver_id: user.id,
        type: 'BANK_LOAD',
        amount_cents: amountCents,
        fee_cents: 0,
        status: 'PENDING',
        approval_status: 'PENDING',
        bank_id: bank?.id,
        memo: `Bank transfer (${bank?.bank_name} ••••${bank?.account_mask})`,
      });
      
      if (txError) throw txError;
      
      toast.success(`$${amount.toFixed(2)} request submitted—pending admin approval`);
      
      setLoading(false);
      onOpenChange(false);
      onSuccess?.();
      
      resetForm();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
      setLoading(false);
    }
  };

  const handleAlternativePayment = async (method: string) => {
    if (amount < 0.5) {
      toast.error('Minimum amount is $0.50');
      return;
    }

    if (!paymentSent) {
      toast.error('Please confirm that you have sent the payment');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      let receiptUrl = null;

      // Upload receipt if provided
      if (receiptFile) {
        setUploadingReceipt(true);
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadError) {
          console.error('Receipt upload error:', uploadError);
          toast.error('Failed to upload receipt');
          setUploadingReceipt(false);
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
        setUploadingReceipt(false);
      }

      const amountCents = Math.round(amount * 100);
      
      // Normalize method name: remove spaces and convert to uppercase
      const normalizedMethod = method.toUpperCase().replace(/\s+/g, '');
      
      const { error: txError } = await supabase.from('transactions').insert({
        receiver_id: user.id,
        type: `${normalizedMethod}_LOAD`,
        amount_cents: amountCents,
        fee_cents: 0,
        status: 'PENDING',
        approval_status: 'PENDING',
        memo: `${method} payment`,
        payment_sent: true,
        payment_sent_at: new Date().toISOString(),
        receipt_url: receiptUrl,
      });
      
      if (txError) throw txError;
      
      toast.success(`$${amount.toFixed(2)} ${method} request submitted—pending admin approval`);
      
      setLoading(false);
      onOpenChange(false);
      onSuccess?.();
      
      resetForm();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
      setLoading(false);
      setUploadingReceipt(false);
    }
  };

  const resetForm = () => {
    setSelectedAmount(50);
    setCustomAmount('');
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setZip('');
    setSelectedBank('');
    setPaymentSent(false);
    setReceiptFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money</DialogTitle>
          <DialogDescription>
            Add money to your MetaPay balance
          </DialogDescription>
        </DialogHeader>

        <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="card">
              <CreditCard className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Building2 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="applepay">
              <Smartphone className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          {/* Amount Selection - Common to all tabs */}
          <div className="space-y-3 mt-4">
            <Label>Amount</Label>
            <div className="grid grid-cols-4 gap-2">
              {SUGGESTED_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`h-12 rounded-md border-2 font-medium transition-colors ${
                    selectedAmount === amt && !customAmount
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Custom amount (min $0.50)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              step="0.01"
              min="0.50"
            />
          </div>

          <TabsContent value="card" className="space-y-4 pt-4">
            <div>
              <Label>Card number</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
              {cardBrand !== 'unknown' && cardNumber.length > 4 && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">{cardBrand}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Expiry</Label>
                <Input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div>
                <Label>CVC</Label>
                <Input
                  type="text"
                  placeholder={cardBrand === 'amex' ? '1234' : '123'}
                  value={cvc}
                  onChange={(e) => setCvc(formatCVC(e.target.value, cardBrand))}
                  maxLength={cardBrand === 'amex' ? 4 : 3}
                />
              </div>
              <div>
                <Label>ZIP</Label>
                <Input
                  type="text"
                  placeholder="12345"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
                  maxLength={5}
                />
              </div>
            </div>

            <Button
              onClick={handleCardSubmit}
              disabled={loading || !cardNumber || !expiry || !cvc || !zip}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Add $${amount.toFixed(2)}`
              )}
            </Button>
          </TabsContent>

          <TabsContent value="bank" className="space-y-3 pt-4">
            <Label>Select Bank Account</Label>
            {banks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="mb-2">No banks added yet</p>
                <p className="text-xs">Add a bank in Settings to use this option</p>
              </div>
            ) : (
              <>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name} •••• {bank.account_mask}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleBankSubmit}
                  disabled={loading || !selectedBank}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Add $${amount.toFixed(2)}`
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="applepay" className="space-y-3 pt-4">
            <div className="space-y-4">
              {adminHandles['applepay'] && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Send payment to:</p>
                  <p className="text-lg font-bold">{adminHandles['applepay']}</p>
                </div>
              )}
              <div className="text-center py-2">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground mb-2">Apple Pay</p>
                <p className="text-xs text-muted-foreground">
                  Request will be pending admin approval
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="applepay-sent"
                    checked={paymentSent}
                    onChange={(e) => setPaymentSent(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="applepay-sent" className="text-sm cursor-pointer">
                    I have sent the payment
                  </Label>
                </div>

                <div>
                  <Label htmlFor="applepay-receipt">Upload Payment Receipt (Optional)</Label>
                  <Input
                    id="applepay-receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    disabled={loading || uploadingReceipt}
                  />
                </div>
              </div>

              <Button
                onClick={() => handleAlternativePayment('Apple Pay')}
                disabled={loading || !paymentSent || uploadingReceipt}
                className="w-full"
              >
                {loading || uploadingReceipt ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploadingReceipt ? 'Uploading receipt...' : 'Processing...'}
                  </>
                ) : (
                  `Add $${amount.toFixed(2)} via Apple Pay`
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-3 pt-4">
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">
                  Requests will be pending admin approval
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="other-sent"
                    checked={paymentSent}
                    onChange={(e) => setPaymentSent(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="other-sent" className="text-sm cursor-pointer">
                    I have sent the payment
                  </Label>
                </div>

                <div>
                  <Label htmlFor="other-receipt">Upload Payment Receipt (Optional)</Label>
                  <Input
                    id="other-receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    disabled={loading || uploadingReceipt}
                  />
                </div>
              </div>

              {adminHandles['zelle'] && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto py-4 flex-col items-start gap-2"
                  onClick={() => handleAlternativePayment('Zelle')}
                  disabled={loading || !paymentSent || uploadingReceipt}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">Zelle</p>
                      <p className="text-xs text-muted-foreground">Add ${amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pl-11 w-full text-left">
                    <p className="text-xs text-muted-foreground">Send to: <span className="font-semibold text-foreground">{adminHandles['zelle']}</span></p>
                  </div>
                </Button>
              )}
              {adminHandles['cashapp'] && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto py-4 flex-col items-start gap-2"
                  onClick={() => handleAlternativePayment('Cash App')}
                  disabled={loading || !paymentSent || uploadingReceipt}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-8 w-8 bg-success/10 rounded flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">Cash App</p>
                      <p className="text-xs text-muted-foreground">Add ${amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pl-11 w-full text-left">
                    <p className="text-xs text-muted-foreground">Send to: <span className="font-semibold text-foreground">{adminHandles['cashapp']}</span></p>
                  </div>
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

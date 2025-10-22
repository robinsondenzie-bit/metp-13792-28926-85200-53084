import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateRoutingNumber, formatRoutingNumber } from '@/lib/abaValidator';
import { encryptAccountNumber, encryptRoutingNumber, maskAccountNumber } from '@/lib/encryptAccount';

interface AddBankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TOP_US_BANKS = [
  'Chase Bank',
  'Bank of America',
  'Wells Fargo',
  'Citibank',
  'U.S. Bank',
  'PNC Bank',
  'Capital One',
  'TD Bank',
  'Truist Bank',
  'Goldman Sachs Bank',
  'Other',
];

export const AddBankModal = ({ open, onOpenChange, onSuccess }: AddBankModalProps) => {
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'CHECKING' | 'SAVINGS'>('CHECKING');
  const [isLoading, setIsLoading] = useState(false);
  const [routingError, setRoutingError] = useState('');

  const handleRoutingChange = (value: string) => {
    const formatted = formatRoutingNumber(value);
    setRoutingNumber(formatted);
    
    if (formatted.length === 9) {
      if (!validateRoutingNumber(formatted)) {
        setRoutingError('Invalid routing number');
      } else {
        setRoutingError('');
      }
    } else {
      setRoutingError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalBankName = bankName === 'Other' ? customBankName : bankName;
    
    // Validation
    if (!holderName.trim()) {
      toast.error('Please enter account holder name');
      return;
    }
    
    if (!finalBankName.trim()) {
      toast.error('Please select or enter bank name');
      return;
    }
    
    if (routingNumber.length !== 9) {
      toast.error('Routing number must be 9 digits');
      return;
    }
    
    if (!validateRoutingNumber(routingNumber)) {
      toast.error('Invalid routing number checksum');
      return;
    }
    
    if (accountNumber.length < 4) {
      toast.error('Account number must be at least 4 digits');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }
      
      // Encrypt sensitive data
      const encryptedRouting = encryptRoutingNumber(routingNumber);
      const encryptedAccount = encryptAccountNumber(accountNumber);
      const accountMask = maskAccountNumber(accountNumber);
      
      // Insert bank account
      const { error } = await supabase.from('banks').insert({
        user_id: user.id,
        holder_name: holderName.trim(),
        bank_name: finalBankName.trim(),
        routing_number: encryptedRouting,
        account_number: encryptedAccount,
        account_mask: accountMask,
        account_type: accountType,
        status: 'VERIFIED', // Auto-verify for prototype
        verified_at: new Date().toISOString(),
      });
      
      if (error) throw error;
      
      toast.success('Bank account added successfully');
      
      // Reset form
      setHolderName('');
      setBankName('');
      setCustomBankName('');
      setRoutingNumber('');
      setAccountNumber('');
      setAccountType('CHECKING');
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding bank:', error);
      toast.error('Failed to add bank account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add Bank Account
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holderName">Account Holder Name</Label>
            <Input
              id="holderName"
              placeholder="John Doe"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Select value={bankName} onValueChange={setBankName} required>
              <SelectTrigger>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {TOP_US_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {bankName === 'Other' && (
              <Input
                placeholder="Enter bank name"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                required
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="routing">Routing Number</Label>
            <Input
              id="routing"
              placeholder="123456789"
              value={routingNumber}
              onChange={(e) => handleRoutingChange(e.target.value)}
              maxLength={9}
              required
            />
            {routingError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {routingError}
              </p>
            )}
            {routingNumber.length === 9 && !routingError && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Valid routing number
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="account">Account Number</Label>
            <Input
              id="account"
              type="password"
              placeholder="••••••••"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as 'CHECKING' | 'SAVINGS')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECKING">Checking</SelectItem>
                <SelectItem value="SAVINGS">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !!routingError}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Bank...
              </>
            ) : (
              'Add Bank Account'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

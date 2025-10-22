import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Wallet, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionFeed } from '@/components/TransactionFeed';
import { EmptyState } from '@/components/EmptyState';
import { AddMoneyModal } from '@/components/AddMoneyModal';
import { SendPaymentModal } from '@/components/SendPaymentModal';
import { BackButton } from '@/components/BackButton';
import { CreateOrderModal } from '@/components/CreateOrderModal';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [balance, setBalance] = useState({ balance_cents: 0, pending_cents: 0, on_hold_cents: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [sendPaymentOpen, setSendPaymentOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      loadUserData();
      
      // Show welcome toast for new users
      if (searchParams.get('new') === 'true') {
        toast({
          title: 'Welcome to MetaPay!',
          description: 'Your account has been created successfully',
        });
        // Remove the query param
        navigate('/', { replace: true });
      }
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setIsLoadingData(true);

    try {
      // Load wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletData) {
        setBalance(walletData);
      }

      // Load transactions
      const { data: txnData } = await supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (txnData) {
        setTransactions(txnData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const totalBalance = balance.balance_cents + balance.pending_cents + balance.on_hold_cents;

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      <Header onSignOut={signOut} userEmail={user.email || ''} />
      
      <main className="max-w-[1400px] mx-auto p-4 md:p-6">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Left Sidebar */}
          <aside className="space-y-4">
            <div className="bg-card rounded-lg p-4 shadow-meta">
              <p className="text-xs text-muted-foreground mb-1">Available balance</p>
              <p className="text-3xl font-bold">{formatCurrency(balance.balance_cents)}</p>
              
              {(balance.pending_cents > 0 || balance.on_hold_cents > 0) && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {balance.pending_cents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending</span>
                      <span>{formatCurrency(balance.pending_cents)}</span>
                    </div>
                  )}
                  {balance.on_hold_cents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">On hold</span>
                      <span>{formatCurrency(balance.on_hold_cents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatCurrency(totalBalance)}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => setAddMoneyOpen(true)}
                className="w-full"
              >
                Add Money
              </Button>
              <Button
                onClick={() => navigate('/wallet/cash-out')}
                variant="secondary"
                className="w-full"
              >
                Cash Out
              </Button>
              <Button
                onClick={() => navigate('/my-dashboard')}
                variant="outline"
                className="w-full"
              >
                My Dashboard
              </Button>
              <Button
                onClick={() => setCreateOrderOpen(true)}
                variant="default"
                className="w-full"
              >
                <Package className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="bg-card rounded-lg shadow-meta">
            <div className="p-4 border-b border-border">
              <h2 className="text-xl font-bold">Activity</h2>
            </div>

              <TransactionFeed />
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setSendPaymentOpen(true)}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-meta-md hover:bg-primary-hover transition-colors flex items-center justify-center"
          aria-label="Send Payment"
        >
          <Send className="h-6 w-6" />
        </button>
      </div>

      {/* Modals */}
      <AddMoneyModal open={addMoneyOpen} onOpenChange={setAddMoneyOpen} onSuccess={loadUserData} />
      <SendPaymentModal 
        open={sendPaymentOpen} 
        onOpenChange={setSendPaymentOpen} 
        onSuccess={loadUserData}
        availableBalance={balance.balance_cents}
      />
      <CreateOrderModal
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        onSuccess={loadUserData}
        availableBalance={balance.balance_cents}
      />
      
    </div>
  );
};

export default Index;

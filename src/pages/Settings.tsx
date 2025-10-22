import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Building2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AddBankModal } from '@/components/AddBankModal';

export default function Settings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    transactions: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      loadPaymentMethods();
    }
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      const [cardsData, banksData] = await Promise.all([
        supabase.from('cards').select('*').eq('user_id', user.id),
        supabase.from('banks').select('*').eq('user_id', user.id),
      ]);

      if (cardsData.data) setCards(cardsData.data);
      if (banksData.data) setBanks(banksData.data);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast({ title: 'Card removed successfully' });
      loadPaymentMethods();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBank = async (bankId: string) => {
    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', bankId);

      if (error) throw error;

      toast({ title: 'Bank removed successfully' });
      loadPaymentMethods();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onSignOut={signOut} userEmail={user.email || ''} />
      
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        {/* Payment Methods */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Cards
                </h3>
              </div>
              {cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cards added</p>
              ) : (
                <div className="space-y-2">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <span className="text-sm">
                        {card.brand} •••• {card.last4}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Banks
                </h3>
                <Button onClick={() => setAddBankOpen(true)} size="sm">
                  Add Bank
                </Button>
              </div>
              {banks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No banks added</p>
              ) : (
                <div className="space-y-2">
                  {banks.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <span className="text-sm">
                        {bank.bank_name} •••• {bank.account_mask}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBank(bank.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Notifications</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notif">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notif">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications
                </p>
              </div>
              <Switch
                id="push-notif"
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, push: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="txn-notif">Transaction Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified of all transactions
                </p>
              </div>
              <Switch
                id="txn-notif"
                checked={notifications.transactions}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, transactions: checked })
                }
              />
            </div>
          </div>
        </Card>
      </main>

      <AddBankModal
        open={addBankOpen}
        onOpenChange={setAddBankOpen}
        onSuccess={loadPaymentMethods}
      />
    </div>
  );
}

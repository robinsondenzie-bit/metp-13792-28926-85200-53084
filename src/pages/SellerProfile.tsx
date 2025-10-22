import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MessageCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { SendPaymentModal } from '@/components/SendPaymentModal';
import { supabase } from '@/integrations/supabase/client';
import testUsers from '@/data/testUsers.json';
import { formatCurrency } from '@/lib/mock-data';

const SellerProfile = () => {
  const { handle } = useParams();
  const [sendPaymentOpen, setSendPaymentOpen] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);

  const seller = testUsers.find(u => u.handle === handle?.replace('@', ''));

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('wallets')
      .select('balance_cents')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setAvailableBalance(data.balance_cents);
    }
  };

  if (!seller) {
    return <Navigate to="/404" replace />;
  }

  const stats = {
    lifetimeSales: 1250000,
    reviews: 4.8,
    returnRate: 2.3,
    responseTime: '< 1 hour',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSignOut={() => {}} userEmail="guest@metapay.com" />
      
      <main className="max-w-[1000px] mx-auto p-4 md:p-6">
        {/* Cover */}
        <div className="h-48 bg-gradient-to-r from-primary to-primary-hover rounded-lg mb-4" />

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold -mt-8 border-4 border-background">
            {seller.avatarSeed}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{seller.name}</h1>
            <p className="text-muted-foreground">@{seller.handle}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button onClick={() => setSendPaymentOpen(true)}>
              Pay Merchant
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(stats.lifetimeSales)}
            </p>
            <p className="text-sm text-muted-foreground">Lifetime Sales</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              {stats.reviews}
            </div>
            <p className="text-sm text-muted-foreground">Reviews</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.returnRate}%</p>
            <p className="text-sm text-muted-foreground">Return Rate</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.responseTime}</p>
            <p className="text-sm text-muted-foreground">Response Time</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items">
          <TabsList className="w-full">
            <TabsTrigger value="items" className="flex-1">Items</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
            <TabsTrigger value="policies" className="flex-1">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No items listed yet</p>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No reviews yet</p>
            </Card>
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Return Policy</h3>
              <p className="text-sm text-muted-foreground mb-4">
                30-day money-back guarantee on all purchases.
              </p>
              
              <h3 className="font-semibold mb-2">Shipping</h3>
              <p className="text-sm text-muted-foreground">
                Free shipping on orders over $50. Standard delivery 3-5 business days.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <SendPaymentModal 
        open={sendPaymentOpen} 
        onOpenChange={setSendPaymentOpen}
        availableBalance={availableBalance}
      />
    </div>
  );
};

export default SellerProfile;

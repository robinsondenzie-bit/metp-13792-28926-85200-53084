import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, TrendingUp, DollarSign, Clock, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';
import { EscrowActivity } from '@/components/EscrowActivity';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import { TransactionFeed } from '@/components/TransactionFeed';

interface Order {
  id: string;
  buyer_id?: string;
  seller_id?: string;
  amount_cents: number;
  status: string;
  item_description: string;
  tracking_number: string | null;
  shipping_carrier: string | null;
  created_at: string;
  shipped_at: string | null;
  release_approved_at: string | null;
}

export default function MyDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sellingOrders, setSellingOrders] = useState<Order[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<Order[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [balance, setBalance] = useState({ balance_cents: 0, pending_cents: 0, on_hold_cents: 0 });
  const [sellingStats, setSellingStats] = useState({
    pendingOrders: 0,
    shippedOrders: 0,
    totalEarnings: 0,
    awaitingRelease: 0,
  });
  
  const [shippingForms, setShippingForms] = useState<{
    [key: string]: { carrier: string; trackingNumber: string; submitting: boolean };
  }>({});

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUserEmail(user.email || '');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletData) {
        setBalance(walletData);
      }

      // Load selling orders
      const { data: sellingData, error: sellingError } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (sellingError) throw sellingError;
      setSellingOrders(sellingData || []);
      
      // Calculate selling stats
      const pending = sellingData?.filter(o => o.status === 'PENDING_PAYMENT' || o.status === 'PENDING_SHIPMENT').length || 0;
      const shipped = sellingData?.filter(o => o.status === 'SHIPPED' || o.status === 'AWAITING_ADMIN_APPROVAL').length || 0;
      const completed = sellingData?.filter(o => o.status === 'COMPLETED') || [];
      const totalEarnings = completed.reduce((sum, o) => sum + o.amount_cents, 0);

      // Get awaiting release from escrow_hold table (funds held in escrow)
      const { data: escrowData } = await supabase
        .from('escrow_hold')
        .select('amount_cents')
        .eq('seller_id', user.id)
        .eq('status', 'held');

      const awaitingRelease = escrowData?.reduce((sum, e) => sum + e.amount_cents, 0) || 0;

      setSellingStats({
        pendingOrders: pending,
        shippedOrders: shipped,
        totalEarnings,
        awaitingRelease,
      });

      // Load buying orders
      const { data: buyingData, error: buyingError } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (buyingError) throw buyingError;
      setBuyingOrders(buyingData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time updates
  useDashboardRealtime(loadData);

  const handleShipmentSubmit = async (orderId: string) => {
    const form = shippingForms[orderId];
    if (!form || !form.carrier || !form.trackingNumber) {
      toast.error('Please fill in all shipping details');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(form.trackingNumber)) {
      toast.error('Tracking number must be alphanumeric');
      return;
    }

    setShippingForms(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], submitting: true },
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase.functions.invoke('add-tracking', {
        body: {
          orderId,
          carrier: form.carrier,
          trackingNumber: form.trackingNumber
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast.success('Tracking information submitted. Awaiting admin verification.', {
        duration: 5000,
      });

      setShippingForms(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('Failed to submit tracking');
      setShippingForms(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], submitting: false },
      }));
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      PENDING_PAYMENT: 'outline',
      PENDING_SHIPMENT: 'secondary',
      AWAITING_ADMIN_APPROVAL: 'secondary',
      SHIPPED: 'default',
      AWAITING_RELEASE: 'default',
      COMPLETED: 'default',
      CANCELLED: 'destructive',
    };

    const labels: { [key: string]: string } = {
      PENDING_PAYMENT: 'Payment Pending',
      PENDING_SHIPMENT: 'Awaiting Shipment',
      AWAITING_ADMIN_APPROVAL: 'Tracking Submitted',
      SHIPPED: 'Shipped',
      AWAITING_RELEASE: 'Awaiting Release',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalBalance = balance.balance_cents + balance.pending_cents + balance.on_hold_cents;

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      <Header onSignOut={handleSignOut} userEmail={userEmail} />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">My Dashboard</h1>
          <Button variant="outline" onClick={() => navigate('/profile')}>
            My Profile
          </Button>
        </div>

        {/* Wallet Balance */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(balance.balance_cents)}</p>
              {(balance.pending_cents > 0 || balance.on_hold_cents > 0) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Total: {formatCurrency(totalBalance)}
                </p>
              )}
            </div>
            <DollarSign className="h-12 w-12 text-primary" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg md:text-xl font-bold">Activity</h2>
          </div>
          <TransactionFeed />
        </Card>

        <Tabs defaultValue="selling" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="selling">Selling</TabsTrigger>
            <TabsTrigger value="buying">Buying</TabsTrigger>
          </TabsList>

          <TabsContent value="selling" className="space-y-6">
            {/* Escrow Activity */}
            <EscrowActivity />

            {/* Selling Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Pending Shipment</p>
                    <p className="text-xl md:text-2xl font-bold">{sellingStats.pendingOrders}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Shipped</p>
                    <p className="text-xl md:text-2xl font-bold">{sellingStats.shippedOrders}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(sellingStats.totalEarnings)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Awaiting Release</p>
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(sellingStats.awaitingRelease)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Selling Orders */}
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">Selling Orders</h2>
              
              {sellingOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No selling orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sellingOrders.map((order) => (
                    <Card key={order.id} className="p-4 md:p-6 border-2">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-base md:text-lg">{order.item_description}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <p className="font-bold text-lg md:text-xl">{formatCurrency(order.amount_cents)}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.status)}
                          </div>

                          {order.tracking_number && (
                            <div className="text-sm">
                              <p className="text-muted-foreground">
                                {order.shipping_carrier} • {order.tracking_number}
                              </p>
                            </div>
                          )}
                        </div>

                        {(order.status === 'PENDING_SHIPMENT' || order.status === 'PENDING_PAYMENT') && (
                          <Card className="w-full md:w-80 p-4 bg-muted/50">
                            <h3 className="font-semibold text-sm mb-3">Ship item to release payment</h3>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs">Carrier</Label>
                                <Select
                                  value={shippingForms[order.id]?.carrier || ''}
                                  onValueChange={(value) =>
                                    setShippingForms(prev => ({
                                      ...prev,
                                      [order.id]: {
                                        ...prev[order.id],
                                        carrier: value,
                                        trackingNumber: prev[order.id]?.trackingNumber || '',
                                        submitting: false,
                                      },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select carrier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UPS">UPS</SelectItem>
                                    <SelectItem value="FedEx">FedEx</SelectItem>
                                    <SelectItem value="DHL">DHL</SelectItem>
                                    <SelectItem value="USPS">USPS</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs">Tracking Number</Label>
                                <Input
                                  placeholder="Enter tracking number"
                                  value={shippingForms[order.id]?.trackingNumber || ''}
                                  onChange={(e) =>
                                    setShippingForms(prev => ({
                                      ...prev,
                                      [order.id]: {
                                        ...prev[order.id],
                                        trackingNumber: e.target.value,
                                        carrier: prev[order.id]?.carrier || '',
                                        submitting: false,
                                      },
                                    }))
                                  }
                                  className="h-9"
                                />
                              </div>

                              <Button
                                onClick={() => handleShipmentSubmit(order.id)}
                                disabled={
                                  !shippingForms[order.id]?.carrier ||
                                  !shippingForms[order.id]?.trackingNumber ||
                                  shippingForms[order.id]?.submitting
                                }
                                className="w-full"
                                size="sm"
                              >
                                {shippingForms[order.id]?.submitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Confirming...
                                  </>
                                ) : (
                                  'Confirm shipment'
                                )}
                              </Button>
                            </div>
                          </Card>
                        )}

                        {order.status === 'AWAITING_ADMIN_APPROVAL' && (
                          <div className="w-full md:w-80 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
                              ⏳ Tracking submitted - awaiting admin verification
                            </p>
                            {order.tracking_number && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {order.shipping_carrier}: {order.tracking_number}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="buying" className="space-y-6">
            {/* Escrow Activity */}
            <EscrowActivity />
            
            <Card className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold mb-4">My Purchases</h2>
              
              {buyingOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No purchases yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {buyingOrders.map((order) => (
                    <Card key={order.id} className="p-4 md:p-6 border-2">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-base md:text-lg">{order.item_description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <p className="font-bold text-lg md:text-xl">{formatCurrency(order.amount_cents)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

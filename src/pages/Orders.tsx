import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { BackButton } from '@/components/BackButton';

interface Order {
  id: string;
  seller_id: string;
  amount_cents: number;
  status: string;
  item_description: string;
  tracking_number: string | null;
  shipping_carrier: string | null;
  created_at: string;
  shipped_at: string | null;
}

export default function Orders() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
    loadOrders();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUserEmail(user.email || '');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!roles);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
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
      SHIPPED: 'default',
      AWAITING_RELEASE: 'default',
      COMPLETED: 'default',
      CANCELLED: 'destructive',
    };

    const labels: { [key: string]: string } = {
      PENDING_PAYMENT: 'Pending Payment',
      PENDING_SHIPMENT: 'Paid – Awaiting Shipment',
      SHIPPED: 'Shipped',
      AWAITING_RELEASE: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleTrackPackage = (trackingNumber: string) => {
    window.open(`https://t.17track.net/en#nums=${trackingNumber}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      <Header onSignOut={handleSignOut} userEmail={userEmail} />
      
      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">My Orders</h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-4">
                Start shopping to see your orders here
              </p>
              <Button onClick={() => navigate('/')}>Browse Sellers</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-base md:text-lg">
                          {order.item_description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ordered {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <p className="font-bold text-lg md:text-xl">
                        {formatCurrency(order.amount_cents)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Tracking Info - visible to buyers when shipped, admins always see */}
                    {order.tracking_number && order.shipping_carrier && (
                      (!isAdmin && (order.status === 'SHIPPED' || order.status === 'AWAITING_RELEASE' || order.status === 'COMPLETED')) || isAdmin
                    ) && (
                      <Card className="p-4 bg-muted/50 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">Tracking Information</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.shipping_carrier}
                            </p>
                            <p className="text-sm font-mono mt-1">
                              {order.tracking_number}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTrackPackage(order.tracking_number!)}
                          >
                            Track Package
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </Card>
                    )}

                    {order.status === 'PENDING_SHIPMENT' && (
                      <p className="text-sm text-muted-foreground">
                        Waiting for seller to ship your order...
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

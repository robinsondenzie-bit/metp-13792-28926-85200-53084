import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Package, ExternalLink } from 'lucide-react';

interface Order {
  id: string;
  item_description: string;
  amount_cents: number;
  tracking_number: string;
  shipping_carrier: string;
  seller_id: string;
  buyer_id: string;
  created_at: string;
  profiles?: {
    handle: string;
    full_name: string;
  };
}

export const PendingTracking = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:seller_id (handle, full_name)
        `)
        .eq('status', 'AWAITING_ADMIN_APPROVAL')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      console.error('Error loading pending orders:', error);
      toast.error('Failed to load pending orders');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (orderId: string, approved: boolean) => {
    try {
      setProcessing(orderId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { error } = await supabase.functions.invoke('admin-verify-tracking', {
        body: { orderId, approved },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast.success(approved ? 'Tracking approved' : 'Tracking rejected');
      loadPendingOrders();
    } catch (error: any) {
      console.error('Error verifying tracking:', error);
      toast.error(error.message || 'Failed to verify tracking');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending tracking...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pending Tracking Verification
        </CardTitle>
        <CardDescription>
          Review and verify seller tracking information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No pending tracking verifications
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{order.item_description}</p>
                        <p className="text-sm text-muted-foreground">
                          Seller: @{order.profiles?.handle || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Order ID: {order.id.substring(0, 8)}...
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-500/10">
                        {formatCurrency(order.amount_cents)}
                      </Badge>
                    </div>

                    <div className="bg-accent/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Carrier:</span>
                        <span className="text-sm">{order.shipping_carrier}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tracking:</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => {
                            const url = order.shipping_carrier.toLowerCase().includes('usps')
                              ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`
                              : order.shipping_carrier.toLowerCase().includes('ups')
                              ? `https://www.ups.com/track?tracknum=${order.tracking_number}`
                              : `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`;
                            window.open(url, '_blank');
                          }}
                        >
                          {order.tracking_number}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleVerify(order.id, true)}
                        disabled={processing === order.id}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleVerify(order.id, false)}
                        disabled={processing === order.id}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

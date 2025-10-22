import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  item_description: string;
  amount_cents: number;
  status: string;
  created_at: string;
  shipped_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
}

export const SellerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, { carrier: string; tracking: string }>>({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTracking = async (orderId: string) => {
    const data = trackingData[orderId];
    if (!data?.carrier || !data?.tracking) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both carrier and tracking number',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(orderId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('add-tracking', {
        body: {
          orderId,
          carrier: data.carrier,
          trackingNumber: data.tracking,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tracking information added',
      });

      loadOrders();
      setTrackingData((prev) => {
        const newData = { ...prev };
        delete newData[orderId];
        return newData;
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive', label: string }> = {
      PENDING_PAYMENT: { variant: 'secondary', label: 'Pending Payment' },
      PENDING_SHIPMENT: { variant: 'secondary', label: 'Ready to Ship' },
      SHIPPED: { variant: 'default', label: 'Shipped' },
      AWAITING_RELEASE: { variant: 'outline', label: 'Awaiting Release' },
      COMPLETED: { variant: 'outline', label: 'Completed' },
    };
    const config = statusConfig[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Your Orders to Ship
        </CardTitle>
        <CardDescription>Manage orders and add tracking information</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No orders yet</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{order.item_description}</p>
                    <p className="text-sm text-muted-foreground">
                      Order ID: {order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(order.amount_cents)}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {(order.status === 'PENDING_SHIPMENT' || order.status === 'PENDING_PAYMENT') && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">Add Tracking Information</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={trackingData[order.id]?.carrier || ''}
                        onValueChange={(value) =>
                          setTrackingData((prev) => ({
                            ...prev,
                            [order.id]: { ...prev[order.id], carrier: value, tracking: prev[order.id]?.tracking || '' },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USPS">USPS</SelectItem>
                          <SelectItem value="UPS">UPS</SelectItem>
                          <SelectItem value="FedEx">FedEx</SelectItem>
                          <SelectItem value="DHL">DHL</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Tracking number"
                        value={trackingData[order.id]?.tracking || ''}
                        onChange={(e) =>
                          setTrackingData((prev) => ({
                            ...prev,
                            [order.id]: { ...prev[order.id], tracking: e.target.value, carrier: prev[order.id]?.carrier || '' },
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddTracking(order.id)}
                      disabled={submitting === order.id}
                      className="w-full"
                    >
                      {submitting === order.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Tracking'
                      )}
                    </Button>
                  </div>
                )}

                {(order.status === 'SHIPPED' || order.status === 'AWAITING_RELEASE') && order.tracking_number && (
                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Tracking:</span>{' '}
                      <span className="font-medium">{order.shipping_carrier}: {order.tracking_number}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Shipped: {order.shipped_at ? new Date(order.shipped_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                )}

                {order.status === 'COMPLETED' && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-success">✓ Payment released</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

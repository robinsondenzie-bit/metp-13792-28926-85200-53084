import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface EscrowRecord {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  released_at: string | null;
  order_id: string | null;
  orders?: {
    item_description: string;
    status: string;
  };
}

export const EscrowActivity = () => {
  const [records, setRecords] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEscrowRecords();
  }, []);

  const loadEscrowRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('escrow_hold')
        .select('*, orders(item_description, status)')
        .or(`user_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading escrow records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(cents) / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      held: 'secondary',
      released: 'default',
      disputed: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
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
        <CardTitle>Escrow Activity</CardTitle>
        <CardDescription>Recent escrow transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No escrow activity</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {record.orders?.item_description || 'Order'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(record.status)}
                  <p className={`text-lg font-bold ${record.amount_cents < 0 ? 'text-destructive' : 'text-success'}`}>
                    {record.amount_cents < 0 ? '-' : '+'}{formatCurrency(record.amount_cents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

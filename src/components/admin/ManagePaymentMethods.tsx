import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PaymentMethod = {
  id: string;
  method: string;
  handle: string;
  is_active: boolean;
};

export const ManagePaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    method: PaymentMethod | null;
  }>({ open: false, method: null });
  const [editData, setEditData] = useState({ method: '', handle: '', is_active: true });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_cash_handles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error('Error loading methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditData({
      method: method.method,
      handle: method.handle,
      is_active: method.is_active,
    });
    setEditDialog({ open: true, method });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.method) return;

    try {
      const { error } = await supabase
        .from('admin_cash_handles')
        .update({
          handle: editData.handle,
          is_active: editData.is_active,
        })
        .eq('id', editDialog.method.id);

      if (error) throw error;

      toast.success('Payment method updated');
      setEditDialog({ open: false, method: null });
      loadMethods();
    } catch (error) {
      console.error('Error updating method:', error);
      toast.error('Failed to update payment method');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const { error } = await supabase
        .from('admin_cash_handles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Payment method deleted');
      loadMethods();
    } catch (error) {
      console.error('Error deleting method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cashapp: 'Cash App',
      applepay: 'Apple Pay',
      zelle: 'Zelle',
    };
    return labels[method] || method;
  };

  if (loading) {
    return <Card className="p-6"><p>Loading...</p></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage admin payment handles for manual deposits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {methods.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No payment methods configured</p>
            ) : (
              methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{getMethodLabel(method.method)}</Badge>
                      {method.is_active ? (
                        <Badge variant="default" className="bg-success">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">{method.handle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(method)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, method: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription>
              Update the handle and status for this payment method
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Input value={getMethodLabel(editData.method)} disabled />
            </div>
            <div className="space-y-2">
              <Label>Handle</Label>
              <Input
                value={editData.handle}
                onChange={(e) => setEditData({ ...editData, handle: e.target.value })}
                placeholder="Enter handle"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editData.is_active ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setEditData({ ...editData, is_active: value === 'active' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, method: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

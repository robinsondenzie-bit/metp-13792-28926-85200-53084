import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, DollarSign, TrendingUp, Activity, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FundWalletModal } from '@/components/admin/FundWalletModal';
import { PendingTransactions } from '@/components/admin/PendingTransactions';
import { PendingTracking } from '@/components/admin/PendingTracking';
import { BackButton } from '@/components/BackButton';

export default function Admin() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposited: 0,
    txnVolume30d: 0,
    activeToday: 0,
  });
  const [showFundModal, setShowFundModal] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignCode, setAssignCode] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [pendingReleases, setPendingReleases] = useState<any[]>([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [pendingReleaseAmount, setPendingReleaseAmount] = useState(0);
  const [awaitingReleaseCount, setAwaitingReleaseCount] = useState(0);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadPendingTopups();
      loadPendingReleases();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roles) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setIsChecking(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('admin-stats', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const loadPendingTopups = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_topups')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map((t: any) => t.user_id).filter(Boolean)));
      let profilesMap: Record<string, { handle: string }> = {};
      if (userIds.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, handle')
          .in('id', userIds);
        if (profilesError) throw profilesError;
        profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, { handle: p.handle }]));
      }

      const merged = (data || []).map((t: any) => ({ ...t, profiles: profilesMap[t.user_id] }));
      setPendingTopups(merged);
    } catch (error) {
      console.error('Error loading topups:', error);
    }
  };

  const loadPendingReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or('status.eq.AWAITING_RELEASE,and(status.eq.SHIPPED,release_approved_at.is.null)')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const sellerIds = Array.from(new Set((data || []).map((o: any) => o.seller_id).filter(Boolean)));
      let profilesMap: Record<string, { handle: string }> = {};
      if (sellerIds.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, handle')
          .in('id', sellerIds);
        if (profilesError) throw profilesError;
        profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, { handle: p.handle }]));
      }

      const merged = (data || []).map((o: any) => ({ ...o, profiles: profilesMap[o.seller_id] }));
      setPendingReleases(merged || []);
      
      // Calculate total pending release amount for AWAITING_RELEASE only
      const awaiting = merged.filter((order: any) => order.status === 'AWAITING_RELEASE');
      const totalPending = awaiting.reduce((sum: number, order: any) => sum + order.amount_cents, 0);
      setPendingReleaseAmount(totalPending);
      setAwaitingReleaseCount(awaiting.length);
    } catch (error) {
      console.error('Error loading pending releases:', error);
    }
  };

  const handleApproveTopup = async (topupId: string) => {
    setLoadingTopups(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('admin-approve-topup', {
        body: { topupId, action: 'approve' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Wallet top-up approved',
      });

      loadPendingTopups();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingTopups(false);
    }
  };

  const handleRejectTopup = async (topupId: string) => {
    setLoadingTopups(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('admin-approve-topup', {
        body: { topupId, action: 'reject' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Wallet top-up rejected',
      });

      loadPendingTopups();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingTopups(false);
    }
  };

  const handleApproveRelease = async (orderId: string) => {
    setLoadingReleases(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('approve-escrow-release', {
        body: { orderId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Escrow released and funds transferred to seller',
      });

      loadPendingReleases();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingReleases(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!assignEmail || !assignCode) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and admin code',
        variant: 'destructive',
      });
      return;
    }

    setAssigning(true);
    try {
      // Find user by email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user ID from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('handle', `%${assignEmail}%`)
        .maybeSingle();

      if (!profile) {
        toast({
          title: 'User Not Found',
          description: 'No user found with that email',
          variant: 'destructive',
        });
        setAssigning(false);
        return;
      }

      // Call the assign-admin function
      const { error } = await supabase.functions.invoke('assign-admin', {
        body: { userId: profile.id, code: assignCode },
      });

      if (error) {
        toast({
          title: 'Assignment Failed',
          description: error.message || 'Invalid admin code',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Admin role assigned successfully',
        });
        setAssignEmail('');
        setAssignCode('');
      }
    } catch (error) {
      console.error('Error assigning admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign admin role',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      <header className="sticky top-0 z-50 h-16 border-b bg-card px-6 flex items-center justify-between shadow-meta">
        <h1 className="text-xl font-bold text-primary">MetaPay Admin</h1>
        <Button
          variant="ghost"
          onClick={() => {
            supabase.auth.signOut();
            navigate('/');
          }}
        >
          Sign Out
        </Button>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deposited</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalDeposited)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">30d Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.txnVolume30d)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold">{stats.activeToday}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-orange-500/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Release</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                  {formatCurrency(pendingReleaseAmount)}
                </p>
                <p className="text-xs text-muted-foreground">{awaitingReleaseCount} orders</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Transactions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Pending Approvals</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <PendingTransactions />
            <PendingTracking />
          </div>
        </div>

        {/* Pending Wallet Top-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Wallet Top-ups</CardTitle>
            <CardDescription>Manual payment confirmations awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTopups.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending top-ups</p>
            ) : (
              <div className="space-y-3">
                {pendingTopups.map((topup) => (
                  <div key={topup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">@{topup.profiles?.handle}</p>
                      <p className="text-sm text-muted-foreground">
                        {topup.method.toUpperCase()} • Code: {topup.code}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(topup.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold">
                        {formatCurrency(topup.amount_cents)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApproveTopup(topup.id)}
                          disabled={loadingTopups}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectTopup(topup.id)}
                          disabled={loadingTopups}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Order Releases */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Awaiting Release Approval</CardTitle>
            <CardDescription>Orders ready for payment release to sellers</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingReleases.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No orders awaiting release</p>
            ) : (
              <div className="space-y-3">
                {pendingReleases.map((order) => {
                  const isAwaiting = order.status === 'AWAITING_RELEASE';
                  return (
                    <div key={order.id} className="p-4 border-2 rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                            <Badge variant={isAwaiting ? 'default' : 'secondary'}>
                              {isAwaiting ? 'Ready to Release' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">Seller: @{order.profiles?.handle}</p>
                          <p className="text-sm text-muted-foreground">{order.item_description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">Release Amount</p>
                          <p className="text-2xl font-bold text-success">
                            {formatCurrency(order.amount_cents)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 space-y-2 mb-3">
                        {order.tracking_number && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Tracking:</span>
                            <span className="font-medium">
                              {order.shipping_carrier}: {order.tracking_number}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        {order.shipped_at && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Shipped:</span>
                            <span>{new Date(order.shipped_at).toLocaleDateString()}</span>
                          </div>
                        )}
                        {order.delivered_at && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Delivered:</span>
                            <span>{new Date(order.delivered_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => handleApproveRelease(order.id)}
                        disabled={loadingReleases || !isAwaiting}
                      >
                        {loadingReleases ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {isAwaiting ? (<>Approve & Release {formatCurrency(order.amount_cents)}</>) : (<>Awaiting delivery confirmation</>)}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowFundModal(true)}>
                Fund User Wallet
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/payment-ids')}>
                Manage Payment IDs
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">Assign Admin Role</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">User Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Admin Code</label>
                <Input
                  type="password"
                  placeholder="Enter admin code"
                  value={assignCode}
                  onChange={(e) => setAssignCode(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAssignAdmin}
                disabled={assigning || !assignEmail || !assignCode}
                className="w-full"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Admin Role'
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <FundWalletModal
        open={showFundModal}
        onOpenChange={setShowFundModal}
        onSuccess={loadStats}
      />
    </div>
  );
}

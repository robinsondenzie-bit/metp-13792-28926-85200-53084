import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { Loader2, DollarSign } from "lucide-react";

interface Bank {
  id: string;
  bank_name: string;
  account_mask: string;
}

export default function CashOut() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [amount, setAmount] = useState("");
  const [speed, setSpeed] = useState<"standard" | "instant">("standard");
  const [loading, setLoading] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadBanks();
    loadBalance();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const loadBanks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("banks")
        .select("id, bank_name, account_mask")
        .eq("user_id", user.id)
        .eq("status", "VERIFIED");

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error("Error loading banks:", error);
    }
  };

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wallets")
        .select("balance_cents")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setAvailableBalance(data?.balance_cents || 0);
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  };

  const handleCashOut = async () => {
    if (!selectedBank || !amount) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amountCents = Math.round(amountNum * 100);
    if (amountCents > availableBalance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough balance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fee = speed === "instant" ? Math.round(amountCents * 0.015) : 0;

      const { error } = await supabase
        .from("transactions")
        .insert({
          type: "PAYOUT",
          sender_id: user.id,
          amount_cents: amountCents,
          fee_cents: fee,
          bank_id: selectedBank,
          payout_speed: speed,
          status: "PENDING",
          approval_status: "PENDING",
          memo: "Cash out to bank account",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cash out request submitted",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const calculateFee = () => {
    const amountNum = parseFloat(amount) || 0;
    return speed === "instant" ? amountNum * 0.015 : 0;
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    return amountNum - calculateFee();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <BackButton />
      <div className="max-w-2xl mx-auto pt-16 space-y-6">
        <h1 className="text-3xl font-bold">Cash Out</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Transfer to Bank Account</CardTitle>
            <CardDescription>
              Available balance: {formatCurrency(availableBalance)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {banks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No verified bank accounts</p>
                <Button onClick={() => navigate("/settings")}>
                  Add Bank Account
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.bank_name} •••• {bank.account_mask}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Transfer Speed</Label>
                  <RadioGroup value={speed} onValueChange={(value) => setSpeed(value as "standard" | "instant")}>
                    <div className="flex items-start space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="standard" id="standard" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="standard" className="cursor-pointer font-medium">
                          Standard (Free)
                        </Label>
                        <p className="text-sm text-muted-foreground">1-3 business days</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="instant" id="instant" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="instant" className="cursor-pointer font-medium">
                          Instant (1.5% fee)
                        </Label>
                        <p className="text-sm text-muted-foreground">Within minutes</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {amount && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Amount:</span>
                        <span>${parseFloat(amount).toFixed(2)}</span>
                      </div>
                      {speed === "instant" && (
                        <div className="flex justify-between text-sm">
                          <span>Fee (1.5%):</span>
                          <span>-${calculateFee().toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>You'll receive:</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleCashOut}
                  disabled={loading || !selectedBank || !amount}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Cash Out"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

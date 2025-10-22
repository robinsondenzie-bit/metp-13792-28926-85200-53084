import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type PaymentMethod = "cashapp" | "applepay" | "zelle";

export default function AddMoney() {
  const [method, setMethod] = useState<PaymentMethod>("cashapp");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load payment handle when method changes
  const loadHandle = async (selectedMethod: PaymentMethod) => {
    const { data } = await supabase
      .from("admin_cash_handles")
      .select("handle")
      .eq("method", selectedMethod)
      .eq("is_active", true)
      .single();
    
    if (data) {
      setHandle(data.handle);
    }
  };

  const handleMethodChange = (value: PaymentMethod) => {
    setMethod(value);
    loadHandle(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || !amount || !confirmSent) {
      toast({
        title: "Missing information",
        description: "Please fill all fields and confirm you've sent the payment.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      toast({
        title: "Invalid amount",
        description: "Amount must be at least $1",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("wallet_topups")
        .insert({
          user_id: user.id,
          method,
          amount_cents: Math.round(amountNum * 100),
          code: code.trim(),
        });

      if (error) throw error;

      toast({
        title: "Payment recorded",
        description: "Funds will appear in your wallet once admin confirms receipt.",
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

  return (
    <div className="min-h-screen bg-background p-4">
      <BackButton />
      <div className="max-w-lg mx-auto pt-16">
        <Card>
          <CardHeader>
            <CardTitle>Add Money to Wallet</CardTitle>
            <CardDescription>
              Choose a payment method and submit your payment details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={method}
                  onValueChange={handleMethodChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cashapp" id="cashapp" />
                    <Label htmlFor="cashapp" className="font-normal cursor-pointer">
                      Cash App
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="applepay" id="applepay" />
                    <Label htmlFor="applepay" className="font-normal cursor-pointer">
                      Apple Pay
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="zelle" id="zelle" />
                    <Label htmlFor="zelle" className="font-normal cursor-pointer">
                      Zelle
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {handle && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Send payment to:</p>
                  <p className="text-lg font-mono">{handle}</p>
                  <p className="text-xs text-muted-foreground">
                    Include the Payment ID in your memo/note
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Payment ID (from admin)</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={confirmSent}
                  onChange={(e) => setConfirmSent(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="confirm" className="font-normal cursor-pointer">
                  I've sent the payment
                </Label>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Payment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

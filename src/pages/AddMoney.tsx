import { useState, useEffect } from "react";
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
  const [loadingHandle, setLoadingHandle] = useState(true);
  const [confirmSent, setConfirmSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load payment handle when method changes
  const loadHandle = async (selectedMethod: PaymentMethod) => {
    setLoadingHandle(true);
    const { data } = await supabase
      .from("admin_cash_handles")
      .select("handle")
      .eq("method", selectedMethod)
      .eq("is_active", true)
      .single();
    
    if (data) {
      setHandle(data.handle);
    }
    setLoadingHandle(false);
  };

  const handleMethodChange = (value: PaymentMethod) => {
    setMethod(value);
    loadHandle(value);
  };

  // Load initial handle on mount
  useEffect(() => {
    loadHandle("cashapp");
  }, []);

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
    <div className="min-h-screen bg-background p-4 pb-20">
      <BackButton />
      <div className="max-w-2xl mx-auto pt-16">
        <Card className="border-border">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl">Add Money to Wallet</CardTitle>
            <CardDescription className="text-base">
              Choose a payment method and submit your payment details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Payment Method</Label>
                <RadioGroup
                  value={method}
                  onValueChange={handleMethodChange}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="cashapp" id="cashapp" />
                    <Label htmlFor="cashapp" className="font-medium cursor-pointer flex-1">
                      Cash App
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="applepay" id="applepay" />
                    <Label htmlFor="applepay" className="font-medium cursor-pointer flex-1">
                      Apple Pay
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="zelle" id="zelle" />
                    <Label htmlFor="zelle" className="font-medium cursor-pointer flex-1">
                      Zelle
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {loadingHandle ? (
                <div className="p-6 bg-muted/50 rounded-lg border border-border space-y-2">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                    <div className="h-6 bg-muted-foreground/20 rounded w-48"></div>
                  </div>
                </div>
              ) : handle ? (
                <div className="p-6 bg-primary/5 border-2 border-primary/20 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-foreground/80">Send payment to:</p>
                  <p className="text-xl font-mono font-bold text-primary break-all">{handle}</p>
                  <div className="pt-2 border-t border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      💡 <span className="font-medium">Important:</span> Include the Payment ID in your memo/note
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">No payment handle configured for this method</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code" className="text-base font-semibold">Payment ID</Label>
                <p className="text-sm text-muted-foreground mb-2">Enter the 8-character code provided by admin</p>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={8}
                  required
                  className="font-mono text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-base font-semibold">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="pl-8 text-lg"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="confirm"
                  checked={confirmSent}
                  onChange={(e) => setConfirmSent(e.target.checked)}
                  className="h-5 w-5 mt-0.5 rounded border-primary"
                />
                <Label htmlFor="confirm" className="font-medium cursor-pointer text-base leading-relaxed">
                  I confirm that I have sent the payment to the provided handle
                </Label>
              </div>

              <Button type="submit" disabled={loading || !confirmSent} className="w-full h-12 text-base font-semibold">
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Submit Payment
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

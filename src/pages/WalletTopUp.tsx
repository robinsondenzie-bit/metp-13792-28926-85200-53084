import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

type PaymentMethod = "cashapp" | "applepay" | "zelle";

interface PaymentInfo {
  handle: string;
  code: string;
}

export default function WalletTopUp() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "">("");
  const [amount, setAmount] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedMethod) {
      loadPaymentInfo(selectedMethod);
    } else {
      setPaymentInfo(null);
    }
  }, [selectedMethod]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const loadPaymentInfo = async (method: PaymentMethod) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("manual_payments")
        .select("handle, code")
        .eq("method", method)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPaymentInfo(data);
      } else {
        setPaymentInfo(null);
        toast({
          title: "No payment info available",
          description: "Please contact support for payment details",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error loading payment info:", error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod || !amount || !screenshot || !confirmed || !paymentInfo) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and confirm",
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

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // For now, we'll skip file upload and just create the topup record
      // In production, you'd want to upload to Supabase Storage

      const { error } = await supabase
        .from("wallet_topups")
        .insert({
          user_id: user.id,
          method: selectedMethod,
          amount_cents: Math.round(amountNum * 100),
          code: paymentInfo.code,
          status: "pending",
          screenshot_url: null, // Would be file URL after upload
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Top-up request submitted for admin approval",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cashapp: "Cash App",
      applepay: "Apple Pay",
      zelle: "Zelle",
    };
    return labels[method] || method;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <BackButton />
      <div className="max-w-2xl mx-auto pt-16 space-y-6">
        <h1 className="text-3xl font-bold">Top Up Wallet</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Add Money to Your Wallet</CardTitle>
            <CardDescription>Send payment using one of the methods below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Select Payment Method</Label>
              <RadioGroup value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cashapp" id="cashapp" />
                  <Label htmlFor="cashapp" className="cursor-pointer">Cash App</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="applepay" id="applepay" />
                  <Label htmlFor="applepay" className="cursor-pointer">Apple Pay</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="zelle" id="zelle" />
                  <Label htmlFor="zelle" className="cursor-pointer">Zelle</Label>
                </div>
              </RadioGroup>
            </div>

            {selectedMethod && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : paymentInfo ? (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6 space-y-2">
                      <p className="text-sm font-medium">Send payment to:</p>
                      <p className="text-lg font-bold">{paymentInfo.handle}</p>
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Payment ID (include in note):</p>
                        <p className="text-xl font-mono font-bold">{paymentInfo.code}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Screenshot of Payment</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a screenshot showing the completed payment
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirmed"
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                  />
                  <Label htmlFor="confirmed" className="cursor-pointer text-sm">
                    I've sent the money to the {getMethodLabel(selectedMethod)} handle above
                  </Label>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedMethod || !amount || !screenshot || !confirmed || !paymentInfo}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Top-Up Request"
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

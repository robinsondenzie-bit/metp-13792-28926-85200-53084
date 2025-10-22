import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

type PaymentMethod = "cashapp" | "applepay" | "zelle";

export default function ManualPaymentIDs() {
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const handleSave = async () => {
    if (!method || !handle || !code) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (code.length < 8 || code.length > 12) {
      toast({
        title: "Invalid code length",
        description: "Payment ID must be 8-12 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("manual_payments")
        .insert({
          method,
          handle,
          code,
          used: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment ID saved successfully",
      });

      // Clear form
      setMethod("");
      setHandle("");
      setCode("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <BackButton />
      <div className="max-w-2xl mx-auto pt-16 space-y-6">
        <h1 className="text-3xl font-bold">Manual Payment IDs</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Add Payment ID</CardTitle>
            <CardDescription>Create a new manual payment ID for users to reference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashapp">Cash App</SelectItem>
                  <SelectItem value="applepay">Apple Pay</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Admin Handle</Label>
              <Input
                placeholder={
                  method === "cashapp" ? "$cashtag" :
                  method === "applepay" ? "Phone number" :
                  method === "zelle" ? "Email address" :
                  "Select method first"
                }
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment ID (8-12 characters)</Label>
              <Input
                placeholder="Enter any code (e.g., ABC123XY)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
              <p className="text-xs text-muted-foreground">
                {code.length}/12 characters
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !method || !handle || !code}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Payment ID"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

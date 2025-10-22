import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SellerProfile from "./pages/SellerProfile";
import MyDashboard from "./pages/MyDashboard";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AddMoney from "./pages/AddMoney";
import ManualPaymentIDs from "./pages/ManualPaymentIDs";
import WalletTopUp from "./pages/WalletTopUp";
import CashOut from "./pages/CashOut";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { BalanceProvider } from "@/contexts/BalanceContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BalanceProvider>
        <ActivityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/seller/:handle" element={<SellerProfile />} />
                <Route path="/my-dashboard" element={<MyDashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/wallet/add-money" element={<AddMoney />} />
                <Route path="/wallet/top-up" element={<WalletTopUp />} />
                <Route path="/wallet/cash-out" element={<CashOut />} />
                <Route path="/admin/payment-ids" element={<ManualPaymentIDs />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ActivityProvider>
      </BalanceProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ChooseRole from "./pages/ChooseRole";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import SellerListings from "./pages/dashboard/SellerListings";
import CreateListing from "./pages/dashboard/CreateListing";
import BrowseListings from "./pages/dashboard/BrowseListings";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ListingDetail from "./pages/dashboard/ListingDetail";
import ChatList from "./pages/dashboard/ChatList";
import ChatPage from "./pages/dashboard/ChatPage";
import { Flame } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!role) return <Navigate to="/choose-role" replace />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/choose-role" element={<ChooseRole />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="listings" element={<SellerListings />} />
              <Route path="listings/new" element={<CreateListing />} />
              <Route path="browse" element={<BrowseListings />} />
              <Route path="listing/:id" element={<ListingDetail />} />
              <Route path="chat" element={<ChatList />} />
              <Route path="chat/:conversationId" element={<ChatPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingBag,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  escrow: { color: "bg-amber-500/20 text-amber-400", icon: Clock, label: "In Escrow" },
  delivered: { color: "bg-blue-500/20 text-blue-400", icon: Package, label: "Delivered" },
  released: { color: "bg-green-500/20 text-green-400", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-muted text-muted-foreground", icon: XCircle, label: "Cancelled" },
  disputed: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Disputed" },
};

export default function OrdersPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const query = supabase
        .from("orders")
        .select("*, listings(title, price, freefire_uid)")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buyer confirms delivery
  const confirmDeliveryMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ buyer_confirmed: true, status: "delivered" } as any)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Delivery confirmed! Funds will be released to seller.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const buyerOrders = orders?.filter((o: any) => o.buyer_id === user?.id) || [];
  const sellerOrders = orders?.filter((o: any) => o.seller_id === user?.id) || [];

  const OrderCard = ({ order, isSeller }: { order: any; isSeller: boolean }) => {
    const status = statusConfig[order.status] || statusConfig.escrow;
    const StatusIcon = status.icon;

    return (
      <Card className="bg-card/80 border-border/50 hover:border-border transition-colors">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4 shrink-0" />
                <span className="font-display font-semibold truncate">
                  {order.listings?.title || "Unknown Listing"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                UID: {order.listings?.freefire_uid || "N/A"} •{" "}
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-primary">
                ₹{Number(order.amount).toFixed(2)}
              </span>
              <Badge className={`${status.color} text-[10px] font-display`}>
                {status.label}
              </Badge>
              {!isSeller && order.status === "escrow" && (
                <Button
                  size="sm"
                  className="font-display text-xs"
                  onClick={() => confirmDeliveryMutation.mutate(order.id)}
                  disabled={confirmDeliveryMutation.isPending}
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Confirm Delivery
                </Button>
              )}
              {order.status === "escrow" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="font-display text-xs"
                  onClick={() => navigate(`/dashboard/chat`)}
                >
                  Chat <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <ShoppingBag className="h-7 w-7 text-primary" /> My Orders
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your purchases and sales with escrow protection
        </p>
      </motion.div>

      {role !== "seller" && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg">Purchases</h2>
          {isLoading ? (
            <div className="h-20 rounded-xl glass glass-border animate-pulse" />
          ) : !buyerOrders.length ? (
            <Card className="bg-card/50 border-border/30">
              <CardContent className="py-8 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground mt-3">No purchases yet</p>
                <Button
                  variant="outline"
                  className="mt-4 font-display"
                  onClick={() => navigate("/dashboard/browse")}
                >
                  Browse Listings
                </Button>
              </CardContent>
            </Card>
          ) : (
            buyerOrders.map((order: any, i: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <OrderCard order={order} isSeller={false} />
              </motion.div>
            ))
          )}
        </div>
      )}

      {role === "seller" && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg">Sales</h2>
          {isLoading ? (
            <div className="h-20 rounded-xl glass glass-border animate-pulse" />
          ) : !sellerOrders.length ? (
            <Card className="bg-card/50 border-border/30">
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground mt-3">No sales yet</p>
              </CardContent>
            </Card>
          ) : (
            sellerOrders.map((order: any, i: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <OrderCard order={order} isSeller={true} />
              </motion.div>
            ))
          )}
        </div>
      )}

      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle className="font-display text-base">How Escrow Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. When you buy, funds are held securely in escrow</p>
          <p>2. Seller transfers the account to you</p>
          <p>3. You confirm delivery when satisfied</p>
          <p>4. Admin releases funds to seller</p>
          <p className="text-primary font-medium">
            Your money is protected until you receive your account!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

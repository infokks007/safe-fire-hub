import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Package,
  DollarSign,
  Search,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { motion } from "framer-motion";

const statusConfig: Record<string, { color: string; icon: any }> = {
  escrow: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  delivered: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Package },
  released: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  cancelled: { color: "bg-muted text-muted-foreground border-muted", icon: XCircle },
  disputed: { color: "bg-destructive/20 text-destructive border-destructive/30", icon: AlertTriangle },
};

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(title, freefire_uid)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Release funds to seller
  const releaseMutation = useMutation({
    mutationFn: async (order: any) => {
      // Update order status
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          status: "released",
          admin_released: true,
          released_at: new Date().toISOString(),
        } as any)
        .eq("id", order.id);
      if (orderErr) throw orderErr;

      // Credit seller wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", order.seller_id)
        .single();

      if (wallet) {
        const newBalance = Number(wallet.balance) + Number(order.amount) - Number(order.platform_fee || 0);
        const { error: walletErr } = await supabase
          .from("wallets")
          .update({ balance: newBalance } as any)
          .eq("user_id", order.seller_id);
        if (walletErr) throw walletErr;
      }

      // Update listing status
      await supabase
        .from("listings")
        .update({ status: "sold" } as any)
        .eq("id", order.listing_id);

      // Notify seller
      await supabase.rpc("create_notification", {
        _user_id: order.seller_id,
        _type: "payment",
        _title: "Payment Released!",
        _message: `₹${Number(order.amount - (order.platform_fee || 0)).toFixed(2)} has been credited to your wallet.`,
        _reference_id: order.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Funds released to seller!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Cancel order and refund buyer
  const cancelMutation = useMutation({
    mutationFn: async (order: any) => {
      // Update order status
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        } as any)
        .eq("id", order.id);
      if (orderErr) throw orderErr;

      // Refund buyer wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance, escrow_balance")
        .eq("user_id", order.buyer_id)
        .single();

      if (wallet) {
        const { error: walletErr } = await supabase
          .from("wallets")
          .update({
            balance: Number(wallet.balance) + Number(order.amount),
            escrow_balance: Math.max(0, Number(wallet.escrow_balance) - Number(order.amount)),
          } as any)
          .eq("user_id", order.buyer_id);
        if (walletErr) throw walletErr;
      }

      // Update listing status back to active
      await supabase
        .from("listings")
        .update({ status: "active" } as any)
        .eq("id", order.listing_id);

      // Notify buyer
      await supabase.rpc("create_notification", {
        _user_id: order.buyer_id,
        _type: "order_update",
        _title: "Order Cancelled",
        _message: `Your order has been cancelled. ₹${Number(order.amount).toFixed(2)} has been refunded.`,
        _reference_id: order.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order cancelled and buyer refunded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pendingRelease = orders?.filter((o: any) => o.status === "delivered" && o.buyer_confirmed) || [];
  const inEscrow = orders?.filter((o: any) => o.status === "escrow") || [];
  const completed = orders?.filter((o: any) => o.status === "released") || [];

  const filtered = orders?.filter(
    (o: any) =>
      o.listings?.title?.toLowerCase().includes(search.toLowerCase()) ||
      o.id.includes(search)
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-display font-bold">Order Management</h1>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="pl-10 bg-secondary/50 border-border/50 h-10"
          />
        </div>
      </motion.div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="glass glass-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="pending" className="font-display text-xs">
            <DollarSign className="h-3 w-3 mr-1" /> Pending Release ({pendingRelease.length})
          </TabsTrigger>
          <TabsTrigger value="escrow" className="font-display text-xs">
            <Clock className="h-3 w-3 mr-1" /> In Escrow ({inEscrow.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="font-display text-xs">
            <Package className="h-3 w-3 mr-1" /> All Orders ({orders?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Pending Release - buyer confirmed, needs admin release */}
        <TabsContent value="pending" className="space-y-3">
          {!pendingRelease.length ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/30" />
              <p className="text-muted-foreground mt-3">No orders pending release</p>
            </div>
          ) : (
            pendingRelease.map((order: any, i: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-card/80 border-green-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="font-display font-semibold">
                            {order.listings?.title || "Unknown"}
                          </span>
                          <Badge className="text-[10px] bg-green-500/20 text-green-400">
                            Buyer Confirmed
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Buyer: {order.buyer_id.slice(0, 8)}... → Seller: {order.seller_id.slice(0, 8)}...
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-lg text-primary">
                          ₹{Number(order.amount).toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          className="font-display text-xs glow-flame"
                          onClick={() => releaseMutation.mutate(order)}
                          disabled={releaseMutation.isPending}
                        >
                          <DollarSign className="h-3 w-3 mr-1" /> Release Funds
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* In Escrow */}
        <TabsContent value="escrow" className="space-y-3">
          {!inEscrow.length ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto text-amber-500/30" />
              <p className="text-muted-foreground mt-3">No orders in escrow</p>
            </div>
          ) : (
            inEscrow.map((order: any, i: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-card/80 border-amber-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="font-display font-semibold">
                            {order.listings?.title || "Unknown"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Waiting for delivery confirmation
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-primary">
                          ₹{Number(order.amount).toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="font-display text-xs"
                          onClick={() => cancelMutation.mutate(order)}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Cancel & Refund
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* All Orders */}
        <TabsContent value="all" className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl glass glass-border animate-pulse" />
            ))
          ) : (
            filtered?.map((order: any, i: number) => {
              const status = statusConfig[order.status] || statusConfig.escrow;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className={`bg-card/80 ${status.color.split(" ")[2]}`}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="font-display font-semibold truncate block">
                            {order.listings?.title || "Unknown"}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {order.id.slice(0, 8)}... • {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-display font-bold text-primary">
                            ₹{Number(order.amount).toFixed(2)}
                          </span>
                          <Badge className={`${status.color} text-[10px] font-display capitalize`}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

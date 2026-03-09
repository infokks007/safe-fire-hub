import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ShoppingBag,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Send,
  Key,
  Shield,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  escrow: { color: "bg-amber-500/20 text-amber-400", icon: Clock, label: "In Escrow" },
  credentials_submitted: { color: "bg-blue-500/20 text-blue-400", icon: Key, label: "Credentials Sent" },
  admin_verifying: { color: "bg-purple-500/20 text-purple-400", icon: Shield, label: "Admin Verifying" },
  verified: { color: "bg-green-500/20 text-green-400", icon: CheckCircle, label: "Verified" },
  delivered: { color: "bg-green-500/20 text-green-400", icon: Package, label: "Delivered" },
  released: { color: "bg-green-500/20 text-green-400", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-muted text-muted-foreground", icon: XCircle, label: "Cancelled" },
  disputed: { color: "bg-destructive/20 text-destructive", icon: AlertTriangle, label: "Disputed" },
};

export default function OrdersPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [credentialsInput, setCredentialsInput] = useState<Record<string, string>>({});
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(title, price, freefire_uid)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Seller submits account credentials
  const submitCredentialsMutation = useMutation({
    mutationFn: async ({ orderId, credentials }: { orderId: string; credentials: string }) => {
      if (!credentials.trim()) throw new Error("Please enter account credentials");
      const { error } = await supabase
        .from("orders")
        .update({
          account_credentials: credentials.trim(),
          status: "credentials_submitted",
        } as any)
        .eq("id", orderId);
      if (error) throw error;

      // Find the order to get buyer_id
      const order = orders?.find((o: any) => o.id === orderId);
      if (order) {
        // Notify admin
        await supabase.rpc("create_notification", {
          _user_id: order.buyer_id, // notify buyer too
          _type: "order_update",
          _title: "Credentials Submitted",
          _message: "Seller has submitted account credentials. Admin will verify them shortly.",
          _reference_id: orderId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Credentials submitted! Admin will verify the account.");
      setCredentialsInput({});
      setExpandedOrder(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Buyer confirms login (after admin verification)
  const confirmLoginMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({
          buyer_confirmed: true,
          buyer_login_confirmed_at: new Date().toISOString(),
          status: "delivered",
        } as any)
        .eq("id", orderId);
      if (error) throw error;

      const order = orders?.find((o: any) => o.id === orderId);
      if (order) {
        await supabase.rpc("create_notification", {
          _user_id: order.seller_id,
          _type: "order_update",
          _title: "Buyer Confirmed Login",
          _message: `Buyer has confirmed login. Funds will be available for withdrawal after 2 days (anti-scam protection).`,
          _reference_id: orderId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Login confirmed! Seller will receive funds after the 2-day hold period.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const buyerOrders = orders?.filter((o: any) => o.buyer_id === user?.id) || [];
  const sellerOrders = orders?.filter((o: any) => o.seller_id === user?.id) || [];

  const canSellerWithdraw = (order: any) => {
    if (!order.buyer_login_confirmed_at) return false;
    const loginDate = new Date(order.buyer_login_confirmed_at);
    const now = new Date();
    const diffHours = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
    return diffHours >= 48;
  };

  const getTimeRemaining = (order: any) => {
    if (!order.buyer_login_confirmed_at) return "";
    const loginDate = new Date(order.buyer_login_confirmed_at);
    const releaseDate = new Date(loginDate.getTime() + 48 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = releaseDate.getTime() - now.getTime();
    if (diffMs <= 0) return "Ready for release";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  const OrderCard = ({ order, isSeller }: { order: any; isSeller: boolean }) => {
    const status = statusConfig[order.status] || statusConfig.escrow;
    const StatusIcon = status.icon;
    const isExpanded = expandedOrder === order.id;

    return (
      <Card className="bg-card/80 border-border/50 hover:border-border transition-colors">
        <CardContent className="py-4">
          <div
            className="flex items-center justify-between flex-wrap gap-3 cursor-pointer"
            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
          >
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
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border/30 space-y-4">
                  {/* Order Progress Steps */}
                  <div className="glass glass-border rounded-xl p-4">
                    <p className="text-xs font-display font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Order Progress</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Buyer paid ₹{Number(order.amount).toFixed(2)} (in escrow)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.account_credentials ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={!order.account_credentials ? "text-muted-foreground" : ""}>
                          Seller submits account credentials
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.admin_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={!order.admin_verified ? "text-muted-foreground" : ""}>
                          Admin verifies credentials
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.buyer_confirmed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={!order.buyer_confirmed ? "text-muted-foreground" : ""}>
                          Buyer confirms login
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === "released" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={order.status !== "released" ? "text-muted-foreground" : ""}>
                          Funds released to seller (2-day hold)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Seller: Submit Credentials */}
                  {isSeller && order.status === "escrow" && !order.account_credentials && (
                    <div className="space-y-3">
                      <p className="text-sm font-display font-semibold flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" /> Submit Account Credentials
                      </p>
                      <Textarea
                        value={credentialsInput[order.id] || ""}
                        onChange={(e) =>
                          setCredentialsInput((p) => ({ ...p, [order.id]: e.target.value }))
                        }
                        placeholder="Enter account ID, password, and any other login details..."
                        rows={3}
                      />
                      <Button
                        onClick={() =>
                          submitCredentialsMutation.mutate({
                            orderId: order.id,
                            credentials: credentialsInput[order.id] || "",
                          })
                        }
                        disabled={submitCredentialsMutation.isPending || !credentialsInput[order.id]}
                        className="w-full font-display"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitCredentialsMutation.isPending ? "Submitting..." : "Submit Credentials"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Admin will verify these credentials before sharing with the buyer
                      </p>
                    </div>
                  )}

                  {/* Seller: Waiting for verification */}
                  {isSeller && order.account_credentials && !order.admin_verified && (
                    <div className="glass glass-border rounded-xl p-4 text-center">
                      <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-display font-semibold">Credentials Under Review</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Admin is verifying your account credentials. You'll be notified once verified.
                      </p>
                    </div>
                  )}

                  {/* Seller: Withdrawal hold info */}
                  {isSeller && order.buyer_confirmed && order.status !== "released" && (
                    <div className="glass glass-border rounded-xl p-4 text-center">
                      <Lock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm font-display font-semibold">2-Day Hold Period</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {canSellerWithdraw(order)
                          ? "Hold period complete! Admin can now release your funds."
                          : `Funds locked for anti-scam protection. ${getTimeRemaining(order)}`}
                      </p>
                    </div>
                  )}

                  {/* Buyer: View credentials (after admin verification) */}
                  {!isSeller && order.admin_verified && order.account_credentials && !order.buyer_confirmed && (
                    <div className="space-y-3">
                      <div className="glass glass-border rounded-xl p-4">
                        <p className="text-sm font-display font-semibold flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-green-500" /> Account Credentials (Verified ✓)
                        </p>
                        <pre className="text-sm bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap break-all font-mono">
                          {order.account_credentials}
                        </pre>
                      </div>
                      <Button
                        onClick={() => confirmLoginMutation.mutate(order.id)}
                        disabled={confirmLoginMutation.isPending}
                        className="w-full font-display glow-flame"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {confirmLoginMutation.isPending ? "Confirming..." : "Confirm Login Successful"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Only confirm after you've successfully logged into the account
                      </p>
                    </div>
                  )}

                  {/* Buyer: Waiting for credentials */}
                  {!isSeller && order.status === "escrow" && !order.account_credentials && (
                    <div className="glass glass-border rounded-xl p-4 text-center">
                      <Clock className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm font-display font-semibold">Waiting for Seller</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Seller needs to submit account credentials. Your funds are safe in escrow.
                      </p>
                    </div>
                  )}

                  {/* Buyer: Waiting for admin verification */}
                  {!isSeller && order.account_credentials && !order.admin_verified && (
                    <div className="glass glass-border rounded-xl p-4 text-center">
                      <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-display font-semibold">Admin Verifying</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Admin is verifying the credentials. You'll receive them once confirmed.
                      </p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="font-display text-xs"
                    onClick={() => navigate("/dashboard/chat")}
                  >
                    Chat with {isSeller ? "Buyer" : "Seller"} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* Show both sections for all roles */}
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

      <Card className="glass glass-border">
        <CardHeader>
          <CardTitle className="font-display text-base">How Our Escrow System Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Buyer pays → funds held securely in escrow</p>
          <p>2. Seller submits account credentials</p>
          <p>3. Admin verifies the credentials are real</p>
          <p>4. Buyer receives credentials and confirms login</p>
          <p>5. Seller receives funds after 2-day hold (anti-scam)</p>
          <p className="text-primary font-medium">
            Both buyer and seller are protected throughout the process!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

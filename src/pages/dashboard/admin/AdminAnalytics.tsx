import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Package, DollarSign, TrendingUp, MessageSquare, ShieldCheck, Flag } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminAnalytics() {
  const { data: stats } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [listings, profiles, conversations, vouches, flagged, roles] = await Promise.all([
        supabase.from("listings").select("id, price, status, created_at, views_count", { count: "exact" }),
        supabase.from("profiles").select("id, is_verified, created_at", { count: "exact" }),
        supabase.from("conversations").select("id", { count: "exact" }),
        supabase.from("seller_vouches").select("id", { count: "exact" }),
        supabase.from("flagged_listings").select("id, status", { count: "exact" }),
        supabase.from("user_roles").select("role"),
      ]);

      const allListings = listings.data ?? [];
      const activeListings = allListings.filter((l) => l.status === "active");
      const totalRevenue = allListings.reduce((sum, l) => sum + Number(l.price), 0);
      const totalViews = allListings.reduce((sum, l) => sum + (l.views_count ?? 0), 0);
      const sellers = roles.data?.filter((r) => r.role === "seller").length ?? 0;
      const buyers = roles.data?.filter((r) => r.role === "buyer").length ?? 0;
      const verified = profiles.data?.filter((p) => p.is_verified).length ?? 0;
      const pendingFlags = flagged.data?.filter((f) => f.status === "pending").length ?? 0;

      return {
        totalUsers: profiles.count ?? 0,
        sellers,
        buyers,
        verified,
        totalListings: listings.count ?? 0,
        activeListings: activeListings.length,
        totalRevenue,
        totalViews,
        totalConversations: conversations.count ?? 0,
        totalVouches: vouches.count ?? 0,
        pendingFlags,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Sellers", value: stats?.sellers ?? 0, icon: Package, color: "text-emerald-400" },
    { label: "Buyers", value: stats?.buyers ?? 0, icon: TrendingUp, color: "text-violet-400" },
    { label: "Verified", value: stats?.verified ?? 0, icon: ShieldCheck, color: "text-primary" },
    { label: "Total Listings", value: stats?.totalListings ?? 0, icon: Package, color: "text-amber-400" },
    { label: "Active Listings", value: stats?.activeListings ?? 0, icon: Package, color: "text-green-400" },
    { label: "Total Listing Value", value: `$${(stats?.totalRevenue ?? 0).toFixed(0)}`, icon: DollarSign, color: "text-primary" },
    { label: "Total Views", value: stats?.totalViews ?? 0, icon: TrendingUp, color: "text-cyan-400" },
    { label: "Conversations", value: stats?.totalConversations ?? 0, icon: MessageSquare, color: "text-pink-400" },
    { label: "Vouches Given", value: stats?.totalVouches ?? 0, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Pending Flags", value: stats?.pendingFlags ?? 0, icon: Flag, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-display font-bold">Analytics Dashboard</h1>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass glass-border hover:border-primary/30 transition-colors">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-display uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-display font-bold mt-1">{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

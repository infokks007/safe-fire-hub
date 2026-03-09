import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Package, Plus, Eye, DollarSign, Search, ShoppingBag,
  TrendingUp, Users, Shield, Flame, ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function SellerDashboard({ userId }: { userId: string }) {
  const navigate = useNavigate();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["my-listings", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("seller_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeCount = listings?.filter((l) => l.status === "active").length ?? 0;
  const soldCount = listings?.filter((l) => l.status === "sold").length ?? 0;
  const totalViews = listings?.reduce((sum, l) => sum + (l.views_count ?? 0), 0) ?? 0;
  const totalRevenue = listings?.filter((l) => l.status === "sold").reduce((sum, l) => sum + Number(l.price), 0) ?? 0;

  const stats = [
    { label: "Active Listings", value: activeCount, icon: Package, color: "text-primary" },
    { label: "Total Sold", value: soldCount, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "text-blue-400" },
    { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-ember" },
  ];

  return (
    <div className="space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your FreeFire account listings</p>
        </div>
        <Button onClick={() => navigate("/dashboard/listings/new")} className="font-display glow-flame gap-2 group">
          <Plus className="h-4 w-4" /> New Listing
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 1}>
            <Card className="glass glass-border hover:border-primary/20 transition-colors group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-display font-bold mt-1">{isLoading ? "—" : stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
        <Card className="glass glass-border">
          <CardHeader>
            <CardTitle className="font-display">Recent Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !listings?.length ? (
              <div className="text-center py-10 space-y-3">
                <Package className="h-14 w-14 mx-auto text-muted-foreground/20" />
                <p className="text-muted-foreground">No listings yet</p>
                <Button variant="outline" onClick={() => navigate("/dashboard/listings/new")} className="font-display">
                  Create your first listing
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {listings.slice(0, 5).map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/dashboard/listing/${listing.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Flame className="h-5 w-5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{listing.title}</p>
                        <p className="text-xs text-muted-foreground">Lv. {listing.level ?? "?"} • {listing.views_count} views</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-display font-bold text-primary">${Number(listing.price).toFixed(2)}</span>
                      <Badge variant={listing.status === "active" ? "default" : "secondary"} className="font-display capitalize rounded-md text-[10px]">
                        {listing.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function BuyerDashboard() {
  const navigate = useNavigate();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["browse-listings-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });

  const quickStats = [
    { label: "Available", value: `${listings?.length ?? 0}+`, icon: ShoppingBag, color: "text-primary" },
    { label: "Secure", value: "100%", icon: Shield, color: "text-emerald-400" },
    { label: "Active", value: "24/7", icon: TrendingUp, color: "text-ember" },
  ];

  return (
    <div className="space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-1 text-sm">Find your next FreeFire account</p>
        </div>
        <Button onClick={() => navigate("/dashboard/browse")} className="font-display glow-flame gap-2 group">
          <Search className="h-4 w-4" /> Browse All
          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStats.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 1}>
            <Card className="glass glass-border hover:border-primary/20 transition-colors group">
              <CardContent className="pt-6 text-center">
                <stat.icon className={`h-8 w-8 mx-auto ${stat.color} opacity-50 group-hover:opacity-80 transition-opacity mb-2`} />
                <p className="text-2xl font-display font-bold">{isLoading ? "—" : stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
        <Card className="glass glass-border">
          <CardHeader>
            <CardTitle className="font-display">Latest Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !listings?.length ? (
              <div className="text-center py-10">
                <Package className="h-14 w-14 mx-auto text-muted-foreground/20" />
                <p className="text-muted-foreground mt-3">No listings available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing, i) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(`/dashboard/listing/${listing.id}`)}
                    className="rounded-xl glass glass-border hover:border-primary/30 transition-all cursor-pointer p-4 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Flame className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="font-display font-bold text-primary">${Number(listing.price).toFixed(2)}</span>
                    </div>
                    <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">{listing.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Level {listing.level ?? "?"}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-home-stats"],
    queryFn: async () => {
      const [profiles, listings, transactions, disputes, flagged] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("listings").select("id, status, price", { count: "exact" }),
        supabase.from("wallet_transactions").select("id, status, amount").eq("status", "pending"),
        supabase.from("disputes").select("id, status").in("status", ["open", "investigating"]),
        supabase.from("flagged_listings").select("id").eq("status", "pending"),
      ]);
      const activeListings = listings.data?.filter((l) => l.status === "active").length ?? 0;
      const totalValue = listings.data?.reduce((s, l) => s + Number(l.price), 0) ?? 0;
      return {
        totalUsers: profiles.count ?? 0,
        activeListings,
        totalValue,
        pendingDeposits: transactions.data?.length ?? 0,
        openDisputes: disputes.data?.length ?? 0,
        pendingFlags: flagged.data?.length ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Active Listings", value: stats?.activeListings ?? 0, icon: Package, color: "text-primary" },
    { label: "Listing Value", value: `₹${(stats?.totalValue ?? 0).toFixed(0)}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Pending Deposits", value: stats?.pendingDeposits ?? 0, icon: Wallet, color: "text-amber-400" },
    { label: "Open Disputes", value: stats?.openDisputes ?? 0, icon: Shield, color: "text-destructive" },
    { label: "Pending Flags", value: stats?.pendingFlags ?? 0, icon: Flag, color: "text-orange-400" },
  ];

  const quickLinks = [
    { label: "Operations", url: "/dashboard/admin/transactions", icon: DollarSign },
    { label: "All Listings", url: "/dashboard/admin/listings", icon: Package },
    { label: "Users", url: "/dashboard/admin/users", icon: Users },
    { label: "Analytics", url: "/dashboard/admin/analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Marketplace overview and management</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 1}>
            <Card className="glass glass-border hover:border-primary/20 transition-colors group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-display font-bold mt-1">{isLoading ? "—" : card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color} opacity-50 group-hover:opacity-80 transition-opacity`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}>
        <Card className="glass glass-border">
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickLinks.map((link) => (
                <Button
                  key={link.label}
                  variant="outline"
                  className="font-display h-auto py-4 flex-col gap-2 hover:border-primary/40"
                  onClick={() => navigate(link.url)}
                >
                  <link.icon className="h-5 w-5 text-primary" />
                  {link.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function DashboardHome() {
  const { user, role } = useAuth();
  if (role === "seller" && user) return <SellerDashboard userId={user.id} />;
  if (role === "admin") return <AdminDashboard />;
  return <BuyerDashboard />;
}

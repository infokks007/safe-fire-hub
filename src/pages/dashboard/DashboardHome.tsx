import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  Plus,
  Eye,
  DollarSign,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
  Shield,
  Flame,
} from "lucide-react";

function SellerDashboard({ userId }: { userId: string }) {
  const navigate = useNavigate();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["my-listings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeCount = listings?.filter((l) => l.status === "active").length ?? 0;
  const soldCount = listings?.filter((l) => l.status === "sold").length ?? 0;
  const totalViews = listings?.reduce((sum, l) => sum + (l.views_count ?? 0), 0) ?? 0;
  const totalRevenue = listings
    ?.filter((l) => l.status === "sold")
    .reduce((sum, l) => sum + Number(l.price), 0) ?? 0;

  const stats = [
    { label: "Active Listings", value: activeCount, icon: Package, color: "text-primary" },
    { label: "Total Sold", value: soldCount, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "text-blue-400" },
    { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-ember" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your FreeFire account listings</p>
        </div>
        <Button onClick={() => navigate("/dashboard/listings/new")} className="font-display glow-flame gap-2">
          <Plus className="h-4 w-4" /> New Listing
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-display font-bold mt-1">
                    {isLoading ? "—" : stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Recent Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !listings?.length ? (
            <div className="text-center py-8 space-y-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">No listings yet</p>
              <Button variant="outline" onClick={() => navigate("/dashboard/listings/new")} className="font-display">
                Create your first listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.slice(0, 5).map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Flame className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{listing.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Level {listing.level ?? "?"} • {listing.views_count} views
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-display font-bold text-primary">${Number(listing.price).toFixed(2)}</span>
                    <Badge
                      variant={listing.status === "active" ? "default" : "secondary"}
                      className="font-display capitalize"
                    >
                      {listing.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BuyerDashboard() {
  const navigate = useNavigate();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["browse-listings-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-1">Find your next FreeFire account</p>
        </div>
        <Button onClick={() => navigate("/dashboard/browse")} className="font-display glow-flame gap-2">
          <Search className="h-4 w-4" /> Browse All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/80 border-border/50">
          <CardContent className="pt-6 text-center">
            <ShoppingBag className="h-8 w-8 mx-auto text-primary opacity-70 mb-2" />
            <p className="text-2xl font-display font-bold">{isLoading ? "—" : listings?.length ?? 0}+</p>
            <p className="text-sm text-muted-foreground">Available Accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 border-border/50">
          <CardContent className="pt-6 text-center">
            <Shield className="h-8 w-8 mx-auto text-emerald-500 opacity-70 mb-2" />
            <p className="text-2xl font-display font-bold">100%</p>
            <p className="text-sm text-muted-foreground">Secure Trading</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 border-border/50">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-ember opacity-70 mb-2" />
            <p className="text-2xl font-display font-bold">24/7</p>
            <p className="text-sm text-muted-foreground">Marketplace Active</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Latest Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !listings?.length ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-3">No listings available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <Card key={listing.id} className="bg-muted/30 border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Flame className="h-5 w-5 text-primary" />
                      <span className="font-display font-bold text-primary">${Number(listing.price).toFixed(2)}</span>
                    </div>
                    <h3 className="font-display font-semibold truncate">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Level {listing.level ?? "?"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Marketplace overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: "—", icon: Users, color: "text-blue-400" },
          { label: "Active Listings", value: "—", icon: Package, color: "text-primary" },
          { label: "Total Sales", value: "—", icon: DollarSign, color: "text-emerald-500" },
          { label: "Reports", value: "—", icon: Shield, color: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/80 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { user, role } = useAuth();

  if (role === "seller" && user) return <SellerDashboard userId={user.id} />;
  if (role === "admin") return <AdminDashboard />;
  return <BuyerDashboard />;
}

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Flame, LogOut, Shield, Store, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function Index() {
  const { user, role, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(24_100%_50%/0.08),transparent_60%)]" />
        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Flame className="h-12 w-12 text-primary" />
              <h1 className="text-5xl md:text-6xl font-display font-bold text-gradient-flame tracking-tight">
                SALEFIRE
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              The #1 marketplace for FreeFire accounts. Buy & sell with confidence.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="font-display text-lg glow-flame px-8"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    navigate("/choose-role");
    return null;
  }

  const RoleIcon = role === "seller" ? Store : role === "admin" ? Shield : ShoppingBag;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl text-gradient-flame">SALEFIRE</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="font-display gap-1.5">
              <RoleIcon className="h-3 w-3" />
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
            {profile?.is_verified && (
              <Badge className="bg-primary/20 text-primary border-primary/30 font-display">
                ✓ Verified
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">{profile?.display_name}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-display font-bold">
            Welcome, {profile?.display_name}!
          </h1>
          <p className="text-muted-foreground">
            {role === "seller"
              ? "Start listing your FreeFire accounts for sale."
              : role === "buyer"
                ? "Browse available FreeFire accounts."
                : "Manage the marketplace."}
          </p>
        </div>
      </main>
    </div>
  );
}

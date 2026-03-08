import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && role) {
      navigate("/dashboard", { replace: true });
    } else if (user && !role) {
      navigate("/choose-role", { replace: true });
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, ShoppingBag, Store } from "lucide-react";

export default function ChooseRole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<"seller" | "buyer" | null>(null);

  const handleChoose = async () => {
    if (!selected || !user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: selected,
      });
      if (error) throw error;
      toast.success(`You're now a ${selected}!`);
      navigate("/");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: "seller" as const,
      title: "Seller",
      description: "List and sell your FreeFire accounts to buyers worldwide",
      icon: Store,
    },
    {
      id: "buyer" as const,
      title: "Buyer",
      description: "Browse, search, and purchase FreeFire accounts",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(24_100%_50%/0.08),transparent_60%)]" />

      <div className="w-full max-w-2xl relative z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Flame className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-gradient-flame">SALEFIRE</h1>
          </div>
          <h2 className="text-2xl font-display font-semibold">Choose Your Role</h2>
          <p className="text-muted-foreground">This choice is permanent and cannot be changed later.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                selected === role.id
                  ? "border-primary glow-flame bg-primary/5"
                  : "border-border/50 bg-card/80 hover:border-primary/30"
              }`}
              onClick={() => setSelected(role.id)}
            >
              <CardHeader className="text-center pb-2">
                <role.icon
                  className={`h-12 w-12 mx-auto mb-2 transition-colors ${
                    selected === role.id ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <CardTitle className="font-display text-xl">{role.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">{role.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleChoose}
            disabled={!selected || loading}
            className="px-8 font-display text-lg glow-flame"
            size="lg"
          >
            {loading ? "Setting up..." : "Confirm Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}

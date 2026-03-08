import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, ShoppingBag, Store, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function ChooseRole() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<"seller" | "buyer" | null>(null);

  useEffect(() => {
    if (!authLoading && role) navigate("/dashboard", { replace: true });
  }, [authLoading, role, navigate]);

  const handleChoose = async () => {
    if (!selected || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_roles").upsert(
        { user_id: user.id, role: selected },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );
      if (error) throw error;
      toast.success(`You're now a ${selected}!`);
      window.location.href = "/dashboard";
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
      gradient: "from-primary/20 to-ember/10",
    },
    {
      id: "buyer" as const,
      title: "Buyer",
      description: "Browse, search, and purchase FreeFire accounts",
      icon: ShoppingBag,
      gradient: "from-blue-500/10 to-primary/10",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,hsl(22_100%_52%/0.08),transparent_60%)] blur-3xl" />

      <div className="w-full max-w-2xl relative z-10 space-y-8">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Flame className="h-8 w-8 text-primary drop-shadow-[0_0_12px_hsl(22_100%_52%/0.5)]" />
            <h1 className="text-3xl font-display font-bold text-gradient-flame">SALEFIRE</h1>
          </div>
          <h2 className="text-2xl font-display font-semibold">Choose Your Role</h2>
          <p className="text-muted-foreground text-sm">Select how you want to use the marketplace</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i + 1}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(role.id)}
              className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-300 glass glass-border ${
                selected === role.id
                  ? "border-primary glow-flame-sm"
                  : "hover:border-muted-foreground/30"
              }`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-50`} />
              <div className="relative text-center space-y-3">
                <motion.div
                  animate={selected === role.id ? { rotate: [0, -8, 8, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <role.icon className={`h-12 w-12 mx-auto transition-colors duration-300 ${
                    selected === role.id ? "text-primary" : "text-muted-foreground"
                  }`} />
                </motion.div>
                <h3 className="font-display text-xl font-bold">{role.title}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex justify-center">
          <Button
            onClick={handleChoose}
            disabled={!selected || loading}
            className="px-8 font-display text-lg glow-flame h-12 gap-2 group"
            size="lg"
          >
            {loading ? "Setting up..." : "Confirm Role"}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

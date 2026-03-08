import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Flame, ArrowRight, Shield, Zap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  { icon: Shield, title: "Secure Trading", desc: "Every transaction is protected" },
  { icon: Zap, title: "Instant Chat", desc: "Talk directly with sellers" },
  { icon: Users, title: "Verified Sellers", desc: "Trusted community members" },
];

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && role) navigate("/dashboard", { replace: true });
    else if (user && !role) navigate("/choose-role", { replace: true });
  }, [user, role, loading, navigate]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,hsl(22_100%_52%/0.1),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,hsl(35_100%_52%/0.06),transparent_60%)] blur-3xl" />

      <div className="relative z-10 text-center space-y-10 max-w-2xl">
        {/* Logo */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="flex items-center justify-center gap-3"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            <Flame className="h-14 w-14 text-primary drop-shadow-[0_0_20px_hsl(22_100%_52%/0.6)]" />
          </motion.div>
          <h1 className="text-6xl md:text-7xl font-display font-bold text-gradient-flame tracking-tight">
            SALEFIRE
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-xl md:text-2xl text-muted-foreground font-light max-w-lg mx-auto leading-relaxed"
        >
          The <span className="text-foreground font-medium">#1 marketplace</span> for FreeFire accounts.
          Buy & sell with confidence.
        </motion.p>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="flex gap-4 justify-center"
        >
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="font-display text-lg glow-flame px-8 h-13 gap-2 group"
          >
            Get Started
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-wrap justify-center gap-4 pt-4"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl glass glass-border"
            >
              <f.icon className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-sm font-display font-semibold leading-none">{f.title}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

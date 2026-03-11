import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel, Clock, Users, Flame, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface Auction {
  id: string;
  title: string;
  description: string | null;
  starting_price: number;
  current_price: number;
  highest_bidder_id: string | null;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  status: string;
  seller_id: string;
  level: number | null;
  rank: string | null;
  region: string | null;
  images: string[] | null;
  created_at: string;
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Ended");
        setIsExpired(true);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <span className={`font-mono font-bold ${isExpired ? "text-muted-foreground" : "text-primary"}`}>
      {timeLeft}
    </span>
  );
}

export default function BrowseAuctions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuctions = async () => {
    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .in("status", ["active"])
      .order("created_at", { ascending: false });
    if (!error && data) setAuctions(data as unknown as Auction[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAuctions();

    // Realtime subscription for live updates
    const channel = supabase
      .channel("auctions-browse")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => {
        fetchAuctions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gavel className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">Live Auctions</h1>
            <p className="text-sm text-muted-foreground">Bid on FreeFire accounts in real-time</p>
          </div>
        </div>
        {role === "seller" && (
          <Button onClick={() => navigate("/dashboard/auctions/new")} className="gap-2 font-display glow-flame">
            <Plus className="h-4 w-4" /> Create Auction
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Flame className="h-8 w-8 text-primary animate-pulse" />
        </div>
      ) : auctions.length === 0 ? (
        <Card className="bg-card/50 border-border/30">
          <CardContent className="py-16 text-center">
            <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display text-lg mb-1">No Active Auctions</h3>
            <p className="text-sm text-muted-foreground">Check back soon for live auctions!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map((auction, i) => (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="bg-card/80 border-border/50 hover:border-primary/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/dashboard/auction/${auction.id}`)}
              >
                {/* Image */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {auction.images && auction.images.length > 0 ? (
                    <img src={auction.images[0]} alt={auction.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Gavel className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  {/* Live badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-destructive text-destructive-foreground font-display gap-1 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white" /> LIVE
                    </Badge>
                  </div>
                  {/* Timer */}
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <CountdownTimer endsAt={auction.ends_at} />
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <h3 className="font-display font-semibold text-sm truncate">{auction.title}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Bid</p>
                      <p className="text-xl font-display font-bold text-primary">₹{auction.current_price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Starting</p>
                      <p className="text-sm font-mono text-muted-foreground">₹{auction.starting_price}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {auction.level && <Badge variant="outline" className="text-xs">Lvl {auction.level}</Badge>}
                    {auction.rank && <Badge variant="outline" className="text-xs">{auction.rank}</Badge>}
                    {auction.region && <Badge variant="outline" className="text-xs">{auction.region}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

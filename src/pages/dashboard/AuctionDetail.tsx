import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Gavel, ArrowLeft, Clock, Flame, Trophy, User, TrendingUp, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  freefire_uid: string | null;
  level: number | null;
  rank: string | null;
  region: string | null;
  elite_pass: boolean | null;
  characters: string[] | null;
  gun_skins: string[] | null;
  evo_guns: string[] | null;
  bundles: string[] | null;
  images: string[] | null;
}

interface Bid {
  id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  profile?: { display_name: string | null };
}

function CountdownTimer({ endsAt, onExpired }: { endsAt: string; onExpired?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Auction Ended");
        setIsExpired(true);
        onExpired?.();
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s remaining`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpired]);

  return (
    <div className={`flex items-center gap-2 text-lg font-mono font-bold ${isExpired ? "text-muted-foreground" : "text-primary"}`}>
      <Clock className="h-5 w-5" />
      {timeLeft}
    </div>
  );
}

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const fetchAuction = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("auctions").select("*").eq("id", id).single();
    if (data) {
      setAuction(data as unknown as Auction);
      setIsExpired(new Date(data.ends_at).getTime() <= Date.now());
    }
    setLoading(false);
  }, [id]);

  const fetchBids = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("auction_bids")
      .select("*")
      .eq("auction_id", id)
      .order("amount", { ascending: false })
      .limit(50);
    
    if (data) {
      // Fetch profiles for bidders
      const bidderIds = [...new Set(data.map((b: any) => b.bidder_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", bidderIds);
      
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      setBids(data.map((b: any) => ({
        ...b,
        profile: profileMap.get(b.bidder_id) || null,
      })));
    }
  }, [id]);

  useEffect(() => {
    fetchAuction();
    fetchBids();

    // Realtime for auction updates
    const auctionChannel = supabase
      .channel(`auction-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${id}` }, () => {
        fetchAuction();
      })
      .subscribe();

    // Realtime for new bids
    const bidsChannel = supabase
      .channel(`auction-bids-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${id}` }, () => {
        fetchBids();
        fetchAuction();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [id, fetchAuction, fetchBids]);

  const placeBid = async () => {
    if (!user || !auction || !bidAmount) return;
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= auction.current_price) {
      toast.error(`Bid must be higher than ₹${auction.current_price}`);
      return;
    }
    setBidding(true);
    try {
      const { error } = await supabase.rpc("place_bid", {
        _auction_id: auction.id,
        _bidder_id: user.id,
        _amount: amount,
      });
      if (error) throw error;
      toast.success("Bid placed! 🔥");
      setBidAmount("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBidding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Auction not found</p>
        <Button variant="ghost" onClick={() => navigate("/dashboard/auctions")} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const isSeller = user?.id === auction.seller_id;
  const isHighestBidder = user?.id === auction.highest_bidder_id;
  const canBid = !isSeller && !isExpired && auction.status === "active";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard/auctions")} className="gap-2 font-display">
        <ArrowLeft className="h-4 w-4" /> Back to Auctions
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Images */}
          {auction.images && auction.images.length > 0 && (
            <Card className="overflow-hidden border-border/50">
              <div className="aspect-video relative">
                <img
                  src={auction.images[selectedImage]}
                  alt={auction.title}
                  className="w-full h-full object-cover"
                />
                {!isExpired && (
                  <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground font-display gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" /> LIVE
                  </Badge>
                )}
              </div>
              {auction.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {auction.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors shrink-0 ${i === selectedImage ? "border-primary" : "border-border/50"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="bg-card/80 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-xl">{auction.title}</CardTitle>
                <Badge variant={isExpired ? "secondary" : "default"} className="font-display">
                  {isExpired ? "Ended" : "Live"}
                </Badge>
              </div>
              <CountdownTimer endsAt={auction.ends_at} onExpired={() => setIsExpired(true)} />
            </CardHeader>
            <CardContent className="space-y-4">
              {auction.description && <p className="text-sm text-muted-foreground">{auction.description}</p>}
              
              <Separator />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {auction.freefire_uid && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">UID</p>
                    <p className="font-mono text-sm">{auction.freefire_uid}</p>
                  </div>
                )}
                {auction.level && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-semibold">{auction.level}</p>
                  </div>
                )}
                {auction.rank && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rank</p>
                    <Badge variant="outline">{auction.rank}</Badge>
                  </div>
                )}
                {auction.region && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="text-sm">{auction.region}</p>
                  </div>
                )}
                {auction.elite_pass && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Elite Pass</p>
                    <Badge className="bg-primary/20 text-primary">✓ Yes</Badge>
                  </div>
                )}
              </div>

              {/* Inventory */}
              {[
                { label: "Evo Guns", items: auction.evo_guns },
                { label: "Gun Skins", items: auction.gun_skins },
                { label: "Bundles", items: auction.bundles },
                { label: "Characters", items: auction.characters },
              ].map(({ label, items }) =>
                items && items.length > 0 ? (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-display">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Bidding Panel */}
        <div className="space-y-4">
          {/* Current Price Card */}
          <Card className="bg-card/80 border-primary/30">
            <CardContent className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-display">Current Bid</p>
                <motion.p
                  key={auction.current_price}
                  initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-display font-bold text-primary mt-1"
                >
                  ₹{auction.current_price}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-1">Started at ₹{auction.starting_price}</p>
              </div>

              {isHighestBidder && (
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-3">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-display text-primary">You're the highest bidder!</span>
                </div>
              )}

              {canBid && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Min ₹${auction.current_price + 1}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={auction.current_price + 1}
                      className="font-mono"
                    />
                    <Button onClick={placeBid} disabled={bidding} className="font-display glow-flame shrink-0">
                      {bidding ? "..." : "Bid"}
                    </Button>
                  </div>
                  {/* Quick bid buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 50, 100].map((inc) => (
                      <Button
                        key={inc}
                        variant="outline"
                        size="sm"
                        className="text-xs font-mono"
                        onClick={() => setBidAmount(String(auction.current_price + inc))}
                      >
                        +₹{inc}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {isExpired && auction.highest_bidder_id && (
                <div className="text-center space-y-2">
                  <Trophy className="h-8 w-8 text-primary mx-auto" />
                  <p className="font-display font-semibold">Auction Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Won for ₹{auction.current_price}
                  </p>
                </div>
              )}

              {isSeller && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">This is your auction</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bid History */}
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Bid History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {bids.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No bids yet. Be the first!</p>
                ) : (
                  bids.map((bid, i) => (
                    <motion.div
                      key={bid.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${i === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {bid.profile?.display_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">
                            {bid.bidder_id === user?.id ? "You" : bid.profile?.display_name || "Anonymous"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(bid.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {i === 0 && <Trophy className="h-3 w-3 text-primary" />}
                        <span className={`font-mono font-bold text-sm ${i === 0 ? "text-primary" : ""}`}>
                          ₹{bid.amount}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

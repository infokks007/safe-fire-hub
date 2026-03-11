import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Flame, MessageSquare, User, Shield, ChevronLeft, ChevronRight,
  Play, Image as ImageIcon, Eye, Tag, X, ShoppingBag, Wallet, Pencil, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile", listing?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", listing!.seller_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!listing?.seller_id,
  });

  const { data: wallet } = useQuery({
    queryKey: ["my-wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) return { balance: 0, escrow_balance: 0 };
      return data;
    },
    enabled: !!user,
  });

  const startChatMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("conversations").select("id")
        .eq("listing_id", listing.id).eq("buyer_id", user.id).single();
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from("conversations")
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
        .select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (conversationId) => navigate(`/dashboard/chat/${conversationId}`),
    onError: (err: Error) => toast.error(err.message),
  });

  // Buy now with escrow (atomic server-side function)
  const buyNowMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("Not authenticated");

      const { data: orderId, error } = await supabase.rpc("purchase_listing", {
        _buyer_id: user.id,
        _listing_id: listing.id,
      });
      if (error) throw new Error(error.message);

      // Create conversation if not exists
      const { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .single();

      if (!convo) {
        await supabase.from("conversations").insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
        });
      }

      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      setShowBuyDialog(false);
      toast.success("Purchase successful! Funds are held in escrow. Chat with seller to receive your account.");
      navigate("/dashboard/orders");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update listing mutation (for sellers)
  const updateListingMutation = useMutation({
    mutationFn: async (updates: { price?: number; title?: string; description?: string }) => {
      if (!listing) throw new Error("No listing");
      const { error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", listing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing", id] });
      setIsEditingPrice(false);
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      toast.success("Listing updated!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Flame className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!listing) {
    return <p className="text-muted-foreground text-center py-16">Listing not found</p>;
  }

  const images = (listing.images as string[]) || [];
  const isSeller = user?.id === listing.seller_id;
  const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);
  const goNext = () => setSelectedImage((p) => (p + 1) % images.length);
  const goPrev = () => setSelectedImage((p) => (p - 1 + images.length) % images.length);

  const detailGroups = [
    { label: "Evo Guns", items: listing.evo_guns as string[], icon: "🔫" },
    { label: "Gun Skins", items: listing.gun_skins as string[], icon: "🎨" },
    { label: "Bundles", items: listing.bundles as string[], icon: "👕" },
    { label: "Characters", items: listing.characters as string[], icon: "🧑" },
  ].filter((g) => g.items && g.items.length > 0);

  return (
    <>
      {/* Fullscreen overlay */}
      <AnimatePresence>
        {showFullscreen && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center"
            onClick={() => setShowFullscreen(false)}
          >
            <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setShowFullscreen(false)}>
              <X className="h-6 w-6" />
            </Button>
            {images.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-4" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button variant="ghost" size="icon" className="absolute right-4" onClick={(e) => { e.stopPropagation(); goNext(); }}>
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {isVideo(images[selectedImage]) ? (
                <video src={images[selectedImage]} controls autoPlay className="max-h-[85vh] rounded-xl" />
              ) : (
                <img src={images[selectedImage]} alt="" className="max-h-[85vh] rounded-xl object-contain" />
              )}
            </motion.div>
            <p className="absolute bottom-6 text-sm text-muted-foreground font-display">{selectedImage + 1} / {images.length}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto space-y-4"
      >
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 font-display hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Media Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-7 space-y-3"
          >
            <div
              className="relative aspect-[4/3] rounded-2xl overflow-hidden glass glass-border cursor-zoom-in group"
              onClick={() => images.length > 0 && setShowFullscreen(true)}
            >
              {images.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    {isVideo(images[selectedImage]) ? (
                      <video src={images[selectedImage]} controls className="w-full h-full object-contain bg-black" onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <img src={images[selectedImage]} alt={listing.title} className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500" />
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Flame className="h-16 w-16 text-muted-foreground/15" />
                  <span className="text-sm text-muted-foreground">No images</span>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 glass rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 glass rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 glass rounded-lg px-2.5 py-1 text-xs flex items-center gap-1 font-display">
                    <ImageIcon className="h-3 w-3" /> {selectedImage + 1}/{images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      i === selectedImage ? "border-primary glow-flame-sm scale-105" : "border-border/30 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {isVideo(img) ? (
                      <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                        <Play className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          {/* RIGHT: Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="lg:col-span-5 space-y-4"
          >
            {/* Title & Price */}
            <div className="rounded-2xl glass glass-border p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="font-display capitalize mb-2 rounded-md">{listing.status}</Badge>
                  <h1 className="font-display font-bold text-2xl leading-tight">{listing.title}</h1>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="font-display font-bold text-3xl text-gradient-flame">
                    ${Number(listing.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {listing.description && (
                <>
                  <Separator className="bg-border/30" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
                </>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {listing.freefire_uid && (
                  <div className="rounded-xl bg-secondary/40 p-3 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">UID</p>
                    <p className="font-display font-semibold text-sm mt-1">{listing.freefire_uid}</p>
                  </div>
                )}
                {listing.level && (
                  <div className="rounded-xl bg-secondary/40 p-3 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Level</p>
                    <p className="font-display font-semibold text-sm mt-1">{listing.level}</p>
                  </div>
                )}
                <div className="rounded-xl bg-secondary/40 p-3 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Views</p>
                  <p className="font-display font-semibold text-sm mt-1 flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" /> {listing.views_count}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-3 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Listed</p>
                  <p className="font-display font-semibold text-sm mt-1">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory */}
            {detailGroups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl glass glass-border p-6 space-y-4"
              >
                <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" /> Account Inventory
                </h2>
                {detailGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      {group.icon} {group.label} ({group.items.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs font-display rounded-md">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Seller */}
            {sellerProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-2xl glass glass-border p-4 flex items-center gap-3"
              >
                <div className="h-11 w-11 rounded-full bg-secondary/60 flex items-center justify-center shrink-0 ring-2 ring-border/30">
                  {sellerProfile.avatar_url ? (
                    <img src={sellerProfile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm truncate">{sellerProfile.display_name}</p>
                  <p className="text-xs text-muted-foreground">Seller</p>
                </div>
                {sellerProfile.is_verified && (
                  <Badge className="text-xs bg-primary/15 text-primary border-0 gap-1 shrink-0 rounded-md">
                    <Shield className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </motion.div>
            )}

            {/* CTA */}
            {!isSeller && user && listing.status === "active" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Button
                  onClick={() => setShowBuyDialog(true)}
                  className="w-full font-display glow-flame gap-2 h-13 text-base rounded-xl group"
                  size="lg"
                >
                  <ShoppingBag className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  Buy Now - ₹{Number(listing.price).toFixed(2)}
                </Button>
                <Button
                  onClick={() => startChatMutation.mutate()}
                  disabled={startChatMutation.isPending}
                  variant="outline"
                  className="w-full font-display gap-2 h-11 rounded-xl"
                >
                  <MessageSquare className="h-4 w-4" />
                  {startChatMutation.isPending ? "Opening chat..." : "Chat with Seller"}
                </Button>
              </motion.div>
            )}

            {!isSeller && listing.status !== "active" && (
              <div className="rounded-2xl glass glass-border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {listing.status === "sold" ? "This account has been sold" : "This listing is no longer available"}
                </p>
              </div>
            )}

            {isSeller && (
              <div className="rounded-2xl glass glass-border p-4 text-center">
                <p className="text-sm text-muted-foreground">This is your listing</p>
              </div>
            )}

            {/* Reviews Section */}
            <div className="space-y-4">
              <h3 className="font-display font-semibold">Reviews</h3>
              <ReviewsList sellerId={listing.seller_id} listingId={listing.id} />
              {user && user.id !== listing.seller_id && (
                <ReviewForm
                  listingId={listing.id}
                  sellerId={listing.seller_id}
                />
              )}
            </div>
          </motion.div>
        </div>

        {/* Buy Dialog */}
        <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Confirm Purchase</DialogTitle>
              <DialogDescription>
                You are about to purchase this FreeFire account with escrow protection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-secondary/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Listing</span>
                  <span className="font-display font-semibold">{listing?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-display font-bold text-primary">
                    ₹{Number(listing?.price).toFixed(2)}
                  </span>
                </div>
                <Separator className="bg-border/30" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> Your Balance
                  </span>
                  <span className="font-display font-semibold">
                    ₹{Number(wallet?.balance ?? 0).toFixed(2)}
                  </span>
                </div>
                {wallet && Number(wallet.balance) < Number(listing?.price) && (
                  <p className="text-xs text-destructive">
                    Insufficient balance. Please add ₹
                    {(Number(listing?.price) - Number(wallet.balance)).toFixed(2)} to your wallet.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                <p className="font-display font-semibold text-primary">🔒 Escrow Protection</p>
                <p className="text-muted-foreground">
                  Funds are held securely until you confirm delivery. You're protected!
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBuyDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => buyNowMutation.mutate()}
                disabled={
                  buyNowMutation.isPending ||
                  (wallet && Number(wallet.balance) < Number(listing?.price))
                }
                className="font-display glow-flame"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {buyNowMutation.isPending ? "Processing..." : "Confirm Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}

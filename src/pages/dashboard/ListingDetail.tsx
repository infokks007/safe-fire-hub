import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, Flame, MessageSquare, User, Shield, ChevronLeft, ChevronRight,
  Play, Image as ImageIcon, Eye, Calendar, Tag
} from "lucide-react";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile", listing?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", listing!.seller_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!listing?.seller_id,
  });

  const startChatMutation = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .single();
      if (existing) return existing.id;
      const { data, error } = await supabase
        .from("conversations")
        .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (conversationId) => navigate(`/dashboard/chat/${conversationId}`),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
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
      {showFullscreen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-foreground"
            onClick={() => setShowFullscreen(false)}
          >
            ✕
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
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {isVideo(images[selectedImage]) ? (
              <video src={images[selectedImage]} controls autoPlay className="max-h-[85vh] rounded-lg" />
            ) : (
              <img src={images[selectedImage]} alt="" className="max-h-[85vh] rounded-lg object-contain" />
            )}
          </div>
          <p className="absolute bottom-4 text-sm text-muted-foreground">{selectedImage + 1} / {images.length}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-4">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 font-display">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ===== LEFT: Media Gallery ===== */}
          <div className="lg:col-span-7 space-y-3">
            {/* Main image */}
            <div
              className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/50 bg-muted cursor-zoom-in group"
              onClick={() => images.length > 0 && setShowFullscreen(true)}
            >
              {images.length > 0 ? (
                isVideo(images[selectedImage]) ? (
                  <video
                    src={images[selectedImage]}
                    controls
                    className="w-full h-full object-contain bg-black"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={images[selectedImage]}
                    alt={listing.title}
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Flame className="h-16 w-16 text-muted-foreground/20" />
                  <span className="text-sm text-muted-foreground">No images</span>
                </div>
              )}

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> {selectedImage + 1}/{images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      i === selectedImage
                        ? "border-primary glow-flame scale-105"
                        : "border-border/50 hover:border-muted-foreground/50 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {isVideo(img) ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center relative">
                        <Play className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===== RIGHT: Product Details ===== */}
          <div className="lg:col-span-5 space-y-4">
            {/* Title & Price */}
            <div className="rounded-xl bg-card/80 border border-border/50 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="font-display capitalize mb-2">{listing.status}</Badge>
                  <h1 className="font-display font-bold text-2xl leading-tight">{listing.title}</h1>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-display font-bold text-3xl text-gradient-flame">
                    ${Number(listing.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {listing.description && (
                <>
                  <Separator className="bg-border/50" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
                </>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {listing.freefire_uid && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">UID</p>
                    <p className="font-display font-semibold text-sm mt-1">{listing.freefire_uid}</p>
                  </div>
                )}
                {listing.level && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</p>
                    <p className="font-display font-semibold text-sm mt-1">{listing.level}</p>
                  </div>
                )}
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Views</p>
                  <p className="font-display font-semibold text-sm mt-1 flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" /> {listing.views_count}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Listed</p>
                  <p className="font-display font-semibold text-sm mt-1">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory details */}
            {detailGroups.length > 0 && (
              <div className="rounded-xl bg-card/80 border border-border/50 p-5 space-y-4">
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
                        <Badge key={item} variant="outline" className="text-xs font-display">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Seller info */}
            {sellerProfile && (
              <div className="rounded-xl bg-card/80 border border-border/50 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  {sellerProfile.avatar_url ? (
                    <img src={sellerProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm truncate">{sellerProfile.display_name}</p>
                  <p className="text-xs text-muted-foreground">Seller</p>
                </div>
                {sellerProfile.is_verified && (
                  <Badge className="text-xs bg-primary/20 text-primary border-0 gap-1 shrink-0">
                    <Shield className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
            )}

            {/* CTA: Chat with Seller */}
            {!isSeller && user && (
              <Button
                onClick={() => startChatMutation.mutate()}
                disabled={startChatMutation.isPending}
                className="w-full font-display glow-flame gap-2 h-12 text-base"
                size="lg"
              >
                <MessageSquare className="h-5 w-5" />
                {startChatMutation.isPending ? "Opening chat..." : "Chat Now"}
              </Button>
            )}

            {isSeller && (
              <div className="rounded-xl bg-secondary/30 border border-border/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">This is your listing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Flame, MessageSquare, User } from "lucide-react";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);

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

      // Check existing conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("buyer_id", user.id)
        .single();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: (conversationId) => {
      navigate(`/dashboard/chat/${conversationId}`);
    },
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 font-display">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Media */}
        <div className="lg:col-span-3 space-y-3">
          {images.length > 0 ? (
            <>
              <div className="aspect-video rounded-lg overflow-hidden border border-border/50 bg-muted">
                {images[selectedImage]?.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={images[selectedImage]} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={images[selectedImage]} alt={listing.title} className="w-full h-full object-contain" />
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                        i === selectedImage ? "border-primary" : "border-border/50"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-video rounded-lg border border-border/50 bg-muted flex items-center justify-center">
              <Flame className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-display capitalize">{listing.status}</Badge>
                <span className="font-display font-bold text-2xl text-primary">
                  ${Number(listing.price).toFixed(2)}
                </span>
              </div>
              <CardTitle className="font-display text-xl mt-2">{listing.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {listing.description && (
                <p className="text-sm text-muted-foreground">{listing.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {listing.freefire_uid && (
                  <div>
                    <span className="text-muted-foreground">UID:</span>{" "}
                    <span className="font-medium">{listing.freefire_uid}</span>
                  </div>
                )}
                {listing.level && (
                  <div>
                    <span className="text-muted-foreground">Level:</span>{" "}
                    <span className="font-medium">{listing.level}</span>
                  </div>
                )}
              </div>

              {[
                { label: "Evo Guns", items: listing.evo_guns as string[] },
                { label: "Gun Skins", items: listing.gun_skins as string[] },
                { label: "Bundles", items: listing.bundles as string[] },
                { label: "Characters", items: listing.characters as string[] },
              ]
                .filter((g) => g.items && g.items.length > 0)
                .map((group) => (
                  <div key={group.label}>
                    <p className="text-xs text-muted-foreground mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.items.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs font-display">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Seller info */}
              {sellerProfile && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{sellerProfile.display_name}</span>
                  {sellerProfile.is_verified && (
                    <Badge className="text-xs bg-primary/20 text-primary border-0">Verified</Badge>
                  )}
                </div>
              )}

              {/* Chat button for buyers */}
              {role === "buyer" && !isSeller && (
                <Button
                  onClick={() => startChatMutation.mutate()}
                  disabled={startChatMutation.isPending}
                  className="w-full font-display glow-flame gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  {startChatMutation.isPending ? "Opening chat..." : "Chat with Seller"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

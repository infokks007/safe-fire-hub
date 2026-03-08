import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, Search, Package, Star, Eye } from "lucide-react";

export default function BrowseListings() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["browse-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = listings?.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-display font-bold">Browse Accounts</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl bg-card/80 border border-border/50 animate-pulse">
              <div className="aspect-[4/3] bg-muted rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-4 text-lg">
            {search ? "No listings match your search" : "No listings available yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((listing) => {
            const images = (listing.images as string[]) || [];
            const thumbnail = images[0];

            return (
              <div
                key={listing.id}
                onClick={() => navigate(`/dashboard/listing/${listing.id}`)}
                className="group rounded-xl bg-card/80 border border-border/50 hover:border-primary/40 hover:glow-flame transition-all cursor-pointer overflow-hidden"
              >
                {/* Product Image */}
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Flame className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}

                  {/* Price tag */}
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1 border border-border/50">
                    <span className="font-display font-bold text-lg text-primary">
                      ${Number(listing.price).toFixed(2)}
                    </span>
                  </div>

                  {listing.is_featured && (
                    <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm rounded-md px-2 py-0.5 flex items-center gap-1">
                      <Star className="h-3 w-3 text-primary-foreground fill-current" />
                      <span className="text-xs font-display font-semibold text-primary-foreground">Featured</span>
                    </div>
                  )}

                  {/* Image count */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs text-foreground">
                      📷 {images.length}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 space-y-2">
                  <h3 className="font-display font-semibold text-base truncate group-hover:text-primary transition-colors">
                    {listing.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {listing.description || "No description"}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="font-display text-[10px] px-1.5 py-0">
                      Lv. {listing.level ?? "?"}
                    </Badge>
                    {listing.evo_guns && (listing.evo_guns as string[]).length > 0 && (
                      <Badge variant="outline" className="font-display text-[10px] px-1.5 py-0">
                        {(listing.evo_guns as string[]).length} Evo
                      </Badge>
                    )}
                    {listing.bundles && (listing.bundles as string[]).length > 0 && (
                      <Badge variant="outline" className="font-display text-[10px] px-1.5 py-0">
                        {(listing.bundles as string[]).length} Bundles
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count}</span>
                    <span>•</span>
                    <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

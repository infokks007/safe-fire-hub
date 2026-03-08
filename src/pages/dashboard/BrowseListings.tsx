import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, Search, Package } from "lucide-react";

export default function BrowseListings() {
  const [search, setSearch] = useState("");

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
        <p className="text-muted-foreground">Loading listings...</p>
      ) : !filtered?.length ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-4 text-lg">
            {search ? "No listings match your search" : "No listings available yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <Card
              key={listing.id}
              className="bg-card/80 border-border/50 hover:border-primary/30 hover:glow-flame transition-all cursor-pointer group"
            >
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between">
                  <Flame className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  <span className="font-display font-bold text-xl text-primary">
                    ${Number(listing.price).toFixed(2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg truncate">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {listing.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-display text-xs">
                    Lv. {listing.level ?? "?"}
                  </Badge>
                  {listing.evo_guns && (listing.evo_guns as string[]).length > 0 && (
                    <Badge variant="outline" className="font-display text-xs">
                      {(listing.evo_guns as string[]).length} Evo Guns
                    </Badge>
                  )}
                  {listing.bundles && (listing.bundles as string[]).length > 0 && (
                    <Badge variant="outline" className="font-display text-xs">
                      {(listing.bundles as string[]).length} Bundles
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {listing.views_count} views • {new Date(listing.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

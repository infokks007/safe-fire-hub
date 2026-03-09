import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, Search, Package, Star, Eye } from "lucide-react";
import { motion } from "framer-motion";
import ListingFilters, { defaultFilters, type FilterState } from "@/components/ListingFilters";

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function BrowseListings() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
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

  const filtered = useMemo(() => {
    if (!listings) return [];
    let result = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.description?.toLowerCase().includes(search.toLowerCase())
    );

    // Apply filters
    if (filters.rank !== "all") {
      result = result.filter((l) => (l as any).rank === filters.rank);
    }
    if (filters.priceMin > 0) {
      result = result.filter((l) => Number(l.price) >= filters.priceMin);
    }
    if (filters.priceMax < 10000) {
      result = result.filter((l) => Number(l.price) <= filters.priceMax);
    }
    if (filters.levelMin > 1) {
      result = result.filter((l) => (l.level ?? 0) >= filters.levelMin);
    }
    if (filters.levelMax < 100) {
      result = result.filter((l) => (l.level ?? 100) <= filters.levelMax);
    }
    if (filters.region !== "all") {
      result = result.filter((l) => (l as any).region === filters.region);
    }
    if (filters.elitePass === true) {
      result = result.filter((l) => (l as any).elite_pass === true);
    }

    // Sort
    switch (filters.sortBy) {
      case "price_asc":
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_desc":
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "popular":
        result.sort((a, b) => b.views_count - a.views_count);
        break;
      case "level_desc":
        result.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default: // newest
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [listings, search, filters]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <h1 className="text-3xl font-display font-bold">Browse Accounts</h1>
        <div className="flex items-center gap-3">
          <ListingFilters filters={filters} onChange={setFilters} activeCount={filtered.length} />
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50 h-10"
            />
          </div>
        </div>
      </motion.div>

      <div className="flex gap-6">
        {/* Desktop filters sidebar */}
        <ListingFilters filters={filters} onChange={setFilters} activeCount={filtered.length} />

        {/* Listings grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl glass glass-border animate-pulse">
                  <div className="aspect-[4/3] bg-muted/50 rounded-t-2xl" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted/50 rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !filtered?.length ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <Package className="h-20 w-20 mx-auto text-muted-foreground/20" />
              <p className="text-muted-foreground mt-4 text-lg">
                {search ? "No listings match your search" : "No listings available yet"}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((listing, i) => {
                const images = (listing.images as string[]) || [];
                const thumbnail = images[0];

                return (
                  <motion.div
                    key={listing.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    onClick={() => navigate(`/dashboard/listing/${listing.id}`)}
                    className="group rounded-2xl glass glass-border hover:border-primary/40 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
                      {thumbnail ? (
                        <img src={thumbnail} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Flame className="h-12 w-12 text-muted-foreground/15" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 glass glass-border rounded-lg px-3 py-1.5">
                        <span className="font-display font-bold text-lg text-primary">${Number(listing.price).toFixed(2)}</span>
                      </div>
                      {listing.is_featured && (
                        <div className="absolute top-3 left-3 bg-primary rounded-lg px-2.5 py-1 flex items-center gap-1">
                          <Star className="h-3 w-3 text-primary-foreground fill-current" />
                          <span className="text-xs font-display font-semibold text-primary-foreground">Featured</span>
                        </div>
                      )}
                      {(listing as any).rank && (
                        <div className="absolute bottom-2 right-2 glass rounded-md px-2 py-0.5 text-xs font-display font-semibold text-foreground">
                          {(listing as any).rank}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="p-4 space-y-2.5">
                      <h3 className="font-display font-semibold text-base truncate group-hover:text-primary transition-colors duration-300">
                        {listing.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {listing.description || "No description"}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="font-display text-[10px] px-2 py-0.5 rounded-md">
                          Lv. {listing.level ?? "?"}
                        </Badge>
                        {listing.evo_guns && (listing.evo_guns as string[]).length > 0 && (
                          <Badge variant="outline" className="font-display text-[10px] px-2 py-0.5 rounded-md">
                            {(listing.evo_guns as string[]).length} Evo
                          </Badge>
                        )}
                        {(listing as any).elite_pass && (
                          <Badge variant="outline" className="font-display text-[10px] px-2 py-0.5 rounded-md border-primary/50 text-primary">
                            Elite Pass
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.views_count}</span>
                        <span>•</span>
                        <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

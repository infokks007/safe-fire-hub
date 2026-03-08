import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flame, Search, Package, Star, Eye } from "lucide-react";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <h1 className="text-3xl font-display font-bold">Browse Accounts</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="pl-10 bg-secondary/50 border-border/50 focus:border-primary/50 h-10"
          />
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                {/* Image */}
                <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Flame className="h-12 w-12 text-muted-foreground/15" />
                    </div>
                  )}

                  {/* Price */}
                  <div className="absolute top-3 right-3 glass glass-border rounded-lg px-3 py-1.5">
                    <span className="font-display font-bold text-lg text-primary">
                      ${Number(listing.price).toFixed(2)}
                    </span>
                  </div>

                  {listing.is_featured && (
                    <div className="absolute top-3 left-3 bg-primary rounded-lg px-2.5 py-1 flex items-center gap-1">
                      <Star className="h-3 w-3 text-primary-foreground fill-current" />
                      <span className="text-xs font-display font-semibold text-primary-foreground">Featured</span>
                    </div>
                  )}

                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-2 glass rounded-md px-2 py-0.5 text-xs text-foreground">
                      📷 {images.length}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Info */}
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
                    {listing.bundles && (listing.bundles as string[]).length > 0 && (
                      <Badge variant="outline" className="font-display text-[10px] px-2 py-0.5 rounded-md">
                        {(listing.bundles as string[]).length} Bundles
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
  );
}

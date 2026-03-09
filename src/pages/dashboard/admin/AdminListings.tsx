import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Package,
  Trash2,
  Eye,
  Flag,
  CheckCircle,
  MoreVertical,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function AdminListings() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin-all-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: flagged } = useQuery({
    queryKey: ["admin-flagged"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flagged_listings")
        .select("*, listings(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-listings"] });
      toast.success("Listing removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolveFlagMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "removed" }) => {
      const { error } = await supabase
        .from("flagged_listings")
        .update({ status: action, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged"] });
      toast.success("Flag resolved");
    },
  });

  const filtered = listings?.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.id.includes(search)
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-display font-bold">Listing Management</h1>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="pl-10 bg-secondary/50 border-border/50 h-10"
          />
        </div>
      </motion.div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="glass glass-border">
          <TabsTrigger value="all" className="font-display">
            All Listings ({listings?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="flagged" className="font-display">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Flagged ({flagged?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl glass glass-border animate-pulse" />
            ))
          ) : (
            filtered?.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="bg-card/80 border-border/50 hover:border-border transition-colors">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold truncate">{listing.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            Seller: {listing.seller_id.slice(0, 8)}... • {new Date(listing.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-display font-bold text-primary">
                          ${Number(listing.price).toFixed(2)}
                        </span>
                        <Badge
                          variant={listing.status === "active" ? "default" : "secondary"}
                          className="font-display capitalize text-xs"
                        >
                          {listing.status}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" /> {listing.views_count}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/dashboard/listing/${listing.id}`, "_blank")}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(listing.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="flagged" className="space-y-3">
          {!flagged?.length ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/30" />
              <p className="text-muted-foreground mt-3">No flagged listings 🎉</p>
            </div>
          ) : (
            flagged.map((flag: any, i: number) => (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-card/80 border-destructive/30 hover:border-destructive/50 transition-colors">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-destructive shrink-0" />
                          <h3 className="font-display font-semibold truncate">
                            {flag.listings?.title || "Unknown Listing"}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {flag.reason} • Confidence: {Number(flag.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-display text-xs"
                          onClick={() => resolveFlagMutation.mutate({ id: flag.id, action: "approved" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="font-display text-xs"
                          onClick={() => {
                            if (flag.listing_id) deleteMutation.mutate(flag.listing_id);
                            resolveFlagMutation.mutate({ id: flag.id, action: "removed" });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

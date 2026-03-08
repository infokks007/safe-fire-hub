import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Flame, Trash2, Edit, Package } from "lucide-react";

export default function SellerListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Listing deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">My Listings</h1>
        <Button onClick={() => navigate("/dashboard/listings/new")} className="font-display glow-flame gap-2">
          <Plus className="h-4 w-4" /> New Listing
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !listings?.length ? (
        <Card className="bg-card/80 border-border/50">
          <CardContent className="py-12 text-center space-y-3">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground text-lg">You haven't created any listings yet</p>
            <Button onClick={() => navigate("/dashboard/listings/new")} className="font-display">
              Create your first listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="bg-card/80 border-border/50 hover:border-border transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <Flame className="h-6 w-6 text-primary shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-lg truncate">{listing.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Level {listing.level ?? "?"}</span>
                        <span>•</span>
                        <span>{listing.views_count} views</span>
                        <span>•</span>
                        <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-display font-bold text-xl text-primary">
                      ${Number(listing.price).toFixed(2)}
                    </span>
                    <Badge
                      variant={listing.status === "active" ? "default" : "secondary"}
                      className="font-display capitalize"
                    >
                      {listing.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(listing.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

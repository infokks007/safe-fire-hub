import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Flame } from "lucide-react";

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, listings(title, price, images)")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Fetch other user profiles
      const otherIds = data.map((c: any) =>
        c.buyer_id === user!.id ? c.seller_id : c.buyer_id
      );
      const uniqueIds = [...new Set(otherIds)];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", uniqueIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p.display_name])
      );

      return data.map((c: any) => ({
        ...c,
        otherName: profileMap.get(
          c.buyer_id === user!.id ? c.seller_id : c.buyer_id
        ) || "Unknown",
      }));
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Flame className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Messages</h1>

      {!conversations?.length ? (
        <div className="text-center py-16">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground mt-4 text-lg">No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv: any) => {
            const listing = conv.listings as any;
            return (
              <Card
                key={conv.id}
                onClick={() => navigate(`/dashboard/chat/${conv.id}`)}
                className="bg-card/80 border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold truncate">{conv.otherName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {listing?.title} — ${Number(listing?.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

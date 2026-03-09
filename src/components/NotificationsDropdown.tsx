import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  CheckCircle,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Package,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, any> = {
  order_update: Package,
  deposit_approved: CheckCircle,
  deposit_rejected: AlertTriangle,
  dispute_update: AlertTriangle,
  new_message: MessageSquare,
  system: Info,
  payment: DollarSign,
};

const typeColors: Record<string, string> = {
  order_update: "text-blue-400",
  deposit_approved: "text-green-400",
  deposit_rejected: "text-destructive",
  dispute_update: "text-amber-400",
  new_message: "text-primary",
  system: "text-muted-foreground",
  payment: "text-emerald-400",
};

export function NotificationsDropdown() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true } as any)
        .eq("user_id", user?.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5"
              >
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 px-1.5 text-[10px] font-display flex items-center justify-center"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-display font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 font-display"
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {!notifications?.length ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mt-3">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif: any) => {
                const Icon = typeIcons[notif.type] || Info;
                const iconColor = typeColors[notif.type] || "text-muted-foreground";

                return (
                  <div
                    key={notif.id}
                    className={`p-3 hover:bg-secondary/50 transition-colors ${
                      !notif.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`shrink-0 mt-0.5 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

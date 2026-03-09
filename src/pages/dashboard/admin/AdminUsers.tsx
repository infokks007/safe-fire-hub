import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Users, ShieldCheck, Ban, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getRoleForUser = (userId: string) => {
    return roles?.find((r) => r.user_id === userId)?.role ?? "unknown";
  };

  const filtered = profiles?.filter(
    (p) =>
      p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.includes(search)
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-display font-bold">User Management</h1>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-10 bg-secondary/50 border-border/50 h-10"
          />
        </div>
      </motion.div>

      <div className="grid gap-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl glass glass-border animate-pulse" />
          ))
        ) : !filtered?.length ? (
          <p className="text-muted-foreground text-center py-12">No users found</p>
        ) : (
          filtered.map((profile, i) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="bg-card/80 border-border/50 hover:border-border transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm font-display">
                          {profile.display_name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold">{profile.display_name || "Unknown"}</span>
                          {profile.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{profile.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-display capitalize text-xs">
                        {getRoleForUser(profile.user_id)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info("View profile coming soon")}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toast.info("Ban feature coming soon")}
                            className="text-destructive"
                          >
                            <Ban className="h-4 w-4 mr-2" /> Ban User
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
      </div>
    </div>
  );
}

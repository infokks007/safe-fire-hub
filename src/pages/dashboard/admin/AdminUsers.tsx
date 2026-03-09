import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Search,
  Users,
  ShieldCheck,
  Ban,
  MoreVertical,
  UserCheck,
  Unlock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [banDialog, setBanDialog] = useState<{ open: boolean; profile: any | null }>({ open: false, profile: null });
  const [banReason, setBanReason] = useState("");
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
    return roles?.find((r: any) => r.user_id === userId)?.role ?? "unknown";
  };

  // Ban user
  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: true, ban_reason: reason } as any)
        .eq("user_id", userId);
      if (error) throw error;

      // Notify user
      await supabase.rpc("create_notification", {
        _user_id: userId,
        _type: "system",
        _title: "Account Suspended",
        _message: `Your account has been suspended. Reason: ${reason}`,
        _reference_id: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setBanDialog({ open: false, profile: null });
      setBanReason("");
      toast.success("User banned successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Unban user
  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: false, ban_reason: null } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unbanned");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Verify user
  const verifyMutation = useMutation({
    mutationFn: async ({ userId, verify }: { userId: string; verify: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: verify } as any)
        .eq("user_id", userId);
      if (error) throw error;

      if (verify) {
        await supabase.rpc("create_notification", {
          _user_id: userId,
          _type: "system",
          _title: "Account Verified ✓",
          _message: "Congratulations! Your seller account has been verified by admin.",
          _reference_id: null,
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(vars.verify ? "User verified!" : "Verification removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = profiles?.filter(
    (p: any) =>
      p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.includes(search)
  );

  const bannedCount = profiles?.filter((p: any) => p.is_banned).length ?? 0;
  const verifiedCount = profiles?.filter((p: any) => p.is_verified).length ?? 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold">User Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {profiles?.length ?? 0} total · {verifiedCount} verified · {bannedCount} banned
            </p>
          </div>
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
          filtered.map((profile: any, i: number) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className={`bg-card/80 border-border/50 hover:border-border transition-colors ${
                  profile.is_banned ? "border-destructive/30 opacity-70" : ""
                }`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm font-display">
                          {profile.display_name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold truncate">
                            {profile.display_name || "Unknown"}
                          </span>
                          {profile.is_verified && (
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                          )}
                          {profile.is_banned && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              BANNED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {profile.user_id.slice(0, 12)}...
                        </p>
                        {profile.is_banned && profile.ban_reason && (
                          <p className="text-xs text-destructive mt-0.5">
                            Reason: {profile.ban_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="font-display capitalize text-xs">
                        {getRoleForUser(profile.user_id)}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!profile.is_verified ? (
                            <DropdownMenuItem
                              onClick={() =>
                                verifyMutation.mutate({ userId: profile.user_id, verify: true })
                              }
                            >
                              <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                              Verify User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                verifyMutation.mutate({ userId: profile.user_id, verify: false })
                              }
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Remove Verification
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!profile.is_banned ? (
                            <DropdownMenuItem
                              onClick={() => setBanDialog({ open: true, profile })}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" /> Ban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => unbanMutation.mutate(profile.user_id)}
                            >
                              <Unlock className="h-4 w-4 mr-2" /> Unban User
                            </DropdownMenuItem>
                          )}
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

      {/* Ban Dialog */}
      <Dialog
        open={banDialog.open}
        onOpenChange={(o) => setBanDialog({ open: o, profile: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Ban User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to ban{" "}
              <strong>{banDialog.profile?.display_name}</strong>. This will
              suspend their account.
            </p>
            <div className="space-y-2">
              <Label>Reason for ban</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Explain why this user is being banned..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBanDialog({ open: false, profile: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                banMutation.mutate({
                  userId: banDialog.profile?.user_id,
                  reason: banReason,
                })
              }
              disabled={!banReason.trim() || banMutation.isPending}
            >
              <Ban className="h-4 w-4 mr-2" />
              {banMutation.isPending ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

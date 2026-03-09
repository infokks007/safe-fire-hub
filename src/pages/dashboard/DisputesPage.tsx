import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle, Upload, Clock, CheckCircle, Search, Eye } from "lucide-react";
import { motion } from "framer-motion";

const REASONS = [
  { value: "wrong_details", label: "Wrong Account Details" },
  { value: "account_recovered", label: "Seller Recovered Account" },
  { value: "login_failure", label: "Cannot Login to Account" },
  { value: "other", label: "Other Issue" },
];

export default function DisputesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [listingId, setListingId] = useState("");

  const { data: disputes, isLoading } = useQuery({
    queryKey: ["my-disputes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("reporter_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: conversations } = useQuery({
    queryKey: ["my-conversations-for-dispute", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, listing_id, listings(title)")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!reason || !conversationId) throw new Error("Please fill all required fields");
      const conv = conversations?.find((c: any) => c.id === conversationId);
      const { error } = await supabase.from("disputes").insert({
        conversation_id: conversationId,
        listing_id: conv?.listing_id || listingId,
        reporter_id: user!.id,
        reason,
        description: description || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-disputes"] });
      toast.success("Dispute submitted! Admin will review it.");
      setShowCreate(false);
      setReason("");
      setDescription("");
      setConversationId("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "investigating": return "default";
      case "resolved": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-primary" /> Buyer Protection
        </h1>
        <Button onClick={() => setShowCreate(!showCreate)} className="font-display glow-flame gap-2">
          <AlertTriangle className="h-4 w-4" /> Report Issue
        </Button>
      </motion.div>

      {/* Create Dispute */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card/80 border-destructive/30">
            <CardHeader>
              <CardTitle className="font-display text-lg">Report a Problem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Conversation *</Label>
                <Select value={conversationId} onValueChange={setConversationId}>
                  <SelectTrigger><SelectValue placeholder="Select a conversation" /></SelectTrigger>
                  <SelectContent>
                    {conversations?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.listings?.title || c.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Type *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="What went wrong?" /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened in detail..."
                  rows={4}
                />
              </div>

              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full font-display"
                variant="destructive"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Dispute"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dispute List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl glass glass-border animate-pulse" />)
        ) : !disputes?.length ? (
          <Card className="bg-card/80 border-border/50">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/30" />
              <p className="text-muted-foreground mt-3">No disputes — everything looks good!</p>
            </CardContent>
          </Card>
        ) : (
          disputes.map((dispute: any, i: number) => (
            <motion.div
              key={dispute.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card/80 border-border/50 hover:border-border transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="font-display font-semibold capitalize">
                          {dispute.reason.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {dispute.description || "No description"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor(dispute.status) as any} className="font-display capitalize text-xs">
                        {dispute.status}
                      </Badge>
                    </div>
                  </div>
                  {dispute.resolution && (
                    <div className="mt-3 glass glass-border rounded-lg p-3">
                      <p className="text-xs font-display font-semibold">Admin Resolution:</p>
                      <p className="text-xs text-muted-foreground mt-1">{dispute.resolution}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

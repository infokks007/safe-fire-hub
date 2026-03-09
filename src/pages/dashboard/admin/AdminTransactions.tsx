import { useState } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Wallet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Newspaper,
  Plus,
  Flag,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminTransactions() {
  const queryClient = useQueryClient();

  // Pending deposits
  const { data: pendingDeposits } = useQuery({
    queryKey: ["admin-pending-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("status", "pending")
        .eq("type", "deposit")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Pending withdrawals
  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["admin-pending-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("status", "pending")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allTransactions } = useQuery({
    queryKey: ["admin-all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Disputes
  const { data: disputes } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Approve deposit
  const approveMutation = useMutation({
    mutationFn: async (txn: any) => {
      const { error: txnErr } = await supabase
        .from("wallet_transactions")
        .update({ status: "completed", resolved_at: new Date().toISOString() } as any)
        .eq("id", txn.id);
      if (txnErr) throw txnErr;

      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", txn.user_id)
        .single();
      if (wallet) {
        const { error: walletErr } = await supabase
          .from("wallets")
          .update({ balance: Number(wallet.balance) + Number(txn.amount) } as any)
          .eq("user_id", txn.user_id);
        if (walletErr) throw walletErr;
      }

      await supabase.rpc("create_notification", {
        _user_id: txn.user_id,
        _type: "payment",
        _title: "Deposit Approved!",
        _message: `₹${Number(txn.amount).toFixed(2)} has been credited to your wallet.`,
        _reference_id: txn.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-transactions"] });
      toast.success("Deposit approved and wallet credited!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (txn: any) => {
      const { error } = await supabase
        .from("wallet_transactions")
        .update({ status: "rejected", resolved_at: new Date().toISOString() } as any)
        .eq("id", txn.id);
      if (error) throw error;

      await supabase.rpc("create_notification", {
        _user_id: txn.user_id,
        _type: "payment",
        _title: "Deposit Rejected",
        _message: `Your deposit of ₹${Number(txn.amount).toFixed(2)} was rejected. Please check your UPI transaction ID.`,
        _reference_id: txn.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] });
      toast.success("Deposit rejected");
    },
  });

  // Process withdrawal
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ txn, status }: { txn: any; status: string }) => {
      const { error } = await supabase.rpc("process_withdrawal", {
        _transaction_id: txn.id,
        _status: status,
        _admin_notes: status === "completed" ? "Payment sent via UPI" : "Withdrawal rejected",
      });
      if (error) throw error;

      await supabase.rpc("create_notification", {
        _user_id: txn.user_id,
        _type: "payment",
        _title: status === "completed" ? "Withdrawal Processed!" : "Withdrawal Rejected",
        _message: status === "completed"
          ? `₹${Number(txn.amount).toFixed(2)} has been sent to your UPI: ${txn.upi_transaction_id}`
          : `Your withdrawal of ₹${Number(txn.amount).toFixed(2)} was rejected. Funds have been refunded to your wallet.`,
        _reference_id: txn.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-transactions"] });
      toast.success("Withdrawal processed!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Disputes
  const [disputeResolution, setDisputeResolution] = useState<Record<string, string>>({});
  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("disputes")
        .update({
          status,
          resolution: disputeResolution[id] || null,
          resolved_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast.success("Dispute updated");
    },
  });

  // News
  const { data: articles } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newArticle, setNewArticle] = useState({ title: "", content: "", category: "news", slug: "" });
  const createArticleMutation = useMutation({
    mutationFn: async () => {
      const slug = newArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("news_articles").insert({
        title: newArticle.title,
        content: newArticle.content,
        category: newArticle.category,
        slug,
        published: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      toast.success("Article published!");
      setNewArticle({ title: "", content: "", category: "news", slug: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openDisputes = disputes?.filter((d: any) => d.status === "open" || d.status === "investigating") || [];
  const depositCount = pendingDeposits?.length ?? 0;
  const withdrawalCount = pendingWithdrawals?.length ?? 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <DollarSign className="h-7 w-7 text-primary" /> Admin Operations
        </h1>
      </motion.div>

      <Tabs defaultValue="deposits" className="space-y-4">
        <TabsList className="glass glass-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="deposits" className="font-display text-xs">
            <Wallet className="h-3 w-3 mr-1" /> Deposits ({depositCount})
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="font-display text-xs">
            <ArrowUpRight className="h-3 w-3 mr-1" /> Withdrawals ({withdrawalCount})
          </TabsTrigger>
          <TabsTrigger value="disputes" className="font-display text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" /> Disputes ({openDisputes.length})
          </TabsTrigger>
          <TabsTrigger value="news" className="font-display text-xs">
            <Newspaper className="h-3 w-3 mr-1" /> News
          </TabsTrigger>
          <TabsTrigger value="history" className="font-display text-xs">
            <Clock className="h-3 w-3 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        {/* Deposits */}
        <TabsContent value="deposits" className="space-y-3">
          {!pendingDeposits?.length ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/30" />
              <p className="text-muted-foreground mt-3">No pending deposits</p>
            </div>
          ) : (
            pendingDeposits.map((txn: any, i: number) => (
              <motion.div key={txn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/80 border-amber-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="font-display font-semibold">Deposit Request</span>
                          <Badge variant="secondary" className="text-[10px]">₹{Number(txn.amount).toFixed(2)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          User: {txn.user_id.slice(0, 8)}... • UPI TxnID: <code className="text-primary">{txn.upi_transaction_id}</code>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="font-display text-xs" onClick={() => approveMutation.mutate(txn)} disabled={approveMutation.isPending}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="font-display text-xs" onClick={() => rejectMutation.mutate(txn)}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Withdrawals */}
        <TabsContent value="withdrawals" className="space-y-3">
          {!pendingWithdrawals?.length ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/30" />
              <p className="text-muted-foreground mt-3">No pending withdrawals</p>
            </div>
          ) : (
            pendingWithdrawals.map((txn: any, i: number) => (
              <motion.div key={txn.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/80 border-primary/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                          <span className="font-display font-semibold">Withdrawal Request</span>
                          <Badge variant="secondary" className="text-[10px]">₹{Number(txn.amount).toFixed(2)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          User: {txn.user_id.slice(0, 8)}... • UPI ID: <code className="text-primary">{txn.upi_transaction_id}</code>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(txn.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="font-display text-xs"
                          onClick={() => processWithdrawalMutation.mutate({ txn, status: "completed" })}
                          disabled={processWithdrawalMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="font-display text-xs"
                          onClick={() => processWithdrawalMutation.mutate({ txn, status: "rejected" })}
                          disabled={processWithdrawalMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Disputes */}
        <TabsContent value="disputes" className="space-y-3">
          {!disputes?.length ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500/30" />
              <p className="text-muted-foreground mt-3">No disputes</p>
            </div>
          ) : (
            disputes.map((dispute: any, i: number) => (
              <motion.div key={dispute.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`bg-card/80 ${dispute.status === "open" ? "border-destructive/30" : "border-border/50"}`}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-destructive" />
                          <span className="font-display font-semibold capitalize">{dispute.reason.replace("_", " ")}</span>
                          <Badge variant={dispute.status === "open" ? "destructive" : "secondary"} className="text-[10px] capitalize">{dispute.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{dispute.description || "No description"}</p>
                        <p className="text-[10px] text-muted-foreground">Reporter: {dispute.reporter_id.slice(0, 8)}... • {new Date(dispute.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    {(dispute.status === "open" || dispute.status === "investigating") && (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            placeholder="Resolution notes..."
                            value={disputeResolution[dispute.id] || ""}
                            onChange={(e) => setDisputeResolution((p) => ({ ...p, [dispute.id]: e.target.value }))}
                            className="text-sm h-9"
                          />
                        </div>
                        <Button size="sm" className="font-display text-xs" onClick={() => resolveDisputeMutation.mutate({ id: dispute.id, status: "resolved" })}>
                          Resolve
                        </Button>
                        <Button size="sm" variant="outline" className="font-display text-xs" onClick={() => resolveDisputeMutation.mutate({ id: dispute.id, status: "dismissed" })}>
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* News */}
        <TabsContent value="news" className="space-y-4">
          <Card className="bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Article
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={newArticle.title} onChange={(e) => setNewArticle((p) => ({ ...p, title: e.target.value }))} placeholder="Article title..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newArticle.category} onValueChange={(v) => setNewArticle((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="patch">Patch Update</SelectItem>
                    <SelectItem value="skins">New Skins</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="tournaments">Tournaments</SelectItem>
                    <SelectItem value="guides">Guides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={newArticle.content} onChange={(e) => setNewArticle((p) => ({ ...p, content: e.target.value }))} placeholder="Write your article..." rows={8} />
              </div>
              <Button onClick={() => createArticleMutation.mutate()} disabled={createArticleMutation.isPending || !newArticle.title || !newArticle.content} className="font-display glow-flame">
                {createArticleMutation.isPending ? "Publishing..." : "Publish Article"}
              </Button>
            </CardContent>
          </Card>

          {articles?.map((article: any) => (
            <Card key={article.id} className="bg-card/80 border-border/50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display font-semibold">{article.title}</span>
                    <p className="text-xs text-muted-foreground">{article.category} • {new Date(article.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={article.published ? "default" : "secondary"} className="text-[10px]">
                    {article.published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-2">
          {allTransactions?.map((txn: any, i: number) => (
            <motion.div key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
              <Card className="bg-card/80 border-border/50">
                <CardContent className="py-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{txn.type}</Badge>
                      <span className="font-mono text-xs">{txn.user_id.slice(0, 8)}...</span>
                      {txn.upi_transaction_id && <span className="text-[10px] text-muted-foreground">UPI: {txn.upi_transaction_id}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold">₹{Number(txn.amount).toFixed(2)}</span>
                      <Badge variant={txn.status === "completed" ? "default" : txn.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                        {txn.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

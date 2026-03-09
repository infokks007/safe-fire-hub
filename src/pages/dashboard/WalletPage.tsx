import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, Copy, IndianRupee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import WithdrawSection from "@/components/wallet/WithdrawSection";

const UPI_ID = "6200450674";

export default function WalletPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [depositAmount, setDepositAmount] = useState("");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error && error.code === "PGRST116") {
        const { data: newWallet, error: insertErr } = await supabase
          .from("wallets")
          .insert({ user_id: user!.id } as any)
          .select()
          .single();
        if (insertErr) throw insertErr;
        return newWallet;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      if (!depositAmount || !upiTxnId) throw new Error("Please fill all fields");
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user!.id,
        type: "deposit",
        amount: parseFloat(depositAmount),
        upi_transaction_id: upiTxnId,
        status: "pending",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast.success("Deposit request submitted! Admin will verify your payment.");
      setDepositAmount("");
      setUpiTxnId("");
      setShowDeposit(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success("UPI ID copied!");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const typeIcon = (type: string) => {
    if (["deposit", "sale", "escrow_release"].includes(type)) return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  };

  const balance = Number(wallet?.balance ?? 0);
  const escrowBalance = Number(wallet?.escrow_balance ?? 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" /> My Wallet
        </h1>
      </motion.div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass glass-border">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-wider">Available Balance</p>
              <p className="text-3xl font-display font-bold text-primary mt-1">
                ₹{balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass glass-border">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-wider">Escrow Balance</p>
              <p className="text-3xl font-display font-bold text-amber-400 mt-1">
                ₹{escrowBalance.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Funds */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader className="cursor-pointer" onClick={() => setShowDeposit(!showDeposit)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-lg">Add Funds via UPI</CardTitle>
            </div>
            <Button variant="outline" size="sm" className="font-display">
              {showDeposit ? "Close" : "Deposit"}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {showDeposit && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-4 pt-0">
                <div className="glass glass-border rounded-xl p-4 space-y-3">
                  <p className="text-sm font-display font-semibold">Step 1: Send payment to this UPI ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono text-primary bg-primary/10 px-3 py-1.5 rounded-lg flex-1">
                      {UPI_ID}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyUPI} className="shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send the exact amount via any UPI app (GPay, PhonePe, Paytm, etc.)
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-display font-semibold">Step 2: Enter payment details</p>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="txnId">UPI Transaction ID</Label>
                    <Input
                      id="txnId"
                      value={upiTxnId}
                      onChange={(e) => setUpiTxnId(e.target.value)}
                      placeholder="Enter your UPI transaction reference"
                    />
                  </div>
                  <Button
                    onClick={() => depositMutation.mutate()}
                    disabled={depositMutation.isPending || !depositAmount || !upiTxnId}
                    className="w-full font-display glow-flame"
                  >
                    {depositMutation.isPending ? "Submitting..." : "Submit Deposit Request"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Admin will verify your payment and credit your wallet within 24 hours
                  </p>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Withdraw Funds */}
      <WithdrawSection balance={balance} />

      {/* Transaction History */}
      <Card className="bg-card/80 border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions?.length ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn: any, i: number) => (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {typeIcon(txn.type)}
                    <div>
                      <p className="text-sm font-display font-medium capitalize">{txn.type.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(txn.created_at).toLocaleString()}
                        {txn.upi_transaction_id && ` • UPI: ${txn.upi_transaction_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-display font-bold ${["deposit", "sale", "escrow_release"].includes(txn.type) ? "text-green-500" : "text-destructive"}`}>
                      {["deposit", "sale", "escrow_release"].includes(txn.type) ? "+" : "-"}₹{Number(txn.amount).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1">
                      {statusIcon(txn.status)}
                      <Badge variant="secondary" className="text-[10px] capitalize">{txn.status}</Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

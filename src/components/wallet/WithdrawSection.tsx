import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WithdrawSectionProps {
  balance: number;
}

export default function WithdrawSection({ balance }: WithdrawSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpi, setWithdrawUpi] = useState("");

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(withdrawAmount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      if (!withdrawUpi.trim()) throw new Error("Enter your UPI ID");
      if (amount > balance) throw new Error("Insufficient balance");

      const { error } = await supabase.rpc("request_withdrawal", {
        _user_id: user!.id,
        _amount: amount,
        _upi_id: withdrawUpi.trim(),
      });
      if (error) throw error;

      // Notify admin about withdrawal request
      await supabase.rpc("create_notification", {
        _user_id: user!.id, // We'll also want admin notified - handled via admin query
        _type: "withdrawal",
        _title: "Withdrawal Requested",
        _message: `You requested a withdrawal of ₹${amount.toFixed(2)} to UPI: ${withdrawUpi.trim()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast.success("Withdrawal request submitted! Your funds will be sent within 24 hours.");
      setWithdrawAmount("");
      setWithdrawUpi("");
      setShowWithdraw(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="cursor-pointer" onClick={() => setShowWithdraw(!showWithdraw)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-destructive" />
            <CardTitle className="font-display text-lg">Withdraw Funds</CardTitle>
          </div>
          <Button variant="outline" size="sm" className="font-display">
            {showWithdraw ? "Close" : "Cashout"}
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="space-y-4 pt-0">
              <div className="glass glass-border rounded-xl p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Available for withdrawal: <span className="text-primary font-bold">₹{balance.toFixed(2)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Funds will be sent to your UPI ID within 24 hours after admin approval.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="withdrawAmount">Amount (₹)</Label>
                  <Input
                    id="withdrawAmount"
                    type="number"
                    min="1"
                    max={balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount to withdraw"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdrawUpi">Your UPI ID</Label>
                  <Input
                    id="withdrawUpi"
                    value={withdrawUpi}
                    onChange={(e) => setWithdrawUpi(e.target.value)}
                    placeholder="e.g. yourname@paytm"
                  />
                </div>
                <Button
                  onClick={() => withdrawMutation.mutate()}
                  disabled={withdrawMutation.isPending || !withdrawAmount || !withdrawUpi || parseFloat(withdrawAmount) > balance}
                  variant="destructive"
                  className="w-full font-display"
                >
                  {withdrawMutation.isPending ? "Submitting..." : "Request Withdrawal"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Admin will process your withdrawal and send funds to your UPI within 24 hours
                </p>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

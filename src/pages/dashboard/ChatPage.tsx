import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, listings(title, price)")
        .eq("id", conversationId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const { data: otherProfile } = useQuery({
    queryKey: ["chat-profile", conversation],
    queryFn: async () => {
      const otherId = conversation!.buyer_id === user!.id
        ? conversation!.seller_id
        : conversation!.buyer_id;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, is_verified")
        .eq("user_id", otherId)
        .single();
      if (error) throw error;
      return { ...data, user_id: otherId };
    },
    enabled: !!conversation && !!user,
  });

  // Check if buyer can vouch (conversation > 2 days old, buyer hasn't vouched yet)
  const isBuyer = conversation?.buyer_id === user?.id;
  const sellerId = conversation?.seller_id;

  const { data: canVouch } = useQuery({
    queryKey: ["can-vouch", conversationId, user?.id],
    queryFn: async () => {
      const created = new Date(conversation!.created_at);
      const now = new Date();
      const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 2) return false;

      const { data } = await supabase
        .from("seller_vouches")
        .select("id")
        .eq("seller_id", sellerId!)
        .eq("voucher_id", user!.id)
        .maybeSingle();
      return !data; // can vouch if no existing vouch
    },
    enabled: !!conversation && !!user && isBuyer && !!sellerId,
  });

  const { data: vouchCount = 0 } = useQuery({
    queryKey: ["vouch-count", sellerId],
    queryFn: async () => {
      const { count } = await supabase
        .from("seller_vouches")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId!);
      return count || 0;
    },
    enabled: !!sellerId,
  });

  const [showVouchBanner, setShowVouchBanner] = useState(true);

  const vouchMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("seller_vouches").insert({
        seller_id: sellerId!,
        voucher_id: user!.id,
        conversation_id: conversationId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for verifying this seller!");
      setShowVouchBanner(false);
      queryClient.invalidateQueries({ queryKey: ["can-vouch"] });
      queryClient.invalidateQueries({ queryKey: ["vouch-count"] });
    },
    onError: () => toast.error("Already vouched or an error occurred"),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId!,
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const listingInfo = conversation?.listings as any;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/chat")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold truncate flex items-center gap-2">
            {otherProfile?.display_name || "Chat"}
            {otherProfile?.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </p>
          {listingInfo && (
            <p className="text-xs text-muted-foreground truncate">
              {listingInfo.title} — ${Number(listingInfo.price).toFixed(2)}
            </p>
          )}
        </div>
        {sellerId && (
          <span className="text-xs text-muted-foreground font-display">
            {vouchCount}/10 vouches
          </span>
        )}
      </div>

      {/* Vouch Banner */}
      <AnimatePresence>
        {isBuyer && canVouch && showVouchBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 my-2 rounded-xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm flex-1">
                Had a good experience? <strong>Verify this seller</strong> to help build trust.
              </p>
              <Button
                size="sm"
                onClick={() => vouchMutation.mutate()}
                disabled={vouchMutation.isPending}
                className="shrink-0 gap-1 font-display"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verify
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setShowVouchBanner(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-border/50">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={sendMutation.isPending || !message.trim()} size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

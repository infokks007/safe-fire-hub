import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  listingId: string;
  sellerId: string;
  onSuccess?: () => void;
}

export default function ReviewForm({ listingId, sellerId, onSuccess }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [deliverySpeed, setDeliverySpeed] = useState(0);
  const [accountAccuracy, setAccountAccuracy] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!rating) throw new Error("Please select a rating");
      const { error } = await supabase.from("reviews").insert({
        listing_id: listingId,
        seller_id: sellerId,
        buyer_id: user!.id,
        rating,
        delivery_speed: deliverySpeed || null,
        account_accuracy: accountAccuracy || null,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted!");
      onSuccess?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const StarRating = ({ value, onChange, label, hovered, onHover }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
    hovered?: number;
    onHover?: (v: number) => void;
  }) => (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground font-display">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer transition-colors ${
              star <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
            }`}
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(0)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass glass-border rounded-xl p-4 space-y-4"
    >
      <h4 className="font-display font-semibold text-sm">Leave a Review</h4>

      <StarRating
        value={rating}
        onChange={setRating}
        label="Overall Rating *"
        hovered={hoveredStar}
        onHover={setHoveredStar}
      />
      <div className="grid grid-cols-2 gap-4">
        <StarRating value={deliverySpeed} onChange={setDeliverySpeed} label="Delivery Speed" />
        <StarRating value={accountAccuracy} onChange={setAccountAccuracy} label="Account Accuracy" />
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience..."
        rows={3}
        className="text-sm"
      />

      <Button
        onClick={() => submitMutation.mutate()}
        disabled={submitMutation.isPending || !rating}
        className="w-full font-display text-sm"
        size="sm"
      >
        {submitMutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </motion.div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  sellerId: string;
  listingId?: string;
}

export default function ReviewsList({ sellerId, listingId }: Props) {
  const { data: reviews } = useQuery({
    queryKey: ["reviews", sellerId, listingId],
    queryFn: async () => {
      let query = supabase.from("reviews").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false });
      if (listingId) query = query.eq("listing_id", listingId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: ratingData } = useQuery({
    queryKey: ["seller-rating", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_seller_rating", { _seller_id: sellerId });
      if (error) throw error;
      return data?.[0] || { avg_rating: 0, total_reviews: 0, total_sales: 0 };
    },
  });

  if (!reviews?.length && !ratingData) return null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {ratingData && Number(ratingData.total_reviews) > 0 && (
        <div className="flex items-center gap-4 glass glass-border rounded-xl p-4">
          <div className="text-center">
            <span className="text-3xl font-display font-bold text-primary">{Number(ratingData.avg_rating).toFixed(1)}</span>
            <div className="flex gap-0.5 mt-1 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= Math.round(Number(ratingData.avg_rating)) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{ratingData.total_reviews} review{Number(ratingData.total_reviews) !== 1 ? "s" : ""}</p>
            <p>{ratingData.total_sales} sale{Number(ratingData.total_sales) !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {/* Individual reviews */}
      {reviews?.map((review, i) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass glass-border rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
          </div>
          {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
          <div className="flex gap-4 text-[10px] text-muted-foreground">
            {review.delivery_speed && <span>Delivery: {"⭐".repeat(review.delivery_speed)}</span>}
            {review.account_accuracy && <span>Accuracy: {"⭐".repeat(review.account_accuracy)}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

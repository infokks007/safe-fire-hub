
-- Add new columns for advanced filtering
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rank text DEFAULT null;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS elite_pass boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS region text DEFAULT null;

-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  delivery_speed integer CHECK (delivery_speed >= 1 AND delivery_speed <= 5),
  account_accuracy integer CHECK (account_accuracy >= 1 AND account_accuracy <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, buyer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- Create flagged_listings table for AI scam detection
CREATE TABLE public.flagged_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  confidence numeric,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.flagged_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view flagged listings" ON public.flagged_listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update flagged listings" ON public.flagged_listings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert flags" ON public.flagged_listings FOR INSERT TO authenticated WITH CHECK (true);

-- Function to get seller average rating
CREATE OR REPLACE FUNCTION public.get_seller_rating(_seller_id uuid)
RETURNS TABLE(avg_rating numeric, total_reviews bigint, total_sales bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    COALESCE(AVG(rating)::numeric(3,2), 0) as avg_rating,
    COUNT(*) as total_reviews,
    COUNT(*) as total_sales
  FROM public.reviews
  WHERE seller_id = _seller_id
$$;

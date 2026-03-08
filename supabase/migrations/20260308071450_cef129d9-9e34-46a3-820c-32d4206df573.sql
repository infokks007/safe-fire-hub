
-- Listings table
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  freefire_uid text,
  level integer,
  evo_guns text[] DEFAULT '{}',
  gun_skins text[] DEFAULT '{}',
  bundles text[] DEFAULT '{}',
  characters text[] DEFAULT '{}',
  images text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'suspended')),
  is_featured boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Update trigger
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active listings
CREATE POLICY "Active listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid());

-- Sellers can insert their own listings
CREATE POLICY "Sellers can insert own listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid() AND public.has_role(auth.uid(), 'seller'));

-- Sellers can update their own listings
CREATE POLICY "Sellers can update own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Sellers can delete their own listings
CREATE POLICY "Sellers can delete own listings"
  ON public.listings FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());

-- Admins can do everything
CREATE POLICY "Admins can manage all listings"
  ON public.listings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for listings
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;

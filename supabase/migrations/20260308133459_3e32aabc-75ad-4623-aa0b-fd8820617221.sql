
-- Table to track buyer vouches for sellers
CREATE TABLE public.seller_vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  voucher_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, voucher_id)
);

ALTER TABLE public.seller_vouches ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see vouches
CREATE POLICY "Anyone can view vouches"
  ON public.seller_vouches FOR SELECT
  TO authenticated
  USING (true);

-- Buyers can vouch (insert)
CREATE POLICY "Users can vouch for sellers"
  ON public.seller_vouches FOR INSERT
  TO authenticated
  WITH CHECK (voucher_id = auth.uid());

-- Function: auto-verify seller when they reach 10 vouches
CREATE OR REPLACE FUNCTION public.auto_verify_seller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.seller_vouches WHERE seller_id = NEW.seller_id) >= 10 THEN
    UPDATE public.profiles SET is_verified = true WHERE user_id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vouch_check_verify
  AFTER INSERT ON public.seller_vouches
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_seller();

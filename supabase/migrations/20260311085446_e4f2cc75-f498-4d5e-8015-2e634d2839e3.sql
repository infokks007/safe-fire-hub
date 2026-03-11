
-- Create auctions table
CREATE TABLE public.auctions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  freefire_uid text,
  level integer,
  rank text,
  region text,
  elite_pass boolean DEFAULT false,
  characters text[] DEFAULT '{}'::text[],
  gun_skins text[] DEFAULT '{}'::text[],
  evo_guns text[] DEFAULT '{}'::text[],
  bundles text[] DEFAULT '{}'::text[],
  images text[] DEFAULT '{}'::text[],
  starting_price numeric NOT NULL,
  current_price numeric NOT NULL,
  highest_bidder_id uuid,
  duration_minutes integer NOT NULL DEFAULT 30,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create auction_bids table
CREATE TABLE public.auction_bids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Enable realtime for live bidding
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;

-- Auctions RLS policies
CREATE POLICY "Anyone can view active auctions"
ON public.auctions FOR SELECT
USING (status = 'active' OR status = 'completed' OR seller_id = auth.uid());

CREATE POLICY "Sellers can create auctions"
ON public.auctions FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid() AND has_role(auth.uid(), 'seller'::app_role));

CREATE POLICY "Sellers can update own auctions"
ON public.auctions FOR UPDATE
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY "Admins can manage all auctions"
ON public.auctions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auction bids RLS policies
CREATE POLICY "Anyone can view bids"
ON public.auction_bids FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can place bids"
ON public.auction_bids FOR INSERT
TO authenticated
WITH CHECK (bidder_id = auth.uid());

-- Function to place a bid atomically
CREATE OR REPLACE FUNCTION public.place_bid(_auction_id uuid, _bidder_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_wallet wallets%ROWTYPE;
BEGIN
  -- Lock auction
  SELECT * INTO v_auction FROM auctions WHERE id = _auction_id FOR UPDATE;
  
  IF v_auction IS NULL THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;
  IF v_auction.status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;
  IF v_auction.ends_at < now() THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;
  IF v_auction.seller_id = _bidder_id THEN
    RAISE EXCEPTION 'Cannot bid on your own auction';
  END IF;
  IF _amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'Bid must be higher than current price';
  END IF;
  
  -- Check bidder wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = _bidder_id FOR UPDATE;
  IF v_wallet IS NULL OR v_wallet.balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Refund previous highest bidder if exists
  IF v_auction.highest_bidder_id IS NOT NULL THEN
    UPDATE wallets SET balance = balance + v_auction.current_price
    WHERE user_id = v_auction.highest_bidder_id;
  END IF;
  
  -- Deduct from new bidder
  UPDATE wallets SET balance = balance - _amount WHERE user_id = _bidder_id;
  
  -- Record bid
  INSERT INTO auction_bids (auction_id, bidder_id, amount) VALUES (_auction_id, _bidder_id, _amount);
  
  -- Update auction
  UPDATE auctions SET current_price = _amount, highest_bidder_id = _bidder_id, updated_at = now()
  WHERE id = _auction_id;
  
  -- Notify seller
  PERFORM create_notification(
    v_auction.seller_id, 'auction_bid', 'New Bid! 🔥',
    'Someone bid ₹' || _amount::text || ' on "' || v_auction.title || '"',
    _auction_id::text
  );
END;
$$;

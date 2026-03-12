
CREATE OR REPLACE FUNCTION public.finalize_auction(_auction_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_order_id uuid;
  v_listing_id uuid;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = _auction_id FOR UPDATE;
  
  IF v_auction IS NULL THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;
  IF v_auction.status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;
  IF v_auction.ends_at > now() THEN
    RAISE EXCEPTION 'Auction has not ended yet';
  END IF;
  IF v_auction.highest_bidder_id IS NULL THEN
    UPDATE auctions SET status = 'completed', updated_at = now() WHERE id = _auction_id;
    RETURN NULL;
  END IF;

  UPDATE wallets
  SET escrow_balance = escrow_balance + v_auction.current_price
  WHERE user_id = v_auction.highest_bidder_id;

  INSERT INTO listings (seller_id, title, description, price, freefire_uid, level, rank, region, elite_pass, characters, gun_skins, evo_guns, bundles, images, status)
  VALUES (
    v_auction.seller_id,
    v_auction.title,
    v_auction.description,
    v_auction.current_price,
    v_auction.freefire_uid,
    v_auction.level,
    v_auction.rank,
    v_auction.region,
    v_auction.elite_pass,
    v_auction.characters,
    v_auction.gun_skins,
    v_auction.evo_guns,
    v_auction.bundles,
    v_auction.images,
    'pending'
  )
  RETURNING id INTO v_listing_id;

  INSERT INTO orders (listing_id, buyer_id, seller_id, amount, platform_fee, status)
  VALUES (v_listing_id, v_auction.highest_bidder_id, v_auction.seller_id, v_auction.current_price, 0, 'escrow')
  RETURNING id INTO v_order_id;

  UPDATE auctions SET status = 'completed', updated_at = now() WHERE id = _auction_id;

  PERFORM create_notification(
    v_auction.seller_id, 'order_update', 'Auction Won! 🎉',
    'Your auction "' || v_auction.title || '" was won for ₹' || v_auction.current_price::text || '. Please submit account credentials.',
    v_order_id::text
  );

  PERFORM create_notification(
    v_auction.highest_bidder_id, 'order_update', 'You Won the Auction! 🏆',
    'You won "' || v_auction.title || '" for ₹' || v_auction.current_price::text || '. The seller will submit credentials shortly.',
    v_order_id::text
  );

  RETURN v_order_id;
END;
$$;

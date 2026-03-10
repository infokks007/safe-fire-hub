
-- Fix 1: Drop RESTRICTIVE policies on listings and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Sellers can insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Admins can manage all listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can delete own listings" ON public.listings;

CREATE POLICY "Active listings are viewable by everyone" ON public.listings
  FOR SELECT TO public USING ((status = 'active') OR (seller_id = auth.uid()));

CREATE POLICY "Sellers can insert own listings" ON public.listings
  FOR INSERT TO public WITH CHECK ((seller_id = auth.uid()) AND has_role(auth.uid(), 'seller'::app_role));

CREATE POLICY "Sellers can update own listings" ON public.listings
  FOR UPDATE TO public USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can delete own listings" ON public.listings
  FOR DELETE TO public USING (seller_id = auth.uid());

CREATE POLICY "Admins can manage all listings" ON public.listings
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Drop RESTRICTIVE policies on orders and recreate as PERMISSIVE + add seller UPDATE
DROP POLICY IF EXISTS "Buyers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update own orders" ON public.orders;

CREATE POLICY "Buyers can view own orders" ON public.orders
  FOR SELECT TO public USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view own orders" ON public.orders
  FOR SELECT TO public USING (seller_id = auth.uid());

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers can create orders" ON public.orders
  FOR INSERT TO public WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyers can update own orders" ON public.orders
  FOR UPDATE TO public USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can update own orders" ON public.orders
  FOR UPDATE TO public USING (seller_id = auth.uid());

-- Fix 3: Drop RESTRICTIVE wallet policies and recreate as PERMISSIVE + add user UPDATE
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "System can insert wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON public.wallets;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own wallet" ON public.wallets
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 4: Also fix wallet_transactions, conversations, etc. that are RESTRICTIVE
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can create deposit requests" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.wallet_transactions;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create deposit requests" ON public.wallet_transactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update transactions" ON public.wallet_transactions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 5: Create atomic purchase function
CREATE OR REPLACE FUNCTION public.purchase_listing(_buyer_id uuid, _listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing listings%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_order_id uuid;
BEGIN
  -- Lock and get listing
  SELECT * INTO v_listing FROM listings WHERE id = _listing_id FOR UPDATE;
  IF v_listing IS NULL OR v_listing.status != 'active' THEN
    RAISE EXCEPTION 'Listing not available';
  END IF;
  IF v_listing.seller_id = _buyer_id THEN
    RAISE EXCEPTION 'Cannot buy your own listing';
  END IF;

  -- Lock and get buyer wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = _buyer_id FOR UPDATE;
  IF v_wallet IS NULL OR v_wallet.balance < v_listing.price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from buyer wallet
  UPDATE wallets
  SET balance = balance - v_listing.price,
      escrow_balance = escrow_balance + v_listing.price
  WHERE user_id = _buyer_id;

  -- Create order
  INSERT INTO orders (listing_id, buyer_id, seller_id, amount, platform_fee, status)
  VALUES (_listing_id, _buyer_id, v_listing.seller_id, v_listing.price, 0, 'escrow')
  RETURNING id INTO v_order_id;

  -- Update listing status
  UPDATE listings SET status = 'pending' WHERE id = _listing_id;

  -- Notify seller
  PERFORM create_notification(
    v_listing.seller_id,
    'order_update',
    'New Order! 🎉',
    'Someone purchased "' || v_listing.title || '" for ₹' || v_listing.price::text || '. Please submit account credentials.',
    v_order_id::text
  );

  RETURN v_order_id;
END;
$$;

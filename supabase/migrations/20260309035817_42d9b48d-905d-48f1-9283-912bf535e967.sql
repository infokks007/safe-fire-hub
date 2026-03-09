
-- ===========================================
-- 1. ORDERS TABLE (Escrow Payment System)
-- ===========================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'escrow', -- escrow, delivered, released, cancelled, disputed
  buyer_confirmed BOOLEAN NOT NULL DEFAULT false,
  admin_released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Sellers can view own orders" ON public.orders FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Buyers can update own orders" ON public.orders FOR UPDATE USING (buyer_id = auth.uid());

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 2. BAN/VERIFY: Add is_banned to profiles
-- ===========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Allow admins to update any profile (for ban/verify)
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- ===========================================
-- 3. NOTIFICATIONS TABLE
-- ===========================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- order_update, deposit_approved, deposit_rejected, dispute_update, new_message, system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT, -- links to order/transaction/dispute id
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ===========================================
-- 4. Helper function: create notification
-- ===========================================
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _reference_id TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, reference_id)
  VALUES (_user_id, _type, _title, _message, _reference_id);
END;
$$;

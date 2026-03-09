
-- Wallet system
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  escrow_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert wallets" ON public.wallets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update wallets" ON public.wallets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'purchase', 'sale'
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
  upi_transaction_id text,
  admin_notes text,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create deposit requests" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update transactions" ON public.wallet_transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Disputes / Buyer Protection
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL, -- 'wrong_details', 'account_recovered', 'login_failure', 'other'
  description text,
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'dismissed'
  admin_notes text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disputes" ON public.disputes FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admins can view all disputes" ON public.disputes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- News articles
CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'news', -- 'patch', 'skins', 'events', 'tournaments', 'guides'
  cover_image text,
  author_id uuid,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles" ON public.news_articles FOR SELECT USING (published = true);
CREATE POLICY "Admins can view all articles" ON public.news_articles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert articles" ON public.news_articles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update articles" ON public.news_articles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete articles" ON public.news_articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Featured listing requests
CREATE TABLE public.featured_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid NOT NULL,
  duration text NOT NULL DEFAULT '24h', -- '24h', '3d', '7d'
  fee numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired', 'rejected'
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own featured requests" ON public.featured_requests FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Admins can view all featured requests" ON public.featured_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers can create featured requests" ON public.featured_requests FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Admins can update featured requests" ON public.featured_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create wallet trigger
CREATE OR REPLACE FUNCTION public.auto_create_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_wallet();

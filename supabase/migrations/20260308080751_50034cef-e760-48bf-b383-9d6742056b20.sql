
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- LISTINGS
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Admins can manage all listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can delete own listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can update own listings" ON public.listings;

CREATE POLICY "Active listings are viewable by everyone" ON public.listings FOR SELECT USING ((status = 'active') OR (seller_id = auth.uid()));
CREATE POLICY "Admins can manage all listings" ON public.listings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Sellers can delete own listings" ON public.listings FOR DELETE USING (seller_id = auth.uid());
CREATE POLICY "Sellers can insert own listings" ON public.listings FOR INSERT WITH CHECK ((seller_id = auth.uid()) AND has_role(auth.uid(), 'seller'::app_role));
CREATE POLICY "Sellers can update own listings" ON public.listings FOR UPDATE USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

-- CONVERSATIONS
DROP POLICY IF EXISTS "Buyers can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING ((buyer_id = auth.uid()) OR (seller_id = auth.uid()));

-- MESSAGES
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;

CREATE POLICY "Conversation participants can send messages" ON public.messages FOR INSERT WITH CHECK ((sender_id = auth.uid()) AND (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))));
CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));

-- PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

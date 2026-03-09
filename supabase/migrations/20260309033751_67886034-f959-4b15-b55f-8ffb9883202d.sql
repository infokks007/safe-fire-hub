
-- Tighten the insert policy on flagged_listings to only allow authenticated users who are admins or the system
DROP POLICY "System can insert flags" ON public.flagged_listings;
CREATE POLICY "Authenticated can insert flags" ON public.flagged_listings FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'buyer')
);

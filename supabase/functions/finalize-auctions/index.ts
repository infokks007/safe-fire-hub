import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find all active auctions that have ended
  const { data: auctions, error } = await supabase
    .from("auctions")
    .select("id")
    .eq("status", "active")
    .lte("ends_at", new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let finalized = 0;
  const errors: string[] = [];

  for (const auction of auctions || []) {
    const { error: fnError } = await supabase.rpc("finalize_auction", {
      _auction_id: auction.id,
    });
    if (fnError) {
      errors.push(`${auction.id}: ${fnError.message}`);
    } else {
      finalized++;
    }
  }

  return new Response(JSON.stringify({ finalized, errors }), { status: 200 });
});

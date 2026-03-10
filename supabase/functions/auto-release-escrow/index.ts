import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find orders where buyer confirmed login > 48 hours ago and not yet released
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, seller_id, buyer_id, amount, platform_fee, listing_id")
    .eq("status", "delivered")
    .eq("buyer_confirmed", true)
    .eq("admin_released", false)
    .lte("buyer_login_confirmed_at", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let released = 0;

  for (const order of orders || []) {
    // Update order to released
    await supabase
      .from("orders")
      .update({
        status: "released",
        admin_released: true,
        released_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Credit seller wallet
    const { data: sellerWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", order.seller_id)
      .single();

    if (sellerWallet) {
      const payout = Number(order.amount) - Number(order.platform_fee || 0);
      await supabase
        .from("wallets")
        .update({ balance: Number(sellerWallet.balance) + payout })
        .eq("user_id", order.seller_id);
    }

    // Deduct buyer escrow
    const { data: buyerWallet } = await supabase
      .from("wallets")
      .select("escrow_balance")
      .eq("user_id", order.buyer_id)
      .single();

    if (buyerWallet) {
      await supabase
        .from("wallets")
        .update({
          escrow_balance: Math.max(0, Number(buyerWallet.escrow_balance) - Number(order.amount)),
        })
        .eq("user_id", order.buyer_id);
    }

    // Update listing
    await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", order.listing_id);

    // Notify both
    await supabase.rpc("create_notification", {
      _user_id: order.seller_id,
      _type: "payment",
      _title: "Payment Auto-Released! 💰",
      _message: `₹${(Number(order.amount) - Number(order.platform_fee || 0)).toFixed(2)} has been automatically credited to your wallet after the 2-day hold.`,
      _reference_id: order.id,
    });

    await supabase.rpc("create_notification", {
      _user_id: order.buyer_id,
      _type: "order_update",
      _title: "Order Complete ✅",
      _message: "Your order has been automatically completed after the 2-day hold period.",
      _reference_id: order.id,
    });

    released++;
  }

  return new Response(JSON.stringify({ released }), { status: 200 });
});

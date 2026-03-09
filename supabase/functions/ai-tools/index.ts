import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "estimate_price") {
      systemPrompt = `You are a FreeFire account pricing expert. Based on the account details provided, estimate a fair market price range. Consider: account level, rank, rare skins, evo guns, bundles, characters, and elite pass status. Return ONLY a JSON object with: { "min_price": number, "max_price": number, "confidence": number (0-1), "reasoning": string }`;
      userPrompt = `Estimate the price for this FreeFire account:\n${JSON.stringify(payload, null, 2)}`;
    } else if (action === "generate_description") {
      systemPrompt = `You are a FreeFire marketplace copywriter. Generate a compelling listing description based on the account details. Include key selling points, highlight rare items, and make it attractive to buyers. Return ONLY a JSON object with: { "description": string, "features": string[], "selling_points": string[] }`;
      userPrompt = `Generate a listing description for:\n${JSON.stringify(payload, null, 2)}`;
    } else if (action === "detect_scam") {
      systemPrompt = `You are a fraud detection system for a FreeFire account marketplace. Analyze the listing details and flag potential scams. Consider: unrealistic prices, suspicious patterns, duplicate content. Return ONLY a JSON object with: { "is_suspicious": boolean, "confidence": number (0-1), "reasons": string[] }`;
      userPrompt = `Analyze this listing for potential fraud:\n${JSON.stringify(payload, null, 2)}`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse AI response" };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tools error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

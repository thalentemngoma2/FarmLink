import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TREFLE_API_KEY = Deno.env.get("TREFLE_API_KEY") || "";
const TREFLE_BASE = "https://trefle.io/api/v1";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "search" or "detail"
  const query = url.searchParams.get("q");   // plant name
  const slug = url.searchParams.get("slug"); // plant slug

  if (!TREFLE_API_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  let targetUrl = "";
  if (type === "search" && query) {
    targetUrl = `${TREFLE_BASE}/plants/search?token=${TREFLE_API_KEY}&q=${encodeURIComponent(query)}`;
  } else if (type === "detail" && slug) {
    targetUrl = `${TREFLE_BASE}/plants/${slug}?token=${TREFLE_API_KEY}`;
  } else {
    return new Response(JSON.stringify({ error: "Invalid parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Trefle API error" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
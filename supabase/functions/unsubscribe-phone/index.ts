import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("unsubscribe-phone is missing required Supabase secrets.");
    return jsonResponse({ error: "SMS service is not configured on the server." }, 503);
  }

  let body: { phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const phone = typeof body.phone === "number" ? body.phone : Number(body.phone);
  const phoneDigits = String(phone);
  if (!Number.isSafeInteger(phone) || phone <= 0 || !/^\d{6,15}$/.test(phoneDigits)) {
    return jsonResponse({ error: "Enter a valid phone number." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient
    .from("phones")
    .update({ active: false })
    .eq("phone", phone)
    .eq("active", true)
    .select("phone")
    .maybeSingle();

  if (error) {
    console.error("Could not deactivate phone number:", error.message);
    return jsonResponse({ error: "Could not process the unsubscribe request." }, 502);
  }

  return jsonResponse({ unsubscribed: Boolean(data) });
});
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminUserIds = (Deno.env.get("SMS_ADMIN_USER_IDS") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const smsUsername = Deno.env.get("SMSGATE_USERNAME");
  const smsPassword = Deno.env.get("SMSGATE_PASSWORD");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !adminUserIds.length || !smsUsername || !smsPassword) {
    console.error("send-verse is missing one or more required secrets.");
    return jsonResponse({ error: "SMS delivery is not configured on the server." }, 503);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser(accessToken);
  if (userError || !userData.user || !adminUserIds.includes(userData.user.id)) {
    return jsonResponse({ error: "Only configured admin users may send verse SMS." }, 403);
  }

  let body: { verseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const verseId = String(body.verseId || "").trim();
  if (!verseId) {
    return jsonResponse({ error: "A verse ID is required." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verse, error: verseError } = await adminClient
    .from("stihovi")
    .select("text")
    .eq("id", verseId)
    .maybeSingle();

  if (verseError) {
    console.error("Could not retrieve verse text:", verseError.message);
    return jsonResponse({ error: "Could not retrieve the verse text." }, 502);
  }
  if (!verse || typeof verse.text !== "string" || !verse.text.trim() || verse.text.length > 65535) {
    return jsonResponse({ error: "The verse was not found or its text is invalid." }, 404);
  }
  const text = verse.text.trim();

  const activePhones: string[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await adminClient
      .from("phones")
      .select("phone")
      .eq("active", true)
      .order("phone", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Could not retrieve active phones:", error.message);
      return jsonResponse({ error: "Could not retrieve active subscriber numbers." }, 502);
    }

    for (const row of data || []) {
      const digits = String(row.phone ?? "").replace(/\D/g, "");
      if (digits) activePhones.push(`+${digits}`);
    }
    if (!data || data.length < pageSize) break;
  }

  if (!activePhones.length) {
    return jsonResponse({ sentTo: 0, message: "No active phone numbers." });
  }

  const credentialBytes = new TextEncoder().encode(`${smsUsername}:${smsPassword}`);
  const basicToken = btoa(String.fromCharCode(...credentialBytes));
  let sentTo = 0;

  for (let offset = 0; offset < activePhones.length; offset += 100) {
    const phoneNumbers = activePhones.slice(offset, offset + 100);
    let response: Response;

    try {
      response = await fetch("https://api.sms-gate.app/3rdparty/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          textMessage: { text },
          phoneNumbers,
          ttl: 86400,
        }),
      });
    } catch (error) {
      console.error("SMSGate API request failed:", error);
      return jsonResponse({ error: "Could not connect to SMS Gate.", sentTo }, 502);
    }

    if (response.status === 409) {
      const details = await response.text();
      console.error("SMSGate reported a message ID conflict:", details);
      return jsonResponse({ error: "SMS Gate reported a message ID conflict.", sentTo }, 502);
    }
    if (!response.ok) {
      const details = await response.text();
      console.error(`SMSGate rejected a message batch (${response.status}):`, details);
      return jsonResponse({ error: `SMS Gate rejected the message (HTTP ${response.status}).`, sentTo }, 502);
    }
    sentTo += phoneNumbers.length;
  }

  return jsonResponse({ sentTo });
});

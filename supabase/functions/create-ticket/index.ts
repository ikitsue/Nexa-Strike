import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getDefaultKey = (keysVariable: string, legacyVariable: string) => {
  const keys = Deno.env.get(keysVariable);
  if (keys) {
    try {
      const parsedKeys = JSON.parse(keys);
      if (typeof parsedKeys.default === "string") return parsedKeys.default;
    } catch (error) {
      console.error(`Could not parse ${keysVariable}:`, error);
    }
  }
  return Deno.env.get(legacyVariable);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const reporterName = typeof payload.reporterName === "string"
    ? payload.reporterName.trim()
    : "";
  const reporterEmail = typeof payload.reporterEmail === "string"
    ? payload.reporterEmail.trim().toLowerCase()
    : "";
  const category = payload.category;
  const priority = payload.priority;
  const captchaToken = typeof payload.captchaToken === "string"
    ? payload.captchaToken
    : "";

  if (
    !title || title.length > 120 ||
    !message || message.length > 5000 ||
    reporterName.length > 80 ||
    reporterEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail) ||
    !["bug", "feature", "account", "other"].includes(String(category)) ||
    !["normal", "high", "urgent"].includes(String(priority)) ||
    !captchaToken
  ) {
    return jsonResponse({ error: "Please check the ticket fields and complete the CAPTCHA." }, 400);
  }

  const hcaptchaSecret = Deno.env.get("HCAPTCHA_SECRET");
  if (!hcaptchaSecret) {
    console.error("HCAPTCHA_SECRET is not configured");
    return jsonResponse({ error: "Ticket submission is not configured. Please contact support." }, 503);
  }

  const captchaBody = new FormData();
  captchaBody.set("secret", hcaptchaSecret);
  captchaBody.set("response", captchaToken);
  captchaBody.set("sitekey", "f0d01e14-76a0-4cee-be80-171ae994962c");

  let captchaResult: { success?: boolean; "error-codes"?: string[] };
  try {
    const captchaResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      body: captchaBody,
    });
    if (!captchaResponse.ok) {
      console.error("hCaptcha verification returned HTTP", captchaResponse.status);
      return jsonResponse({ error: "CAPTCHA verification is temporarily unavailable." }, 502);
    }
    captchaResult = await captchaResponse.json();
  } catch (error) {
    console.error("Could not verify hCaptcha:", error);
    return jsonResponse({ error: "CAPTCHA verification is temporarily unavailable." }, 502);
  }

  const captchaErrors = captchaResult["error-codes"] || [];
  if (
    captchaErrors.includes("missing-input-secret") ||
    captchaErrors.includes("invalid-input-secret") ||
    captchaErrors.includes("sitekey-secret-mismatch")
  ) {
    console.error("hCaptcha rejected the configured secret or sitekey");
    return jsonResponse({ error: "CAPTCHA verification is not configured correctly." }, 503);
  }

  if (captchaResult.success !== true) {
    return jsonResponse({ error: "CAPTCHA verification failed. Please try again." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("Supabase Edge Function API keys are not configured");
    return jsonResponse({ error: "Ticket submission is not configured. Please contact support." }, 503);
  }

  let ownerId: string | null = null;
  let finalReporterEmail = reporterEmail;
  const authorization = request.headers.get("Authorization");
  const bearerCredential = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = request.headers.get("apikey");
  if (authorization && bearerCredential !== apiKey) {
    const accessToken = bearerCredential;
    if (!accessToken) {
      return jsonResponse({ error: "Invalid authentication token." }, 401);
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await userClient.auth.getUser(accessToken);
    if (error || !data.user?.email) {
      return jsonResponse({ error: "Your session is invalid. Please sign in again." }, 401);
    }

    ownerId = data.user.id;
    finalReporterEmail = data.user.email.toLowerCase();
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await adminClient
    .from("tickets")
    .insert({
      owner_id: ownerId,
      reporter_name: reporterName || null,
      reporter_email: finalReporterEmail,
      title,
      message,
      category,
      priority,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Could not create support ticket:", error);
    return jsonResponse({ error: "The ticket could not be saved. Please try again." }, 500);
  }

  return jsonResponse({ id: data.id });
});

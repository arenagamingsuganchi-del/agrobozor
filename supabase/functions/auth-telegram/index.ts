import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json();
    if (!initData) {
      return new Response(JSON.stringify({ error: 'Missing initData parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is not configured in Supabase. Running in mock validation mode.');
      // Mock validation mode if token is not configured (allows testing locally)
      return new Response(JSON.stringify({ success: true, mock: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Parse parameters
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return new Response(JSON.stringify({ error: 'Missing hash inside initData' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Sort parameters and construct data check string
    const keys = Array.from(params.keys()).filter((key) => key !== 'hash').sort();
    const dataCheckString = keys.map((key) => `${key}=${params.get(key)}`).join('\n');

    // 3. Cryptographic validation using Web Crypto API
    const encoder = new TextEncoder();
    
    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuf = await crypto.subtle.sign(
      "HMAC",
      baseKey,
      encoder.encode(botToken)
    );

    // calculated_hash = HMAC-SHA256(dataCheckString, secret_key)
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const calculatedHashBuf = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      encoder.encode(dataCheckString)
    );

    // Convert hash buffer to hex string
    const calculatedHash = Array.from(new Uint8Array(calculatedHashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash !== hash) {
      return new Response(JSON.stringify({ error: 'Telegram signature validation failed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Successful validation!
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

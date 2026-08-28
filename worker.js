const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "SastiMart MSG91 OTP Worker" });
    }

    if (
      url.pathname === "/api/msg91/verify-access-token" &&
      request.method === "POST"
    ) {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ success: false, message: "Invalid JSON" }, 400);
      }

      const accessToken = String(body?.accessToken || "").trim();

      if (!accessToken) {
        return json(
          { success: false, message: "Missing access token" },
          400
        );
      }

      if (!env.MSG91_AUTHKEY) {
        return json(
          {
            success: false,
            message: "MSG91_AUTHKEY secret is not configured",
          },
          500
        );
      }

      const upstream = await fetch(
        "https://control.msg91.com/api/v5/widget/verifyAccessToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            authkey: env.MSG91_AUTHKEY,
            "access-token": accessToken,
          }),
        }
      );

      const text = await upstream.text();

      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }

      if (!upstream.ok) {
        return json(
          {
            success: false,
            message: "MSG91 access-token verification failed",
            provider: payload,
          },
          upstream.status
        );
      }

      return json({ success: true, provider: payload });
    }

    return env.ASSETS.fetch(request);
  },
};

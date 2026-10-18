/**
 * MTI custom-domain gateway for greatchurch.ca.
 * Deployed to the GlobalConnectionsChurch Cloudflare account.
 * The private MTI API, accounts, D1 data, and R2 submissions remain in
 * the rwyers account; this Worker forwards HTTPS traffic securely.
 *
 * The upstream Worker requires JSON POST Origin to match its own hostname.
 * This gateway verifies the original browser Origin against the public MTI
 * hostname first, before rewriting it for the upstream. Never forward a
 * third-party Origin as if it were trusted.
 */
const PUBLIC_HOST = "mti.greatchurch.ca";
const PUBLIC_ORIGIN = "https://" + PUBLIC_HOST;
const BACKEND_ORIGIN = "https://mti-portal.rwyers.workers.dev";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default {
  async fetch(request) {
    const originalUrl = new URL(request.url);
    if (originalUrl.hostname !== PUBLIC_HOST) {
      return new Response("Not found", { status: 404 });
    }
    if (originalUrl.protocol !== "https:") {
      const secureUrl = new URL(request.url);
      secureUrl.protocol = "https:";
      return Response.redirect(secureUrl.toString(), 308);
    }
    if (UNSAFE_METHODS.has(request.method)) {
      const browserOrigin = request.headers.get("Origin");
      if (browserOrigin !== PUBLIC_ORIGIN) {
        return new Response("Invalid request origin", {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
    }

    const backendUrl = new URL(originalUrl.pathname + originalUrl.search, BACKEND_ORIGIN);
    const headers = new Headers(request.headers);

    // Prevent the browser from supplying trust or host metadata to the app.
    for (const key of [
      "Host", "CF-Connecting-IP", "X-Forwarded-Host", "X-Forwarded-Proto",
      "X-Real-IP", "X-MTI-Original-Origin",
    ]) {
      headers.delete(key);
    }

    // The MTI Worker rejects unsafe requests whose Origin differs from the
    // upstream hostname. This rewrite is safe because we checked it above.
    if (UNSAFE_METHODS.has(request.method)) {
      headers.set("Origin", BACKEND_ORIGIN);
    }

    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    try {
      const upstream = await fetch(new Request(backendUrl.toString(), init));
      const responseHeaders = new Headers(upstream.headers);
      // Keep login and authenticated responses out of intermediary caches.
      responseHeaders.set("Cache-Control", "no-store");

      const location = responseHeaders.get("Location");
      if (location) {
        const target = new URL(location, backendUrl);
        if (target.origin === BACKEND_ORIGIN) {
          const publicRedirect = new URL(target.pathname + target.search + target.hash, PUBLIC_ORIGIN);
          responseHeaders.set("Location", publicRedirect.toString());
        }
      }

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("MTI domain gateway failure:", error?.message);
      return new Response("MTI is temporarily unavailable. Please try again shortly.", {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  },
};

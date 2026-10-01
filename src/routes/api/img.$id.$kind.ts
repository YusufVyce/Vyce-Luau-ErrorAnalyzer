import { createFileRoute } from "@tanstack/react-router";
import { accountService } from "@/lib/account/server/instance";

/**
 * Profile photos and banners. Every upload gets a new ?v= version, so a
 * versioned URL never changes and browsers and the CDN can keep it for a year.
 */
export const Route = createFileRoute("/api/img/$id/$kind")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const svc = accountService();
        const img = svc ? await svc.image(params.id, params.kind).catch(() => null) : null;
        if (!img) {
          return new Response("Not found", {
            status: 404,
            headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain" },
          });
        }
        const versioned = new URL(request.url).searchParams.has("v");
        return new Response(img.bytes, {
          headers: {
            "Content-Type": img.type,
            "Content-Length": String(img.bytes.length),
            "Cache-Control": versioned
              ? "public, max-age=31536000, immutable"
              : "public, max-age=300",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      },
    },
  },
});

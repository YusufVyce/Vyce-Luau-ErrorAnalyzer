import { createFileRoute } from "@tanstack/react-router";
import { forumService } from "@/lib/account/server/instance";

/** Forum pictures (an id never gets new content). */
export const Route = createFileRoute("/api/fimg/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const forum = forumService();
        const img = forum ? await forum.image(params.id).catch(() => null) : null;
        if (!img) {
          return new Response("Not found", {
            status: 404,
            headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain" },
          });
        }
        return new Response(img.bytes, {
          headers: {
            "Content-Type": img.type,
            "Content-Length": String(img.bytes.length),
            // A day: a picture a moderator deleted shouldn't stay in caches for long.
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
          },
        });
      },
    },
  },
});

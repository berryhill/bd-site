import type { APIRoute } from "astro";
import { requireApiKey } from "@/utils/apiAuth";
import { submitSitemapToGoogleSearchConsole } from "@/utils/googleSearchConsole";

export const prerender = false;

/** Re-notify the canonical sitemap from the deployed server, without a post write. */
export const POST: APIRoute = async context => {
  const authError = requireApiKey(context);
  if (authError) {
    authError.headers.set("Cache-Control", "no-store");
    return authError;
  }

  const respond = (body: object, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });

  // No caller-controlled property, URL or credentials; reject accidental input.
  if (
    context.url.search ||
    Number(context.request.headers.get("content-length")) > 0 ||
    context.request.headers.has("transfer-encoding")
  ) {
    return respond({ ok: false, reason: "unexpected_input" }, 400);
  }

  const result = await submitSitemapToGoogleSearchConsole();
  return respond(result, result.ok ? 200 : result.skipped ? 503 : 502);
};

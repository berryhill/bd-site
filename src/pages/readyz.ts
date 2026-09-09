import type { APIRoute } from "astro";
import { getContentReadiness } from "@/content/runtimeReadiness";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const storage = await getContentReadiness();
    return new Response(
      JSON.stringify({ status: "ready", storage: { ...storage, ready: true } }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ status: "unavailable", storage: { ready: false } }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Retry-After": "30",
        },
      }
    );
  }
};

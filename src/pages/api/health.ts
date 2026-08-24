import type { APIRoute } from "astro";
import {
  getBlogStore,
  getBlogStoreDiagnostics,
} from "@/content/blogStoreFactory";
import { BlogStoreUnavailableError } from "@/content/blogStore";
import { requireApiKey } from "@/utils/apiAuth";

export const GET: APIRoute = async context => {
  const authError = requireApiKey(context);
  if (authError) return authError;

  const storage = getBlogStoreDiagnostics();
  try {
    await getBlogStore().ready();
    return new Response(
      JSON.stringify({
        status: "healthy",
        message: "API is operational",
        storage: { ...storage, ready: true },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (!(error instanceof BlogStoreUnavailableError)) throw error;
    return new Response(
      JSON.stringify({
        status: "unavailable",
        message: "Blog storage is unavailable",
        storage: { ...storage, ready: false },
      }),
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

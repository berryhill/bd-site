import type { APIRoute } from "astro";
import { requireApiKey } from "@/utils/apiAuth";

export const GET: APIRoute = (context) => {
  // Validate API key using the shared utility
  const authError = requireApiKey(context);
  if (authError) return authError;

  // Return success
  return new Response(
    JSON.stringify({ status: "healthy", message: "API is operational" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

import type { APIRoute } from "astro";
import { validateApiKey } from "@/utils/apiAuth";

export const GET: APIRoute = ({ request }) => {
  const isValid = validateApiKey(request);

  if (!isValid) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Invalid or missing API key",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      valid: true,
      message: "API key is valid",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

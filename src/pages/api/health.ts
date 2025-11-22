import type { APIRoute } from "astro";

const VALID_API_KEY = import.meta.env.BLOG_API_KEY;

export const GET: APIRoute = ({ request }) => {
  // Extract API key from header
  const apiKey = request.headers.get("x-api-key");

  // Validate API key
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (apiKey !== VALID_API_KEY) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Return success
  return new Response(
    JSON.stringify({ status: "healthy", message: "API is operational" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};

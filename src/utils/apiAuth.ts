import type { APIContext } from "astro";
import { X_API_KEY } from "astro:env/server";

/**
 * Validates the API key from the request headers
 * Checks for x-api-key header and compares with the configured API key
 */
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return false;
  }

  return apiKey === X_API_KEY;
}

/**
 * Middleware helper that returns a 401 Unauthorized response
 * if the API key is invalid
 */
export function requireApiKey(context: APIContext): Response | null {
  if (!validateApiKey(context.request)) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Valid x-api-key header is required",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}

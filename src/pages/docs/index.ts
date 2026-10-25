import type { APIRoute } from "astro";

export const prerender = false;

const redirectToStart: APIRoute = ({ url }) =>
  new Response(null, {
    status: 308,
    headers: { Location: new URL("/start/", url).href },
  });

export const GET = redirectToStart;
export const HEAD = redirectToStart;

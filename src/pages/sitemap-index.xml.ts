import type { APIRoute } from "astro";

export const prerender = false;

// Redirect old sitemap-index.xml to new sitemap.xml for backwards compatibility
export const GET: APIRoute = ({ redirect }) => {
  return redirect("/sitemap.xml", 301);
};

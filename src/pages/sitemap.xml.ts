import type { APIRoute } from "astro";
import { SITE } from "@/config";

export const prerender = false;

export const GET: APIRoute = async () => {
  // List of static pages to include
  const staticPages = [
    "",
    "about",
    "posts",
    "tags",
    "search",
    ...(SITE.showArchives ? ["archives"] : []),
  ];

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE.website}sitemap-static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE.website}sitemap-posts.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(sitemapIndex, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

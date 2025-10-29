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

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(page => {
    const url = page ? `${SITE.website}${page}/` : SITE.website;
    return `  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === "" ? "1.0" : "0.9"}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

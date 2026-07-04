import type { APIRoute } from "astro";
import { SITE } from "@/config";
import { buildStaticSitemapXml } from "@/utils/staticSitemap";

export const prerender = false;

export const GET: APIRoute = async () => {
  const sitemap = buildStaticSitemapXml({
    site: SITE.website,
    showArchives: SITE.showArchives,
  });

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

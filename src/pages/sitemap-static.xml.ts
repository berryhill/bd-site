import type { APIRoute } from "astro";
import { SITE } from "@/config";
import { buildStaticSitemapResponse } from "@/utils/staticSitemap";

export const prerender = false;

export const GET: APIRoute = async () =>
  buildStaticSitemapResponse({
    site: SITE.website,
    showArchives: SITE.showArchives,
  });

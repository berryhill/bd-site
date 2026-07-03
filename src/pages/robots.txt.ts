import type { APIRoute } from "astro";
import { SITE } from "@/config";
import { getRobotsTxt } from "@/utils/crawlSignals";

export const GET: APIRoute = ({ site }) => {
  return new Response(getRobotsTxt(site?.href ?? SITE.website));
};

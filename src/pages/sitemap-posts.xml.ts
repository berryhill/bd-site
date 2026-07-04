import type { APIRoute } from "astro";
import { getLiveCollection } from "astro:content";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";
import { toPostUrl } from "@/utils/url";
import getSortedPosts from "@/utils/getSortedPosts";

export const prerender = false;

type SitemapDateValue = Date | string | number | null | undefined;

const getValidDate = (value: SitemapDateValue) => {
  if (value === null || value === undefined || value === "") return undefined;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

const getPostDate = (post: { data: Record<string, unknown> }) => {
  return (
    getValidDate(post.data.modDatetime as SitemapDateValue) ??
    getValidDate(post.data.pubDatetime as SitemapDateValue)
  );
};

export const GET: APIRoute = async () => {
  // Get all blog posts from live collection. If the live loader returns an
  // error-shaped response, emit an empty sitemap instead of throwing a 500.
  const liveBlog = await getLiveCollection("liveBlog");
  const allPosts = Array.isArray(liveBlog.entries) ? liveBlog.entries : [];

  const publishedPosts = getSortedPosts(allPosts);

  // Generate XML sitemap for posts
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publishedPosts
  .map(post => {
    const url = toPostUrl(getPath(post.id, post.filePath), SITE.website);
    const lastmod = getPostDate(post)?.toISOString();

    return `  <url>
    <loc>${url}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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

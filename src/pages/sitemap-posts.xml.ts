import type { APIRoute } from "astro";
import { getLiveCollection } from "astro:content";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";

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

  // Filter out drafts and sort by date, putting undated posts last.
  const publishedPosts = allPosts
    .filter(post => !post.data.draft)
    .sort((a, b) => {
      const dateA = getPostDate(a)?.getTime() ?? 0;
      const dateB = getPostDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    });

  // Generate XML sitemap for posts
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publishedPosts
  .map(post => {
    const url = `${SITE.website}${getPath(post.id, post.filePath)}`;
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
